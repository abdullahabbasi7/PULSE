"""Equipment predictor (Module 2 AI).

Predicts how many of each kind of item an event needs (plates, glasses, cutlery, chafing
dishes, chairs, tables...) from its guest count, event type, service style and menu.

Model: one gradient-boosted regression tree ensemble per item category, trained on
log(1 + quantity) so that errors are relative rather than absolute. It is compared with
the rule of thumb caterers use today: "one of everything per guest, a table per ten
guests and two chafing dishes per main dish".

Training data comes from an event simulator that encodes how catering requirements
behave (buffets need more plates than plated service, desserts in bowls need bowls,
religious gatherings use more floor seating, and so on) with random variation between
events. A company's own completed events, from its QR check-out records, can be added to
the training data as its history grows.
"""

from __future__ import annotations

import math
import random
import re
import time
from dataclasses import dataclass
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import HistGradientBoostingRegressor

MODEL_VERSION = 1

CATEGORIES = ("dinner_plate", "dessert_plate", "bowl", "glass", "cup", "cutlery_set", "chafing_dish",
              "serving_dish", "chair", "table", "tablecloth")
CATEGORY_LABELS = {
    "dinner_plate": "Dinner plates", "dessert_plate": "Dessert plates", "bowl": "Bowls", "glass": "Glasses",
    "cup": "Tea cups", "cutlery_set": "Cutlery sets", "chafing_dish": "Chafing dishes",
    "serving_dish": "Serving dishes", "chair": "Chairs", "table": "Tables", "tablecloth": "Tablecloths",
}
EVENT_TYPES = ("wedding", "mehndi", "walima", "engagement", "birthday", "corporate", "conference", "religious", "other")
SERVICE_STYLES = ("buffet", "plated", "family_style")

_DESSERT = re.compile(r"kheer|firni|halwa|jamun|custard|trifle|ice ?cream|kulfi|zarda|cake|brownie|dessert|sweet|mithai|ras ?malai|shahi tukray", re.I)
_BOWL_DESSERT = re.compile(r"kheer|firni|custard|trifle|ice ?cream|ras ?malai", re.I)
_TEA = re.compile(r"\btea\b|chai|coffee|kahwa|qehwa", re.I)
_SOUP = re.compile(r"soup|yakhni", re.I)
_DRINKS = re.compile(r"drink|juice|lassi|water|cold ?drink|pepsi|coke|sharbat|lemonade|mint margarita", re.I)
_SIDES = re.compile(r"naan|roti|raita|salad|chutney|papad", re.I)

SEATING = {"wedding": 0.95, "mehndi": 0.8, "walima": 1.0, "engagement": 0.9, "birthday": 0.75, "corporate": 0.85,
           "conference": 1.0, "religious": 0.6, "other": 0.85}


@dataclass
class EventSpec:
    guest_count: int
    event_type: str = "wedding"
    service_style: str = "buffet"
    menu: str = ""


def menu_features(menu: str) -> dict[str, int]:
    """Count dishes by kind from a free-text menu ("Chicken biryani, qorma, naan, kheer")."""
    items = [p.strip() for p in re.split(r"[,\n;/+]|\band\b|\baur\b", menu or "") if p.strip()]
    desserts = [i for i in items if _DESSERT.search(i)]
    bowl_desserts = [i for i in desserts if _BOWL_DESSERT.search(i)]
    drinks = [i for i in items if _DRINKS.search(i) or _TEA.search(i)]
    sides = [i for i in items if _SIDES.search(i) and not _DESSERT.search(i)]
    soups = [i for i in items if _SOUP.search(i)]
    mains = [i for i in items if i not in desserts and i not in drinks and i not in sides and i not in soups]
    return {
        "mains": len(mains) if items else 2,  # unknown menu: assume two main dishes
        "desserts": len(desserts),
        "bowl_desserts": len(bowl_desserts),
        "tea": int(any(_TEA.search(i) for i in items)),
        "soup": int(bool(soups)),
        "drinks": int(any(_DRINKS.search(i) for i in items)),
        "sides": len(sides),
    }


