# ivoryos-barista-demo
A small IvoryOS demo where a coffee robot serves a customer and the left-panel plugin visualizes the drink and score.

## Install

Install directly from git:

```powershell
pip install "git+<your-repo-url>"
```

## Run

```powershell
python -m main
```

## What Gets Installed

- `barista_demo`
- `barista_visual_plugin`
- plugin templates, CSS, JavaScript, and SVG assets

The package metadata is configured so the plugin can be imported after install:

```python
from barista_visual_plugin import barista_visual_bp
```
