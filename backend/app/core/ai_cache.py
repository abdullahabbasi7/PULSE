"""Loads each trained model once per process, training it first if no saved copy exists."""

import threading
from collections.abc import Callable
from typing import TypeVar

T = TypeVar("T")

_lock = threading.Lock()
_cache: dict[str, object] = {}


def get_model(name: str, load: Callable[[], T | None], train: Callable[[], T]) -> T:
    model = _cache.get(name)
    if model is not None:
        return model  # type: ignore[return-value]
    with _lock:
        model = _cache.get(name)
        if model is None:
            model = load() or train()
            _cache[name] = model
    return model  # type: ignore[return-value]


def warm_up(loaders: list[Callable[[], object]]) -> None:
    """Load or train all models in a background thread when the API starts."""

    def run() -> None:
        for loader in loaders:
            try:
                loader()
            except Exception as error:  # a model failing to load must not stop the API
                print(f"[ai] warm-up failed: {error!r}")

    threading.Thread(target=run, name="ai-warm-up", daemon=True).start()
