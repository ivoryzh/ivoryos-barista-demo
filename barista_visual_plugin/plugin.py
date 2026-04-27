from flask import Blueprint, Flask, current_app, jsonify, render_template, request
import os

from .runtime import runtime

barista_visual_bp = Blueprint(
    "barista_visual_plugin",
    __name__,
    template_folder=os.path.join(os.path.dirname(__file__), "templates"),
    static_folder=os.path.join(os.path.dirname(__file__), "static"),
)
barista_visual_bp.plugin_type = "left_panel"


@barista_visual_bp.route("/")
def widget():
    base_exists = "base.html" in current_app.jinja_loader.list_templates()
    return render_template("barista_visual.html", base_exists=base_exists)


@barista_visual_bp.route("/api/state")
def state():
    since = request.args.get("since", default="0")
    try:
        since_seq = int(since)
    except ValueError:
        since_seq = 0

    return jsonify(
        {
            "snapshot": runtime.snapshot(),
            "events": runtime.events_since(since_seq),
        }
    )


@barista_visual_bp.route("/api/preference")
def preference():
    data = runtime.preference_snapshot()
    return jsonify({"preference": data})


if __name__ == "__main__":
    app = Flask(__name__)
    app.register_blueprint(barista_visual_bp)
    app.run(debug=True)
