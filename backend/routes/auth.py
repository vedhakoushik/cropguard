from flask import Blueprint, flash, redirect, render_template, request, session, url_for
from services.auth_service import confirm_user, sign_in_user, sign_out_user, sign_up_user

auth_bp = Blueprint("auth", __name__)


def _next_url():
    next_url = request.args.get("next") or request.form.get("next")
    return next_url or url_for("index")


def _store_session(auth_response):
    user = getattr(auth_response, "user", None)
    user_meta = getattr(user, "user_metadata", {}) or {}
    session["user"] = {
        "id": getattr(user, "id", None),
        "email": getattr(user, "email", ""),
        "full_name": user_meta.get("full_name") or "",
    }

    auth_session = getattr(auth_response, "session", None)
    if auth_session:
        session["access_token"] = getattr(auth_session, "access_token", "")
        session["refresh_token"] = getattr(auth_session, "refresh_token", "")


@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    if session.get("user"):
        return redirect(url_for("chat"))

    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")

        if not email or not password:
            flash("Enter both email and password.", "error")
            return render_template("auth.html", auth_mode="login", next_url=_next_url()), 400

        try:
            auth_response = sign_in_user(email, password)
            if not getattr(auth_response, "user", None):
                raise ValueError("Login failed")
            _store_session(auth_response)
            flash("You are now logged in.", "success")
            return redirect(_next_url())
        except Exception as exc:
            flash(f"Login failed: {exc}", "error")
            return render_template("auth.html", auth_mode="login", next_url=_next_url()), 400

    return render_template("auth.html", auth_mode="login", next_url=_next_url())


@auth_bp.route("/signup", methods=["GET", "POST"])
def signup():
    if session.get("user"):
        return redirect(url_for("chat"))

    if request.method == "POST":
        full_name = request.form.get("full_name", "").strip()
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        confirm_password = request.form.get("confirm_password", "")

        if not email or not password:
            flash("Email and password are required.", "error")
            return render_template("auth.html", auth_mode="signup", next_url=_next_url()), 400
        if len(password) < 6:
            flash("Use at least 6 characters for the password.", "error")
            return render_template("auth.html", auth_mode="signup", next_url=_next_url()), 400
        if password != confirm_password:
            flash("Passwords do not match.", "error")
            return render_template("auth.html", auth_mode="signup", next_url=_next_url()), 400

        try:
            auth_response = sign_up_user(email, password, full_name)
            if getattr(auth_response, "session", None):
                _store_session(auth_response)
                flash("Account created successfully.", "success")
                return redirect(_next_url())

            flash("Account created. Enter the verification code sent to your email.", "success")
            return redirect(url_for("auth.confirm", email=email, next=_next_url()))
        except Exception as exc:
            flash(f"Signup failed: {exc}", "error")
            return render_template("auth.html", auth_mode="signup", next_url=_next_url()), 400

    return render_template("auth.html", auth_mode="signup", next_url=_next_url())


@auth_bp.route("/confirm", methods=["GET", "POST"])
def confirm():
    email = (request.values.get("email") or "").strip().lower()

    if request.method == "POST":
        code = request.form.get("code", "").strip()
        if not email or not code:
            flash("Enter your email and the verification code.", "error")
            return render_template("auth.html", auth_mode="confirm", email=email, next_url=_next_url()), 400
        try:
            confirm_user(email, code)
            flash("Email verified. You can now log in.", "success")
            return redirect(url_for("auth.login", next=_next_url()))
        except Exception as exc:
            flash(f"Verification failed: {exc}", "error")
            return render_template("auth.html", auth_mode="confirm", email=email, next_url=_next_url()), 400

    return render_template("auth.html", auth_mode="confirm", email=email, next_url=_next_url())


@auth_bp.route("/logout", methods=["POST"])
def logout():
    try:
        sign_out_user(session.get("access_token", ""))
    except Exception:
        pass
    session.clear()
    flash("You have been logged out.", "success")
    return redirect(url_for("index"))
