from __future__ import annotations

from collections import deque
from functools import wraps
from threading import Lock
import time

from barista_demo import CoffeeMachine, ScoringCustomer


def _round_or_none(value: float | None) -> float | None:
    if value is None:
        return None
    return round(value, 2)


class BaristaVisualRuntime:
    def __init__(self) -> None:
        self._lock = Lock()
        self._events: deque[dict] = deque(maxlen=100)
        self._next_seq = 1
        self._patched = False
        self._machine: CoffeeMachine | None = None
        self._customer: ScoringCustomer | None = None
        self._last_score: float | None = None

    def initialize(
        self,
        machine: CoffeeMachine | None = None,
        customer: ScoringCustomer | None = None,
    ) -> None:
        self._patch_methods()
        with self._lock:
            if machine is not None:
                self._machine = machine
            if customer is not None:
                self._customer = customer

    def snapshot(self) -> dict:
        with self._lock:
            return self._build_snapshot_unlocked()

    def events_since(self, since_seq: int) -> list[dict]:
        with self._lock:
            return [event for event in self._events if event["seq"] > since_seq]

    def preference_snapshot(self) -> dict | None:
        with self._lock:
            if self._customer is None:
                return None

            preference = self._customer.preference
            return {
                "bean_grams": round(preference.bean_grams, 2),
                "sugar_grams": round(preference.sugar_grams, 2),
                "milk_ml": round(preference.milk_ml, 2),
                "water_ml": round(self._customer.machine.cup_size_ml - preference.milk_ml, 2),
            }

    def _patch_methods(self) -> None:
        if self._patched:
            return

        self._wrap_machine_init()
        self._wrap_customer_init()
        self._wrap_machine_method("add_beans")
        self._wrap_machine_method("add_sugar")
        self._wrap_machine_method("add_milk")
        self._wrap_machine_method("top_up_with_hot_water")
        self._wrap_customer_taste()
        self._patched = True

    def _wrap_machine_init(self) -> None:
        original = getattr(CoffeeMachine, "__init__")
        if getattr(original, "_barista_visual_wrapped", False):
            return

        @wraps(original)
        def wrapped(machine: CoffeeMachine, *args, **kwargs):
            original(machine, *args, **kwargs)
            with self._lock:
                self._machine = machine

        wrapped._barista_visual_wrapped = True  # type: ignore[attr-defined]
        setattr(CoffeeMachine, "__init__", wrapped)

    def _wrap_customer_init(self) -> None:
        original = getattr(ScoringCustomer, "__init__")
        if getattr(original, "_barista_visual_wrapped", False):
            return

        @wraps(original)
        def wrapped(customer: ScoringCustomer, *args, **kwargs):
            with self._lock:
                previous_machine = self._machine
            original(customer, *args, **kwargs)
            with self._lock:
                # If no explicit machine was supplied, follow the most recent machine
                # instance so the visual and score stay aligned without extra setup.
                if "machine" not in kwargs and len(args) < 1 and previous_machine is not None:
                    customer.machine = previous_machine
                    self._machine = previous_machine
                self._customer = customer
                if self._machine is None:
                    self._machine = customer.machine

        wrapped._barista_visual_wrapped = True  # type: ignore[attr-defined]
        setattr(ScoringCustomer, "__init__", wrapped)

    def _wrap_machine_method(self, method_name: str) -> None:
        original = getattr(CoffeeMachine, method_name)
        if getattr(original, "_barista_visual_wrapped", False):
            return

        @wraps(original)
        def wrapped(machine: CoffeeMachine, *args, **kwargs):
            result = original(machine, *args, **kwargs)
            self._record_event(method_name, machine=machine)
            return result

        wrapped._barista_visual_wrapped = True  # type: ignore[attr-defined]
        setattr(CoffeeMachine, method_name, wrapped)

    def _wrap_customer_taste(self) -> None:
        original = getattr(ScoringCustomer, "taste")
        if getattr(original, "_barista_visual_wrapped", False):
            return

        @wraps(original)
        def wrapped(customer: ScoringCustomer, *args, **kwargs):
            score = original(customer, *args, **kwargs)
            self._record_event("taste", machine=customer.machine, customer=customer, score=score)
            return score

        wrapped._barista_visual_wrapped = True  # type: ignore[attr-defined]
        setattr(ScoringCustomer, "taste", wrapped)

    def _record_event(
        self,
        event_type: str,
        machine: CoffeeMachine | None = None,
        customer: ScoringCustomer | None = None,
        score: float | None = None,
    ) -> None:
        with self._lock:
            if machine is not None:
                self._machine = machine
            if customer is not None:
                self._customer = customer
            if score is not None:
                self._last_score = round(score, 2)

            self._events.append(
                {
                    "seq": self._next_seq,
                    "type": event_type,
                    "timestamp": time.time(),
                    "snapshot": self._build_snapshot_unlocked(),
                }
            )
            self._next_seq += 1

    def _build_snapshot_unlocked(self) -> dict:
        machine = self._machine
        customer = self._customer

        if machine is None and customer is not None:
            machine = customer.machine

        if machine is None:
            return {
                "bean_grams": 0.0,
                "sugar_grams": 0.0,
                "milk_ml": 0.0,
                "water_ml": 0.0,
                "cup_size_ml": CoffeeMachine.cup_size_ml,
                "score": _round_or_none(self._last_score),
            }

        return {
            "bean_grams": round(machine.state.bean_grams, 2),
            "sugar_grams": round(machine.state.sugar_grams, 2),
            "milk_ml": round(machine.state.milk_ml, 2),
            "water_ml": round(machine.state.water_ml, 2),
            "cup_size_ml": round(machine.cup_size_ml, 2),
            "score": _round_or_none(self._last_score),
        }


runtime = BaristaVisualRuntime()
runtime.initialize()
