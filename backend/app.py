import os
from flask import Flask, render_template, session
from flask_cors import CORS
from config import Config
from routes.chat     import chat_bp
from routes.analysis import analysis_bp
from routes.auth import auth_bp

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, "../frontend/templates"),
    static_folder=os.path.join(BASE_DIR, "../frontend/static")
)
app.config.from_object(Config)
CORS(app, supports_credentials=True)

app.register_blueprint(chat_bp)
app.register_blueprint(analysis_bp)
app.register_blueprint(auth_bp)
app.secret_key = Config.SECRET_KEY


@app.context_processor
def inject_auth_state():
    user = session.get("user")
    return {
        "current_user": user,
        "is_authenticated": bool(user),
    }

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/chat")
def chat():
    return render_template("chat.html")

@app.route("/api/health")
def health():
    return {"status": "ok", "app": "CropGuard AI"}, 200
if __name__ == "__main__":
    app.run(debug=Config.DEBUG, port=5000, use_reloader=False)
