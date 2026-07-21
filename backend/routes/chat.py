from flask import Blueprint, request, jsonify
from services.supabase_client import get_supabase
from services.gemini import chat_with_ai, AP_PEST_KNOWLEDGE
import json

chat_bp = Blueprint("chat", __name__, url_prefix="/api/chat")


FALLBACK_CROPS = [
    {"id": i + 1, "name": name, "category": "crop", "growing_season": ""}
    for i, name in enumerate(sorted(AP_PEST_KNOWLEDGE.keys()))
]


@chat_bp.route("/sessions", methods=["GET"])
def get_sessions():
    try:
        sb  = get_supabase()
        res = sb.table("chat_sessions").select("*, crops(name)").order("started_at", desc=True).limit(20).execute()
        return jsonify(res.data or []), 200
    except Exception as e:
        print(f"[chat sessions] {e}")
        return jsonify([]), 200


@chat_bp.route("/sessions", methods=["POST"])
def create_session():
    data    = request.get_json(silent=True) or {}
    crop_id = data.get("crop_id")
    title   = data.get("title", "New Chat")
    try:
        sb          = get_supabase()
        insert_data = {"session_title": title, "is_active": True}
        if crop_id:
            insert_data["crop_id"] = int(crop_id)
        res = sb.table("chat_sessions").insert(insert_data).execute()
        return jsonify(res.data[0]), 201
    except Exception as e:
        print(f"[create session] {e}")
        return jsonify({"id": "local-session", "session_title": title, "is_active": True}), 201


@chat_bp.route("/sessions/<session_id>", methods=["DELETE"])
def delete_session(session_id):
    try:
        sb = get_supabase()
        sb.table("chat_sessions").delete().eq("id", session_id).execute()
    except Exception as e:
        print(f"[delete session] {e}")
    return jsonify({"message": "Deleted"}), 200


@chat_bp.route("/sessions/<session_id>/messages", methods=["GET"])
def get_messages(session_id):
    try:
        sb  = get_supabase()
        res = sb.table("chat_messages").select("*").eq("session_id", session_id).order("created_at").execute()
        return jsonify(res.data or []), 200
    except Exception as e:
        print(f"[get messages] {e}")
        return jsonify([]), 200


@chat_bp.route("/sessions/<session_id>/analysis", methods=["GET"])
def get_latest_analysis(session_id):
    try:
        sb = get_supabase()
        res = (
            sb.table("analysis_results")
            .select("*")
            .eq("session_id", session_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        row = (res.data or [None])[0]
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

    msgs = []
    sb = None
    try:
        sb = get_supabase()
        prev = sb.table("chat_messages").select("role,content")\
                 .eq("session_id", session_id)\
                 .order("created_at", desc=True).limit(6).execute()
        msgs = list(reversed(prev.data or []))
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

    if sb:
        try:
            sb.table("chat_messages").insert({
                "session_id": session_id, "role": "user", "content": message
            }).execute()
        except Exception as e:
            print(f"[save user message] {e}")

    ai_reply = chat_with_ai(message, context)

    message_id = None
    if sb:
        try:
            res = sb.table("chat_messages").insert({
                "session_id": session_id, "role": "assistant", "content": ai_reply
            }).execute()
            message_id = res.data[0]["id"]
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
        sb  = get_supabase()
        res = sb.table("crops").select("id, name, category, growing_season").order("name").execute()
        return jsonify(res.data or FALLBACK_CROPS), 200
    except Exception as e:
        print(f"[get crops] {e}")
        return jsonify(FALLBACK_CROPS), 200
