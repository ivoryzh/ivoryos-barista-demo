import ivoryos
from barista_visual_plugin.plugin import barista_visual_bp
from barista_demo import CoffeeMachine, ScoringCustomer


if __name__ == "__main__":
    coffee_machine = CoffeeMachine()
    customer = ScoringCustomer()
    ivoryos.run(__name__, blueprint_plugins=barista_visual_bp)