def _vector(spec: EventSpec) -> list[float]:
    m = menu_features(spec.menu)
    g = max(1, spec.guest_count)
    return [
        g, math.log(g),
        *[float(spec.event_type == e) for e in EVENT_TYPES],
        *[float(spec.service_style == s) for s in SERVICE_STYLES],
        m["mains"], m["desserts"], m["bowl_desserts"], m["tea"], m["soup"], m["drinks"], m["sides"],
    ]


# ---------------------------------------------------------------- simulator

def simulate(spec: EventSpec, rng: random.Random) -> dict[str, int]:
    """Quantities a well-run caterer would actually send for this event."""
    g = spec.guest_count
    m = menu_features(spec.menu)
    buffet = spec.service_style == "buffet"
    family = spec.service_style == "family_style"
    spare = rng.uniform(1.06, 1.18)
    noise = lambda: rng.lognormvariate(0, 0.06)  # noqa: E731
    seconds = 1.35 if buffet else (1.12 if family else 1.03)
    seat = SEATING[spec.event_type] * rng.uniform(0.92, 1.05)
    chairs = g * seat
    tables = chairs / (10 if spec.event_type in ("religious", "conference") else 8) + (m["mains"] + m["desserts"]) / 3 * buffet
    q = {
        "dinner_plate": g * seconds * spare * noise(),
        "dessert_plate": g * (m["desserts"] - m["bowl_desserts"] > 0) * (1.1 if buffet else 1.0) * spare * noise(),
        "bowl": g * (m["soup"] + 0.9 * (m["bowl_desserts"] > 0) + 0.25 * (m["sides"] > 0)) * spare * noise(),
        "glass": g * (1.7 if m["drinks"] else 1.15) * spare * noise(),
        "cup": g * m["tea"] * 0.85 * spare * noise(),
        "cutlery_set": g * (1.3 if buffet else 1.05) * spare * noise(),
        "chafing_dish": (m["mains"] + 0.6 * m["desserts"]) * math.ceil(g / (180 if buffet else 350)) * noise() * (buffet or family or 0.4),
        "serving_dish": (g / 8 * m["mains"] * 0.6 if not buffet else (m["mains"] + m["sides"]) * 2) * noise(),
        "chair": chairs * noise(),
        "table": tables * noise(),
        "tablecloth": tables * 1.1 * noise(),
    }
    return {k: max(0, int(round(v))) for k, v in q.items()}


def baseline(spec: EventSpec) -> dict[str, int]:
    """The common rule of thumb: one per guest, a table per ten, two chafing dishes per main dish."""
    g = spec.guest_count
    m = menu_features(spec.menu)
    return {
        "dinner_plate": g, "dessert_plate": g if m["desserts"] else 0, "bowl": g if (m["bowl_desserts"] or m["soup"]) else 0,
        "glass": g, "cup": g if m["tea"] else 0, "cutlery_set": g, "chafing_dish": 2 * m["mains"],
        "serving_dish": 2 * m["mains"], "chair": g, "table": math.ceil(g / 10), "tablecloth": math.ceil(g / 10),
    }


_MAINS = ["chicken biryani", "mutton qorma", "chicken karahi", "beef pulao", "seekh kabab", "chicken tikka", "haleem",
          "nihari", "fish fry", "chinese rice", "pasta", "chicken handi", "daal makhni", "aloo gosht"]
_DESSERTS = ["kheer", "firni", "gulab jamun", "gajar ka halwa", "custard", "fruit trifle", "ice cream", "zarda", "cake"]
_EXTRAS = ["naan", "raita", "salad", "soft drinks", "kashmiri chai", "green tea", "soup", "mint margarita"]
_STYLE_BY_EVENT = {"corporate": (0.4, 0.5, 0.1), "conference": (0.6, 0.35, 0.05), "religious": (0.5, 0.05, 0.45),
                   "birthday": (0.8, 0.1, 0.1)}


