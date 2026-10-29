"""Profile photo handling: decode an uploaded image, crop it square and re-encode it.

Re-encoding with OpenCV means only plain pixels are kept: no EXIF (location, camera)
data and nothing hidden in the file survives.
"""

import base64
import re

import cv2
import numpy as np

MAX_UPLOAD_BYTES = 6 * 1024 * 1024
AVATAR_SIZE = 256
_DATA_URL = re.compile(r"^data:image/(png|jpe?g|webp);base64,([A-Za-z0-9+/=\s]+)$")


class ImageError(ValueError):
    pass


def avatar_from_data_url(data_url: str) -> str:
    match = _DATA_URL.match(data_url.strip())
    if not match:
        raise ImageError("Upload a JPEG, PNG or WebP image.")
    try:
        raw = base64.b64decode(match.group(2), validate=False)
    except ValueError:
        raise ImageError("The image could not be read.") from None
    if len(raw) > MAX_UPLOAD_BYTES:
        raise ImageError("The image is too large (maximum 6 MB).")
    image = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise ImageError("The image could not be read.")
    h, w = image.shape[:2]
    if min(h, w) < 64:
        raise ImageError("The image is too small; use one at least 64 pixels wide.")
    side = min(h, w)
    top, left = (h - side) // 2, (w - side) // 2
    square = cv2.resize(image[top : top + side, left : left + side], (AVATAR_SIZE, AVATAR_SIZE), interpolation=cv2.INTER_AREA)
    ok, encoded = cv2.imencode(".jpg", square, [cv2.IMWRITE_JPEG_QUALITY, 86])
    if not ok:
        raise ImageError("The image could not be processed.")
    return "data:image/jpeg;base64," + base64.b64encode(encoded.tobytes()).decode("ascii")
