"""Face check-in (Module 3 AI).

* Detection: YuNet, a lightweight CNN face detector that also returns five landmarks
  (eyes, nose tip, mouth corners).
* Recognition: SFace, a CNN trained with a margin-based loss (like ArcFace) that maps an
  aligned face to a 128-dimensional embedding. Two faces belong to the same person when
  the cosine similarity of their embeddings is above a threshold.
* Pose guide (registration): the same five landmarks give the head's yaw (left/right turn)
  and pitch (chin up/down), so each of the four registration poses is only accepted when
  the person really holds it.
* Liveness: a head-turn challenge. When a real head turns, the nose moves sideways
  relative to the eyes (3-D parallax). A flat photograph or screen keeps that ratio
  almost constant even when it is tilted or moved, so it fails the check.

Only embeddings are stored, never the photos.
"""

from __future__ import annotations

import base64
import binascii
import threading
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np

MODEL_DIR = Path(__file__).resolve().parents[1] / "models"
DETECTOR_FILE = MODEL_DIR / "face_detection_yunet_2023mar.onnx"
RECOGNIZER_FILE = MODEL_DIR / "face_recognition_sface_2021dec.onnx"

MATCH_THRESHOLD = 0.40       # OpenCV recommends 0.363 for SFace; a little stricter here
DUPLICATE_THRESHOLD = 0.50   # an enrolment this similar to another person's face is refused
MIN_MARGIN = 0.05            # best match must beat the second-best person by this much
MIN_FACE_PIXELS = 80
MIN_SHARPNESS = 25.0         # variance of the Laplacian over the face crop
YAW_RANGE_REQUIRED = 0.16    # nose shift relative to eye distance across the challenge
MAX_IMAGE_BYTES = 3 * 1024 * 1024

# Registration poses. Yaw and pitch are landmark ratios measured in the face's own frame
# (so a tilted head does not matter); turns are judged against the person's own frontal
# photo because faces differ.
FRONT_MAX_YAW = 0.12         # |yaw| when looking straight at the camera
FRONT_PITCH = (0.35, 0.80)   # nose between eyes and mouth when the head is level
TURN_YAW = 0.15              # yaw change for "turn a little to the left/right" (about 20 degrees)
CHIN_UP_PITCH = 0.07         # pitch drop for "tilt the chin up"
SIDEWAYS_LIMIT = 0.15        # how far the head may turn while tilting the chin up
POSES = ("front", "up", "left", "right")


class FaceError(ValueError):
    """A problem the user can fix (no face, two faces, too dark...)."""


@dataclass
class Face:
    box: tuple[int, int, int, int]
    landmarks: np.ndarray  # 5 x 2: right eye, left eye, nose, right mouth, left mouth
    score: float
    raw: np.ndarray

    @property
    def yaw_ratio(self) -> float:
        right_eye, left_eye, nose = self.landmarks[0], self.landmarks[1], self.landmarks[2]
        eye_mid = (right_eye + left_eye) / 2
        eye_dist = float(np.linalg.norm(left_eye - right_eye)) or 1.0
        return float((nose[0] - eye_mid[0]) / eye_dist)


def head_pose(face: Face) -> tuple[float, float]:
    """(yaw, pitch) of a face from its five landmarks, measured along the eye line.

    yaw   = sideways offset of the nose tip from the middle of the eyes, in eye distances.
            The camera image is not mirrored, so a positive yaw means the person has turned
            to *their* left.
    pitch = how far down the nose sits between the eyes (0) and the mouth (1). Lifting the
            chin makes the nose tip rise towards the eyes, so pitch gets smaller.
    """
    right_eye, left_eye, nose, right_mouth, left_mouth = (p.astype(np.float64) for p in face.landmarks)
    axis = left_eye - right_eye
    eye_dist = float(np.linalg.norm(axis)) or 1.0
    u = axis / eye_dist
    v = np.array([-u[1], u[0]])
    eye_mid = (right_eye + left_eye) / 2
    mouth_mid = (right_mouth + left_mouth) / 2
    yaw = float(np.dot(nose - eye_mid, u) / eye_dist)
    pitch = float(np.dot(nose - eye_mid, v) / (np.dot(mouth_mid - eye_mid, v) or 1.0))
    return round(yaw, 3), round(pitch, 3)


def judge_pose(pose: str, yaw: float, pitch: float, baseline: tuple[float, float] | None) -> tuple[bool, float, str]:
    """Is the head in the requested registration pose? Returns (ok, progress 0..1, hint)."""
    if pose == "front" or baseline is None:
        level = FRONT_PITCH[0] <= pitch <= FRONT_PITCH[1]
        if abs(yaw) <= FRONT_MAX_YAW and level:
            return True, 1.0, "Hold still"
        if abs(yaw) > FRONT_MAX_YAW:
            return False, round(max(0.0, 1 - (abs(yaw) - FRONT_MAX_YAW) / 0.2), 2), "Face the camera straight on"
        return False, 0.5, "Keep your head level and look at the camera"
    base_yaw, base_pitch = baseline
    d_yaw, d_pitch = yaw - base_yaw, pitch - base_pitch
    if pose == "up":
        progress = min(1.0, max(0.0, -d_pitch / CHIN_UP_PITCH))
        if abs(d_yaw) > SIDEWAYS_LIMIT:
            return False, round(progress, 2), "Keep facing the camera while you lift your chin"
        if -d_pitch >= CHIN_UP_PITCH:
            return True, 1.0, "Hold still"
        return False, round(progress, 2), "Lift your chin a little more" if d_pitch < 0 else "Lift your chin up, not down"
    if pose in ("left", "right"):
        sign = 1 if pose == "left" else -1
        turned = sign * d_yaw
        progress = min(1.0, max(0.0, turned / TURN_YAW))
        if turned >= TURN_YAW:
            return True, 1.0, "Hold still"
        if turned < -0.04:
            return False, 0.0, f"Other way: turn to your {pose}"
        return False, round(progress, 2), f"Turn a little more to your {pose}"
    raise ValueError(f"Unknown pose {pose!r}")