def random_spec(rng: random.Random) -> EventSpec:
    event = rng.choice(EVENT_TYPES)
    weights = _STYLE_BY_EVENT.get(event, (0.75, 0.15, 0.10))
    style = rng.choices(SERVICE_STYLES, weights=weights)[0]
    guests = int(rng.choice([rng.uniform(30, 150), rng.uniform(150, 600), rng.uniform(600, 2500)]))
    menu = rng.sample(_MAINS, rng.randint(1, 4)) + rng.sample(_DESSERTS, rng.randint(0, 2)) + rng.sample(_EXTRAS, rng.randint(0, 4))
    rng.shuffle(menu)
    return EventSpec(guests, event, style, ", ".join(menu))


class EquipmentPredictor:
    def __init__(self) -> None:
        self.models: dict[str, HistGradientBoostingRegressor] = {}
        self.metrics: dict = {}

    def fit(self, specs: list[EventSpec], targets: list[dict[str, int]]) -> "EquipmentPredictor":
        X = np.array([_vector(s) for s in specs])
        for cat in CATEGORIES:
            y = np.log1p(np.array([t[cat] for t in targets], dtype=float))
            model = HistGradientBoostingRegressor(max_iter=150, learning_rate=0.12, max_leaf_nodes=31, random_state=0)
            self.models[cat] = model.fit(X, y)
        return self

    def predict(self, spec: EventSpec) -> dict[str, int]:
        x = np.array([_vector(spec)])
        return {cat: max(0, int(round(float(np.expm1(self.models[cat].predict(x)[0]))))) for cat in CATEGORIES}

    def evaluate(self, specs: list[EventSpec], targets: list[dict[str, int]]) -> dict:
        """Weighted absolute percentage error: total error / total true quantity, per category."""
        err_model = {c: 0.0 for c in CATEGORIES}
        err_base = {c: 0.0 for c in CATEGORIES}
        total = {c: 0.0 for c in CATEGORIES}
        for spec, truth in zip(specs, targets):
            pred, base = self.predict(spec), baseline(spec)
            for c in CATEGORIES:
                err_model[c] += abs(pred[c] - truth[c])
                err_base[c] += abs(base[c] - truth[c])
                total[c] += truth[c]
        per = {
            c: {"model_error": round(err_model[c] / max(total[c], 1), 4), "baseline_error": round(err_base[c] / max(total[c], 1), 4)}
            for c in CATEGORIES
        }
        overall_model = sum(err_model.values()) / max(sum(total.values()), 1)
        overall_base = sum(err_base.values()) / max(sum(total.values()), 1)
        return {
            "metric": "weighted absolute percentage error (lower is better)",
            "per_category": per,
            "model_error": round(overall_model, 4),
            "baseline_error": round(overall_base, 4),
            "error_reduction": round(1 - overall_model / overall_base, 4) if overall_base else None,
            "test_events": len(specs),
        }

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump({"version": MODEL_VERSION, "predictor": self}, path)

    @staticmethod
    def load(path: Path) -> "EquipmentPredictor | None":
        try:
            payload = joblib.load(path)
        except Exception:
            return None
        if not isinstance(payload, dict) or payload.get("version") != MODEL_VERSION:
            return None
        return payload["predictor"]


MODEL_FILE = "equipment_predictor.joblib"


def train_and_save(model_dir: Path | None = None, n_events: int = 4000, verbose: bool = False) -> EquipmentPredictor:
    from app.core.config import settings

    started = time.time()
    model_dir = model_dir or Path(settings.ai_model_dir)
    rng = random.Random(21)
    specs = [random_spec(rng) for _ in range(n_events + 1000)]
    targets = [simulate(s, rng) for s in specs]
    predictor = EquipmentPredictor().fit(specs[:n_events], targets[:n_events])
    predictor.metrics = predictor.evaluate(specs[n_events:], targets[n_events:])
    predictor.metrics["trained_on"] = n_events
    predictor.metrics["train_seconds"] = round(time.time() - started, 1)
    predictor.save(model_dir / MODEL_FILE)
    if verbose:
        import json

        print(json.dumps(predictor.metrics, indent=2))
    return predictor


if __name__ == "__main__":
    train_and_save(verbose=True)
