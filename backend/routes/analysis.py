import uuid
import json
from flask import Blueprint, request, jsonify
from services.supabase_client import get_supabase
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


def fetch_location_stats(state: str, district: str) -> dict:
    if not state or not district:
        return {}
    try:
        sb  = get_supabase()
        res = sb.table("location_crop_data") \
                .select("crop_name,total_area_hectare,total_production,max_yield,data_records") \
                .eq("state", state).eq("district", district).execute()
        return {
            r["crop_name"]: {k: r[k] for k in ["total_area_hectare","total_production","max_yield","data_records"]}
            for r in res.data
        }
    except Exception as e:
        print(f"[location_stats] {e}")
        return {}


@analysis_bp.route("/locations", methods=["GET"])
def get_locations():
    try:
        sb  = get_supabase()
        res = sb.table("location_crop_data").select("state,district").order("state").execute()
        grouped = {}
        for row in res.data:
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
    session_id = request.form.get("session_id")
    crop_name  = request.form.get("crop_name", "Unknown crop").strip()
    state      = request.form.get("state",    "").strip()
    district   = request.form.get("district", "").strip()
    language   = request.form.get("language", "English").strip()
    mime_type  = ALLOWED_MIME[ext]
    sb         = None
    try:
        sb = get_supabase()
    except Exception as e:
        print(f"[supabase] {e}")

    # Upload to storage (non-fatal)
    public_url = ""
    try:
        if not sb:
            raise RuntimeError("Supabase unavailable")
        path = f"uploads/{uuid.uuid4()}.{ext}"
        sb.storage.from_(Config.SUPABASE_BUCKET).upload(path, image_bytes, file_options={"content-type": mime_type})
        public_url = sb.storage.from_(Config.SUPABASE_BUCKET).get_public_url(path)
    except Exception as e:
        print(f"[storage] {e}")

    # Save image record
    img_id = None
    try:
        if not sb:
            raise RuntimeError("Supabase unavailable")
        row = sb.table("crop_images").insert({
            "image_url":         public_url or "local",
            "original_filename": file.filename,
            "analysis_status":   "pending",
            **({"session_id": session_id} if session_id else {}),
            **({"crop_id": int(crop_id)} if crop_id else {}),
        }).execute().data[0]
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
            try: sb.table("crop_images").update({"analysis_status": "failed"}).eq("id", img_id).execute()
            except: pass
        return jsonify({"error": result.get("error", "Analysis failed")}), 500

    ai = result["data"]

    # Update image status
    if img_id:
        try: sb.table("crop_images").update({"analysis_status": "processed", "ai_confidence": ai.get("confidence")}).eq("id", img_id).execute()
        except: pass

    # Save analysis
    analysis_id = None
    try:
        if not sb:
            raise RuntimeError("Supabase unavailable")
        analysis_id = sb.table("analysis_results").insert({
            "session_id":             session_id,
            "image_id":               img_id,
            "crop_id":                int(crop_id) if crop_id else None,
            "pest_name_detected":     ai.get("pest_detected"),
            "cause_summary":          ai.get("causes"),
            "solution_summary":       ai.get("organic_alternative"),
            "severity":               ai.get("severity"),
            "recommended_pesticides": json.dumps(ai.get("pesticides", [])),
            "additional_tips":        ai.get("prevention_tips"),
        }).execute().data[0]["id"]
    except Exception as e:
        print(f"[db analysis_results] {e}")

    # Save chat summary
    if session_id:
        try:
            loc_line  = f"\n📍 {location_str}" if location_str else ""
            pest_list = "\n".join(f"• {p.get('brand', p['name'])} — {p.get('dosage', '')}" for p in ai.get("pesticides", [])[:3])
            sb.table("chat_messages").insert({
                "session_id": session_id, "role": "assistant",
                "content": (
                    f"🔍 {ai.get('pest_detected','Unknown')} detected{loc_line}\n"
                    f"⚠️ Severity: {(ai.get('severity') or '').upper()}\n\n"
                    f"Cause: {ai.get('causes','—')}\n\n"
                    f"Treatment:\n{pest_list or '• No pesticide needed'}\n\n"
                    f"Prevention: {ai.get('prevention_tips','—')}"
                ),
            }).execute()
        except Exception as e:
            print(f"[db chat_messages] {e}")

    return jsonify({"image_url": public_url, "analysis_id": analysis_id, "result": ai, "location_stats": location_stats}), 200
