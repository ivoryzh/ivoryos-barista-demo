# ivoryos-barista-demo
A 3-minute IvoryOS demo where a coffee robot uses Bayesian optimization to satisfy a customer who only gives a score.

## Current scaffold

The first layer of the demo is a small Python API that can later be introspected
by IvoryOS into visual workflow blocks:

- `CoffeeMachine` exposes only explicit steps like `add_beans`, `add_sugar`, `add_milk`, and `top_up_with_hot_water`.
- `AnnoyingCustomer.taste()` reads the current machine state and returns only a 1-10 satisfaction score.
- The optimizer can log both the three recipe inputs and the derived metrics for each run.

## Run

```powershell
python -m barista_demo.demo
python examples/run_demo.py
python app.py
python -m unittest
```

## Flask UI

The Flask app renders a narrow single-column demo sized for roughly one-third
of a presentation screen. It visualizes:

- a coffee glass with milk and coffee mix
- sugar as cube icons
- coffee intensity, sweetness, and creaminess
- the customer score as the only observed output

Install Flask first:

```powershell
pip install -r requirements.txt
```
