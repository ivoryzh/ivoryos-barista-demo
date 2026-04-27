from __future__ import annotations

from dataclasses import dataclass

from .coffee_maker import CoffeeMachine


def _clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


@dataclass(frozen=True)
class PreferenceProfile:
    """
    Hidden customer preferences.

    In the demo, these are the unknown experimental optima the optimizer is
    trying to infer from scalar feedback alone.
    """

    bean_grams: float = 14.0
    sugar_grams: float = 6.0
    milk_ml: float = 35.0


class ScoringCustomer:
    """
    Returns a single 1-10 score for a coffee.

    The customer behaves like a black-box objective function, which makes the
    coffee story map cleanly onto a self-driving lab optimization loop.
    """

    def __init__(
        self,
        machine: CoffeeMachine | None = None,
        preference: PreferenceProfile | None = None,
    ) -> None:
        self.machine = machine or CoffeeMachine()
        self.preference = preference or PreferenceProfile()

    def taste(self) -> float:
        bean_grams = self.machine.state.bean_grams
        sugar_grams = self.machine.state.sugar_grams
        milk_ml = self.machine.state.milk_ml
        water_ml = self.machine.state.water_ml or self.machine.top_up_with_hot_water()
        strength_index = round((bean_grams / water_ml) * 100.0, 4)
        preference = self.preference

        penalty = 0.0
        penalty += ((bean_grams - preference.bean_grams) / 3.0) ** 2 * 1.8
        penalty += ((sugar_grams - preference.sugar_grams) / 3.0) ** 2 * 0.9
        penalty += ((milk_ml - preference.milk_ml) / 20.0) ** 2 * 1.2

        ideal_strength = (preference.bean_grams / (self.machine.cup_size_ml - preference.milk_ml)) * 100.0
        penalty += ((strength_index - ideal_strength) / 3.5) ** 2 * 1.4

        if milk_ml > 90.0 and bean_grams < 12.0:
            penalty += 1.5
        if sugar_grams > 10.0 and milk_ml > 80.0:
            penalty += 1.0
        if bean_grams > 22.0 and sugar_grams < 3.0:
            penalty += 1.2

        raw_score = 10.0 - penalty
        return round(_clamp(raw_score, 1.0, 10.0), 2)


# Backward-compatible alias for older imports.
AnnoyingCustomer = ScoringCustomer
