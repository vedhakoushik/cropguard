import json
import uuid
from datetime import datetime

from flask import Blueprint, request, jsonify
from services.db import fetch_all, fetch_one, execute
from services.gemini import chat_with_ai, AP_PEST_KNOWLEDGE

chat_bp = Blueprint("chat", __name__, url_prefix="/api/chat")


FALLBACK_CROPS = [
    {"id": i + 1, "name": name, "category": "crop", "growing_season": ""}
    for i, name in enumerate(sorted(AP_PEST_KNOWLEDGE.keys()))
]


def _valid_uuid(value):
    try:
        return str(uuid.UUID(str(value))) if value else None
    except ValueError:
        return None


def _serialize(row: dict) -> dict:
    out = {}
    for k, v in row.items():
        if isinstance(v, uuid.UUID):
            v = str(v)
        elif isinstance(v, datetime):
            v = v.isoformat()
        out[k] = v
    return out


@chat_bp.route("/sessions", methods=["GET"])
def get_sessions():
    try:
        rows = fetch_all(
            "SELECT s.*, CASE WHEN c.id IS NULL THEN NULL ELSE json_build_object('name', c.name) END AS crops "
            "FROM chat_sessions s LEFT JOIN crops c ON c.id = s.crop_id "
            "ORDER BY s.started_at DESC LIMIT 20"
        )
        return jsonify([_serialize(r) for r in rows]), 200
    except Exception as e:
        print(f"[chat sessions] {e}")
        return jsonify([]), 200


@chat_bp.route("/sessions", methods=["POST"])
def create_session():
    data    = request.get_json(silent=True) or {}
    crop_id = data.get("crop_id")
    title   = data.get("title", "New Chat")
    try:
        row = fetch_one(
            "INSERT INTO chat_sessions (session_title, is_active, crop_id) VALUES (%s, TRUE, %s) RETURNING *",
            (title, int(crop_id) if crop_id else None),
        )
        return jsonify(_serialize(row)), 201
    except Exception as e:
        print(f"[create session] {e}")
        return jsonify({"id": "local-session", "session_title": title, "is_active": True}), 201


@chat_bp.route("/sessions/<session_id>", methods=["DELETE"])
def delete_session(session_id):
    sid = _valid_uuid(session_id)
    if sid:
        try:
            execute("DELETE FROM chat_sessions WHERE id = %s", (sid,))
        except Exception as e:
            print(f"[delete session] {e}")
    return jsonify({"message": "Deleted"}), 200


@chat_bp.route("/sessions/<session_id>/messages", methods=["GET"])
def get_messages(session_id):
    sid = _valid_uuid(session_id)
    if not sid:
        return jsonify([]), 200
    try:
        rows = fetch_all(
            "SELECT * FROM chat_messages WHERE session_id = %s ORDER BY created_at",
            (sid,),
        )
        return jsonify([_serialize(r) for r in rows]), 200
    except Exception as e:
        print(f"[get messages] {e}")
        return jsonify([]), 200


@chat_bp.route("/sessions/<session_id>/analysis", methods=["GET"])
def get_latest_analysis(session_id):
    sid = _valid_uuid(session_id)
    if not sid:
        return jsonify({}), 200
    try:
        row = fetch_one(
            "SELECT * FROM analysis_results WHERE session_id = %s ORDER BY created_at DESC LIMIT 1",
            (sid,),
        )
        if not row:
            return jsonify({}), 200

        pesticides = row.get("recommended_pesticides") or "[]"
        if isinstance(pesticides, str):
            try:
                pesticides = json.loads(pesticides)
            except Exception:
                pesticides = []

        prevention = row.get("additional_tips") or ""
        result = {
            "pest_detected": row.get("pest_name_detected") or "Unknown",
            "causes": row.get("cause_summary") or "",
            "organic_alternative": row.get("solution_summary") or "",
            "severity": row.get("severity") or "low",
            "pesticides": pesticides,
            "prevention_tips": prevention,
            "confidence": row.get("confidence") or row.get("ai_confidence") or None,
        }
        return jsonify(result), 200
    except Exception as e:
        print(f"[latest analysis] {e}")
        return jsonify({}), 200


@chat_bp.route("/sessions/<session_id>/messages", methods=["POST"])
def send_message(session_id):
    data    = request.get_json(silent=True) or {}
    message = data.get("message", "").strip()
    context = data.get("context", {})

    if not message:
        return jsonify({"error": "Message cannot be empty"}), 400

    sid  = _valid_uuid(session_id)
    msgs = []
    if sid:
        try:
            prev = fetch_all(
                "SELECT role, content FROM chat_messages WHERE session_id = %s ORDER BY created_at DESC LIMIT 6",
                (sid,),
            )
            msgs = list(reversed(prev))
        except Exception as e:
            print(f"[message history] {e}")

    # Mark as follow-up if session already has AI replies
    has_prior_ai = any(m["role"] == "assistant" for m in msgs)
    context["is_followup"] = has_prior_ai

    # Build concise history summary for Gemini
    if has_prior_ai and msgs:
        parts = []
        for m in msgs[-4:]:
            role    = "Farmer" if m["role"] == "user" else "AI"
            content = m["content"][:120].replace("\n", " ")
            parts.append(f"{role}: {content}")
        context["history_summary"] = " | ".join(parts)

    if sid:
        try:
            execute(
                "INSERT INTO chat_messages (session_id, role, content) VALUES (%s, 'user', %s)",
                (sid, message),
            )
        except Exception as e:
            print(f"[save user message] {e}")

    ai_reply = chat_with_ai(message, context)

    message_id = None
    if sid:
        try:
            row = fetch_one(
                "INSERT INTO chat_messages (session_id, role, content) VALUES (%s, 'assistant', %s) RETURNING id",
                (sid, ai_reply),
            )
            message_id = row["id"]
        except Exception as e:
            print(f"[save ai message] {e}")

    return jsonify({
        "user_message": message,
        "ai_reply":     ai_reply,
        "message_id":   message_id
    }), 200


@chat_bp.route("/crops", methods=["GET"])
def get_crops():
    try:
        rows = fetch_all("SELECT id, name, category, growing_season FROM crops ORDER BY name")
        return jsonify(rows or FALLBACK_CROPS), 200
    except Exception as e:
        print(f"[get crops] {e}")
        return jsonify(FALLBACK_CROPS), 200
