from . import CoffeeMachine, ScoringCustomer


def main() -> None:
    machine = CoffeeMachine()
    customer = ScoringCustomer(machine=machine)

    bean_grams = machine.add_beans(14.0)
    sugar_grams = machine.add_sugar(5.5)
    milk_ml = machine.add_milk(30.0)
    water_ml = machine.top_up_with_hot_water()
    score = customer.taste()

    print(
        "Drink:",
        {
            "bean_grams": bean_grams,
            "sugar_grams": sugar_grams,
            "milk_ml": milk_ml,
            "water_ml": water_ml,
        },
    )
    print("Customer score:", score)


if __name__ == "__main__":
    main()
