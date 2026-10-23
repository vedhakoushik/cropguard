import uuid
import json
from flask import Blueprint, request, jsonify
from services.db import fetch_all, fetch_one, execute
from services.storage import upload_image, presigned_url
from services.gemini import analyze_crop_image, AP_DISTRICT_CROPS
from config import Config

analysis_bp = Blueprint("analysis", __name__, url_prefix="/api/analysis")

ALLOWED_MIME = {
    "jpg":  "image/jpeg",
    "jpeg": "image/jpeg",
    "png":  "image/png",
    "webp": "image/webp",
}

FALLBACK_LOCATIONS = {"Andhra Pradesh": sorted(AP_DISTRICT_CROPS.keys())}


def _valid_uuid(value):
    try:
        return str(uuid.UUID(str(value))) if value else None
    except ValueError:
        return None


def fetch_location_stats(state: str, district: str) -> dict:
    if not state or not district:
        return {}
    try:
        rows = fetch_all(
            "SELECT crop_name, total_area_hectare::float AS total_area_hectare, "
            "total_production::float AS total_production, max_yield::float AS max_yield, data_records "
            "FROM location_crop_data WHERE state = %s AND district = %s",
            (state, district),
        )
        return {
            r["crop_name"]: {k: r[k] for k in ["total_area_hectare","total_production","max_yield","data_records"]}
            for r in rows
        }
    except Exception as e:
        print(f"[location_stats] {e}")
        return {}


@analysis_bp.route("/locations", methods=["GET"])
def get_locations():
    try:
        rows = fetch_all("SELECT DISTINCT state, district FROM location_crop_data ORDER BY state, district")
        grouped = {}
        for row in rows:
            s, d = row["state"], row["district"]
            if s not in grouped: grouped[s] = []
            if d not in grouped[s]: grouped[s].append(d)
        for s in grouped: grouped[s].sort()
        return jsonify(grouped or FALLBACK_LOCATIONS), 200
    except Exception as e:
        print(f"[locations] {e}")
        return jsonify(FALLBACK_LOCATIONS), 200


@analysis_bp.route("/location-crops", methods=["GET"])
def get_location_crops():
    state    = request.args.get("state",    "").strip()
    district = request.args.get("district", "").strip()
    return jsonify(fetch_location_stats(state, district)), 200


@analysis_bp.route("/analyze", methods=["POST"])
def analyze():
    if "image" not in request.files:
        return jsonify({"error": "No image provided"}), 400

    file = request.files["image"]
    if not file or not file.filename:
        return jsonify({"error": "No file selected"}), 400

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_MIME:
        return jsonify({"error": f"Unsupported file type .{ext}. Use jpg, png or webp"}), 400

    image_bytes = file.read()
    if not image_bytes:
        return jsonify({"error": "Empty file"}), 400
    if len(image_bytes) > Config.MAX_IMAGE_MB * 1024 * 1024:
        return jsonify({"error": f"Image too large. Max {Config.MAX_IMAGE_MB}MB"}), 400

    crop_id    = request.form.get("crop_id")
    session_id = _valid_uuid(request.form.get("session_id"))
    crop_name  = request.form.get("crop_name", "Unknown crop").strip()
    state      = request.form.get("state",    "").strip()
    district   = request.form.get("district", "").strip()
    language   = request.form.get("language", "English").strip()
    mime_type  = ALLOWED_MIME[ext]
    crop_id    = int(crop_id) if crop_id and str(crop_id).isdigit() else None

    # Upload to S3 (non-fatal)
    public_url = ""
    s3_key     = None
    try:
        key = f"uploads/{uuid.uuid4()}.{ext}"
        upload_image(key, image_bytes, mime_type)
        s3_key     = key
        public_url = presigned_url(key)
    except Exception as e:
        print(f"[storage] {e}")

    # Save image record
    img_id = None
    try:
        row = fetch_one(
            "INSERT INTO crop_images (s3_key, original_filename, analysis_status, session_id, crop_id) "
            "VALUES (%s, %s, 'pending', %s, %s) RETURNING id",
            (s3_key, file.filename, session_id, crop_id),
        )
        img_id = row["id"]
    except Exception as e:
        print(f"[db crop_images] {e}")

    # Fetch location context
    location_stats = fetch_location_stats(state, district)
    location_str   = ", ".join(filter(None, [district, state]))

    # Run Gemini
    result = analyze_crop_image(
        image_bytes=image_bytes, crop_name=crop_name, mime_type=mime_type,
        location=location_str, district=district, location_stats=location_stats,
        language=language,
    )

    if not result["success"]:
        if img_id:
            try: execute("UPDATE crop_images SET analysis_status = 'failed' WHERE id = %s", (img_id,))
            except Exception as e: print(f"[db crop_images] {e}")
        return jsonify({"error": result.get("error", "Analysis failed")}), 500

    ai = result["data"]

    # Update image status
    if img_id:
        try:
            conf = ai.get("confidence")
            execute(
                "UPDATE crop_images SET analysis_status = 'processed', ai_confidence = %s WHERE id = %s",
                (str(conf) if conf is not None else None, img_id),
            )
        except Exception as e:
            print(f"[db crop_images] {e}")

    # Save analysis
    analysis_id = None
    try:
        analysis_id = fetch_one(
            "INSERT INTO analysis_results (session_id, image_id, crop_id, pest_name_detected, cause_summary, "
            "solution_summary, severity, recommended_pesticides, additional_tips) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s) RETURNING id",
            (
                session_id, img_id, crop_id,
                ai.get("pest_detected"), ai.get("causes"), ai.get("organic_alternative"),
                ai.get("severity"), json.dumps(ai.get("pesticides", [])), ai.get("prevention_tips"),
            ),
        )["id"]
    except Exception as e:
        print(f"[db analysis_results] {e}")

    # Save chat summary
    if session_id:
        try:
            loc_line  = f"\n📍 {location_str}" if location_str else ""
            pest_list = "\n".join(f"• {p.get('brand', p['name'])} — {p.get('dosage', '')}" for p in ai.get("pesticides", [])[:3])
            content = (
                f"🔍 {ai.get('pest_detected','Unknown')} detected{loc_line}\n"
                f"⚠️ Severity: {(ai.get('severity') or '').upper()}\n\n"
                f"Cause: {ai.get('causes','—')}\n\n"
                f"Treatment:\n{pest_list or '• No pesticide needed'}\n\n"
                f"Prevention: {ai.get('prevention_tips','—')}"
            )
            execute(
                "INSERT INTO chat_messages (session_id, role, content) VALUES (%s, 'assistant', %s)",
                (session_id, content),
            )
        except Exception as e:
            print(f"[db chat_messages] {e}")

    return jsonify({"image_url": public_url, "analysis_id": analysis_id, "result": ai, "location_stats": location_stats}), 200
