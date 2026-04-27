from __future__ import annotations

import time
from dataclasses import asdict, dataclass


def _bounded(name: str, value: float, lower: float, upper: float) -> float:
    if not lower <= value <= upper:
        raise ValueError(f"{name} must be between {lower} and {upper}. Got {value}.")
    return value


@dataclass(frozen=True)
class BrewResult:
    bean_grams: float
    sugar_grams: float
    milk_ml: float
    water_ml: float
    total_volume_ml: float
    strength_index: float
    sweetness_index: float
    creaminess_index: float

    def as_dict(self) -> dict[str, float]:
        return asdict(self)


@dataclass
class MachineState:
    bean_grams: float = 0.0
    sugar_grams: float = 0.0
    milk_ml: float = 0.0
    water_ml: float = 0.0


class CoffeeMachine:
    """
    Minimal machine API that IvoryOS can introspect into workflow blocks.

    The public methods intentionally use only primitive inputs so the visual
    workflow can expose a few obvious experiment knobs.
    """

    cup_size_ml = 240.0

    def __init__(self) -> None:
        self.state = MachineState()

    def add_beans(self, bean_grams: float) -> float:
        bean_grams = _bounded("bean_grams", bean_grams, 5.0, 30.0)
        self.state.bean_grams = bean_grams
        time.sleep(0.2)
        return bean_grams

    def add_sugar(self, sugar_grams: float) -> float:
        sugar_grams = _bounded("sugar_grams", sugar_grams, 0.0, 15.0)
        self.state.sugar_grams = sugar_grams
        time.sleep(0.2)
        return sugar_grams

    def add_milk(self, milk_ml: float) -> float:
        milk_ml = _bounded("milk_ml", milk_ml, 0.0, 180.0)
        self.state.milk_ml = milk_ml
        time.sleep(0.2)
        return milk_ml

    def top_up_with_hot_water(self) -> float:
        self.state.water_ml = round(self.cup_size_ml - self.state.milk_ml, 4)
        time.sleep(0.2)
        return self.state.water_ml
