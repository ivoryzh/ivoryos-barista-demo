from flask import Flask, render_template, jsonify, request
from barista_demo.coffee_maker import CoffeeMachine
from barista_demo.customer import AnnoyingCustomer, PreferenceProfile

app = Flask(__name__)

# Global state for the demo
class DemoState:
    def __init__(self):
        self.reset()

    def reset(self):
        self.machine = CoffeeMachine()
        # Fixed preferences for a consistent demo experience
        self.preference = PreferenceProfile(
            bean_grams=20.0,
            sugar_grams=5.0,
            milk_ml=20.0
        )
        self.customer = AnnoyingCustomer(machine=self.machine, preference=self.preference)

state = DemoState()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/simulate', methods=['POST'])
def simulate():
    data = request.json
    
    beans = float(data.get('beans', 15.0))
    sugar = float(data.get('sugar', 5.0))
    milk = float(data.get('milk', 40.0))
    
    # Run the experiment on the machine
    state.machine.add_beans(beans)
    state.machine.add_sugar(sugar)
    state.machine.add_milk(milk)
    state.machine.top_up_with_hot_water()
    
    # Get customer feedback (measured objective)
    score = state.customer.taste()
    
    result = {
        "params": {
            "beans": round(beans, 2),
            "sugar": round(sugar, 2),
            "milk": round(milk, 2)
        },
        "score": score
    }
    
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