class FaceEngine:
    def __init__(self) -> None:
        self._lock = threading.Lock()  # OpenCV DNN objects are not thread-safe
        self.detector = cv2.FaceDetectorYN.create(str(DETECTOR_FILE), "", (320, 320), 0.85, 0.3, 50)
        self.recognizer = cv2.FaceRecognizerSF.create(str(RECOGNIZER_FILE), "")

    # ------------------------------------------------------------ images
    @staticmethod
    def decode(data: str) -> np.ndarray:
        """Decode a base64 image or data URL (as produced by a browser canvas)."""
        if "," in data[:100]:
            data = data.split(",", 1)[1]
        try:
            raw = base64.b64decode(data, validate=False)
        except (binascii.Error, ValueError):
            raise FaceError("The photo could not be read.") from None
        if len(raw) > MAX_IMAGE_BYTES:
            raise FaceError("The photo is too large.")
        img = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)
        if img is None:
            raise FaceError("The photo could not be read.")
        h, w = img.shape[:2]
        scale = 800 / max(h, w)
        if scale < 1:
            img = cv2.resize(img, (int(w * scale), int(h * scale)))
        return img

    # ------------------------------------------------------------ detection
    def detect(self, img: np.ndarray) -> list[Face]:
        h, w = img.shape[:2]
        with self._lock:
            self.detector.setInputSize((w, h))
            _, faces = self.detector.detect(img)
        if faces is None:
            return []
        result = []
        for f in faces:
            x, y, bw, bh = (int(v) for v in f[:4])
            result.append(Face(box=(x, y, bw, bh), landmarks=f[4:14].reshape(5, 2), score=float(f[14]), raw=f))
        return sorted(result, key=lambda face: face.box[2] * face.box[3], reverse=True)

    def single_face(self, img: np.ndarray) -> Face:
        faces = self.detect(img)
        if not faces:
            raise FaceError("No face found. Look straight at the camera in good light.")
        if len(faces) > 1 and faces[1].box[2] * faces[1].box[3] > 0.35 * faces[0].box[2] * faces[0].box[3]:
            raise FaceError("More than one face is in view. Only the person checking in should be in front of the camera.")
        return faces[0]

    @staticmethod
    def quality_problem(img: np.ndarray, face: Face) -> str | None:
        x, y, w, h = face.box
        if min(w, h) < MIN_FACE_PIXELS:
            return "Move closer to the camera."
        crop = img[max(0, y) : y + h, max(0, x) : x + w]
        if crop.size == 0:
            return "Keep your whole face inside the frame."
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        brightness = float(gray.mean())
        if brightness < 45:
            return "The photo is too dark. Face a light source."
        if brightness > 225:
            return "The photo is too bright. Avoid strong light behind or on the face."
        if cv2.Laplacian(gray, cv2.CV_64F).var() < MIN_SHARPNESS:
            return "The photo is blurred. Hold still for a moment."
        return None

    # ------------------------------------------------------------ recognition
    def embed(self, img: np.ndarray, face: Face) -> np.ndarray:
        with self._lock:
            aligned = self.recognizer.alignCrop(img, face.raw)
            feature = self.recognizer.feature(aligned)
        vec = feature.flatten().astype(np.float32)
        return vec / (np.linalg.norm(vec) or 1.0)


def cosine(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b) / ((np.linalg.norm(a) * np.linalg.norm(b)) or 1.0))


def identify(probe: np.ndarray, gallery: dict[object, list[np.ndarray]]) -> tuple[object | None, float, float]:
    """Best-matching person for an embedding: (person or None, best score, runner-up score)."""
    scores = sorted(((max(cosine(probe, e) for e in embs), person) for person, embs in gallery.items() if embs),
                    key=lambda t: t[0], reverse=True)
    if not scores:
        return None, 0.0, 0.0
    best, person = scores[0]
    second = scores[1][0] if len(scores) > 1 else 0.0
    if best >= MATCH_THRESHOLD and best - second >= MIN_MARGIN:
        return person, best, second
    return None, best, second


def liveness(yaw_ratios: list[float]) -> tuple[bool, float]:
    """Head-turn check: the nose must shift sideways relative to the eyes during the challenge."""
    if len(yaw_ratios) < 3:
        return False, 0.0
    spread = max(yaw_ratios) - min(yaw_ratios)
    return spread >= YAW_RANGE_REQUIRED, round(spread, 3)


_engine: FaceEngine | None = None
_engine_lock = threading.Lock()


def get_engine() -> FaceEngine:
    global _engine
    if _engine is None:
        with _engine_lock:
            if _engine is None:
                _engine = FaceEngine()
    return _engine
