import unittest

from flask import Flask
from barista_demo import CoffeeMachine, ScoringCustomer
from barista_visual_plugin.plugin import barista_visual_bp


class BaristaDemoTests(unittest.TestCase):
    def test_customer_prefers_near_target_recipe(self) -> None:
        machine = CoffeeMachine()
        customer = ScoringCustomer(machine=machine)
        machine.add_beans(14.0)
        machine.add_sugar(6.0)
        machine.add_milk(35.0)
        machine.top_up_with_hot_water()
        near_score = customer.taste()

        machine.add_beans(26.0)
        machine.add_sugar(0.0)
        machine.add_milk(120.0)
        machine.top_up_with_hot_water()
        far_score = customer.taste()

        self.assertGreater(near_score, far_score)
        self.assertGreaterEqual(near_score, 8.0)
        self.assertLessEqual(far_score, 4.5)

    def test_machine_steps_preserve_experiment_conditions(self) -> None:
        machine = CoffeeMachine()
        bean_grams = machine.add_beans(17.0)
        sugar_grams = machine.add_sugar(4.0)
        milk_ml = machine.add_milk(25.0)
        water_ml = machine.top_up_with_hot_water()

        self.assertEqual(bean_grams, 17.0)
        self.assertEqual(sugar_grams, 4.0)
        self.assertEqual(milk_ml, 25.0)
        self.assertEqual(water_ml, 215.0)

    def test_score_is_clamped_to_customer_scale(self) -> None:
        machine = CoffeeMachine()
        customer = ScoringCustomer(machine=machine)
        machine.add_beans(30.0)
        machine.add_sugar(15.0)
        machine.add_milk(180.0)
        machine.top_up_with_hot_water()
        score = customer.taste()

        self.assertGreaterEqual(score, 1.0)
        self.assertLessEqual(score, 10.0)

    def test_index_route_renders_for_scoring_customer(self) -> None:
        app = Flask(__name__)
        app.register_blueprint(barista_visual_bp)
        client = app.test_client()

        response = client.get("/")

        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Reveal Preference", response.data)



if __name__ == "__main__":
    unittest.main()
