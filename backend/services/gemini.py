from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError
import json
import os
import google.generativeai as genai
from config import Config

genai.configure(api_key=Config.GEMINI_API_KEY)
MODEL_NAME = os.getenv("GEMINI_MODEL", "models/gemini-1.5-flash")
REQUEST_TIMEOUT_SECONDS = int(os.getenv("GEMINI_TIMEOUT_SECONDS", "8"))
model = genai.GenerativeModel(MODEL_NAME)


def safe_generate_content(contents):
    executor = ThreadPoolExecutor(max_workers=1)
    future = executor.submit(
        model.generate_content,
        contents,
        request_options={"timeout": REQUEST_TIMEOUT_SECONDS},
    )
    try:
        return future.result(timeout=REQUEST_TIMEOUT_SECONDS + 2)
    finally:
        future.cancel()
        executor.shutdown(wait=False, cancel_futures=True)

AP_PEST_KNOWLEDGE = {
    "Coconut":    ["Rhinoceros Beetle","Red Palm Weevil","Coconut Leaf Caterpillar","Coconut Eriophyid Mite","Coconut Bud Rot"],
    "Banana":     ["Panama Wilt","Banana Bunchy Top Virus","Sigatoka Leaf Spot","Banana Stem Weevil","Banana Aphid"],
    "Sugarcane":  ["Early Shoot Borer","Top Borer","Sugarcane Pyrilla","Sugarcane Red Rot","Sugarcane Grassy Shoot"],
    "Sunflower":  ["Sunflower Head Borer","Alternaria Blight","Sunflower Charcoal Rot"],
    "Tobacco":    ["Tobacco Caterpillar","Tobacco Aphid","Tobacco Mosaic Virus","Root Knot Nematode"],
    "Turmeric":   ["Turmeric Leaf Blotch","Rhizome Rot","Turmeric Shoot Borer"],
    "Chilli":     ["Chilli Thrips","Chilli Fruit Borer","Chilli Leaf Curl Virus","Chilli Powdery Mildew"],
    "Paddy":      ["Brown Plant Hopper","Rice Blast","Paddy Stem Borer","Paddy Gall Midge","Bacterial Leaf Blight"],
    "Groundnut":  ["Tikka Leaf Spot","Groundnut Bud Necrosis","White Grub"],
    "Cotton":     ["Pink Bollworm","Cotton Whitefly","Thrips on Cotton"],
    "Cashewnut":  ["Tea Mosquito Bug","Cashew Stem and Root Borer"],
    "Mango":      ["Mango Hopper","Mango Powdery Mildew","Anthracnose"],
}

AP_DISTRICT_CROPS = {
    "Guntur":               ["Chilli","Tobacco","Cotton","Paddy","Sugarcane"],
    "Krishna":              ["Sugarcane","Paddy","Coconut","Tobacco","Banana"],
    "West Godavari":        ["Coconut","Sugarcane","Paddy","Banana","Tobacco"],
    "East Godavari":        ["Coconut","Banana","Sugarcane","Cashewnut","Paddy"],
    "Kurnool":              ["Sunflower","Tobacco","Groundnut","Cotton","Banana"],
    "Anantapur":            ["Groundnut","Sunflower","Banana","Tomato","Paddy"],
    "Chittoor":             ["Sugarcane","Banana","Mango","Coconut","Tomato"],
    "Prakasam":             ["Tobacco","Sunflower","Sugarcane","Chilli","Cotton"],
    "Spsr Nellore":         ["Sugarcane","Tobacco","Paddy","Banana"],
    "Kadapa":               ["Sunflower","Banana","Turmeric","Cotton","Paddy"],
    "Srikakulam":           ["Coconut","Cashewnut","Sugarcane","Paddy","Banana"],
    "Vizianagaram":         ["Sugarcane","Banana","Coconut","Cashewnut","Paddy"],
    "Visakhapatanam":       ["Sugarcane","Coconut","Cashewnut","Black Pepper","Paddy"],
    "Alluri Sitharama Raju":["Black Pepper","Coconut","Paddy","Turmeric"],
    "Parvathipuram Manyam": ["Coconut","Paddy","Cashewnut","Turmeric"],
    "Kakinada":             ["Coconut","Paddy","Banana","Sugarcane"],
    "Konaseema":            ["Coconut","Paddy","Banana","Sugarcane"],
    "Eluru":                ["Coconut","Paddy","Sugarcane","Banana"],
    "Bapatla":              ["Coconut","Paddy","Groundnut","Chilli"],
    "Anakapalli":           ["Coconut","Sugarcane","Paddy","Cashewnut"],
    "Ntr":                  ["Sugarcane","Paddy","Coconut","Banana"],
    "Palnadu":              ["Paddy","Sugarcane","Cotton","Tobacco"],
    "Tirupati":             ["Coconut","Banana","Sugarcane","Mango"],
    "Annamayya":            ["Coconut","Banana","Paddy","Sugarcane"],
    "Sri Sathya Sai":       ["Coconut","Groundnut","Paddy","Banana"],
    "Nandyal":              ["Sunflower","Tobacco","Cotton","Groundnut"],
}

PEST_TYPE_MAP = {
    "Rhinoceros Beetle": "insect",
    "Red Palm Weevil": "insect",
    "Coconut Leaf Caterpillar": "insect",
    "Coconut Eriophyid Mite": "insect",
    "Coconut Bud Rot": "fungus",
    "Panama Wilt": "fungus",
    "Banana Bunchy Top Virus": "virus",
    "Sigatoka Leaf Spot": "fungus",
    "Banana Stem Weevil": "insect",
    "Banana Aphid": "insect",
    "Early Shoot Borer": "insect",
    "Top Borer": "insect",
    "Sugarcane Pyrilla": "insect",
    "Sugarcane Red Rot": "fungus",
    "Sugarcane Grassy Shoot": "virus",
    "Sunflower Head Borer": "insect",
    "Alternaria Blight": "fungus",
    "Sunflower Charcoal Rot": "fungus",
    "Tobacco Caterpillar": "insect",
    "Tobacco Aphid": "insect",
    "Tobacco Mosaic Virus": "virus",
    "Root Knot Nematode": "nematode",
    "Turmeric Leaf Blotch": "fungus",
    "Rhizome Rot": "fungus",
    "Turmeric Shoot Borer": "insect",
    "Chilli Thrips": "insect",
    "Chilli Fruit Borer": "insect",
    "Chilli Leaf Curl Virus": "virus",
    "Chilli Powdery Mildew": "fungus",
    "Brown Plant Hopper": "insect",
    "Rice Blast": "fungus",
    "Paddy Stem Borer": "insect",
    "Paddy Gall Midge": "insect",
    "Bacterial Leaf Blight": "bacteria",
    "Tikka Leaf Spot": "fungus",
    "Groundnut Bud Necrosis": "virus",
    "White Grub": "insect",
    "Pink Bollworm": "insect",
    "Cotton Whitefly": "insect",
    "Thrips on Cotton": "insect",
    "Tea Mosquito Bug": "insect",
    "Cashew Stem and Root Borer": "insect",
    "Mango Hopper": "insect",
    "Mango Powdery Mildew": "fungus",
    "Anthracnose": "fungus",
}

FALLBACK_TREATMENTS = {
    "fungus": {
        "name": "Mancozeb 75% WP",
        "brand": "Dithane M-45",
        "dosage": "2 g per litre",
        "application": "Spray on both sides of affected leaves",
        "safety_days": 7,
        "organic": "Neem oil spray at 3 ml per litre",
    },
    "insect": {
        "name": "Imidacloprid 17.8% SL",
        "brand": "Confidor",
        "dosage": "0.3 ml per litre",
        "application": "Target early infestation and leaf undersides",
        "safety_days": 5,
        "organic": "Neem seed kernel extract spray",
    },
    "virus": {
        "name": "Vector control spray",
        "brand": "Confidor",
        "dosage": "0.3 ml per litre",
        "application": "Control insect vectors and remove badly affected plants",
        "safety_days": 5,
        "organic": "Neem oil spray plus rogue infected plants",
    },
    "bacteria": {
        "name": "Copper oxychloride",
        "brand": "Blitox",
        "dosage": "2.5 g per litre",
        "application": "Spray uniformly over affected foliage",
        "safety_days": 7,
        "organic": "Avoid overhead irrigation and remove infected leaves",
    },
    "nematode": {
        "name": "Neem cake soil treatment",
        "brand": "Neem Cake",
        "dosage": "100 kg per acre",
        "application": "Apply near root zone and irrigate lightly",
        "safety_days": 0,
        "organic": "Neem cake with crop rotation",
    },
}

ANALYSIS_PROMPT = """You are an AP agricultural expert. Analyze this {crop_name} crop image.

District: {district}, Andhra Pradesh
Known pests for this crop in AP: {known_pests}
District's main crops: {district_crops}
District crop data: {location_stats}
Language: {language}

Respond ONLY in valid JSON, no markdown. All text fields MUST be in {language}:

{{
  "pest_detected": "name in {language}",
  "scientific_name": "name",
  "pest_type": "insect|fungus|bacteria|virus|nematode|none",
  "confidence": 85,
  "severity": "low|moderate|high|critical",
  "symptoms_observed": "brief - what is visible - in {language}",
  "causes": "1-2 sentences - why in {district} conditions - in {language}",
  "location_insight": "1 sentence specific to {district} - in {language}",
  "pesticides": [
    {{
      "name": "product name + concentration",
      "brand": "Indian brand eg. Confidor",
      "type": "chemical|organic|biological",
      "dosage": "Xml per litre",
      "application": "brief method",
      "safety_days": 14
    }}
  ],
  "organic_alternative": "1 option only - in {language}",
  "prevention_tips": "2-3 bullet points max - in {language}",
  "urgency": "Treat within X days - in {language}",
  "nearby_risk": "other AP crops at risk - in {language}"
}}"""

FIRST_CHAT_PROMPT = """You are CropGuard AI - an expert for Andhra Pradesh farmers.
Language preference: {language}
Crop: {crop} | District: {district} | Detected pest: {pest}

Rules:
- Answer CONCISELY - max 4-5 lines for simple questions
- NO repeated safety warnings - mention safety ONCE only at the end if critical
- NO markdown headers (#, ##) - use plain text or bullet points (•)
- Highlight the KEY solution first, then brief explanation
- Use farmer-friendly language in {language}
- For follow-up questions: answer ONLY what was asked, no full re-analysis
- For product questions: suggest Indian brands available in AP with dosage
- If question is simple (yes/no, how much, when): give direct answer in 1-2 lines

Question: {message}"""

FOLLOWUP_PROMPT = """You are CropGuard AI for AP farmers.
Language: {language}
Context: {crop} crop, {pest} detected, {district} district AP.
Previous conversation summary: {history_summary}

STRICT RULES:
- Answer ONLY what is asked in this follow-up
- MAX 3-4 lines
- NO safety warnings unless explicitly asked
- NO repeating previous diagnosis
- Direct answer first, brief reason second
- No markdown headers

Follow-up question: {message}"""


def build_fallback_analysis(crop_name, district="", location="", location_stats=None):
    known_pests = AP_PEST_KNOWLEDGE.get(crop_name, [])
    fallback_pest = known_pests[0] if known_pests else f"Common {crop_name} pest"
    pest_type = PEST_TYPE_MAP.get(fallback_pest, "fungus")
    treatment = FALLBACK_TREATMENTS[pest_type]
    district_name = district or "Andhra Pradesh"
    top_crop_note = ""
    if location_stats:
        top = list(location_stats.keys())[:3]
        if top:
            top_crop_note = f" Main crops in this district include {', '.join(top)}."

    return {
        "pest_detected": fallback_pest,
        "scientific_name": "",
        "pest_type": pest_type,
        "confidence": 56,
        "severity": "moderate",
        "symptoms_observed": "Image received, but live AI vision response was unavailable.",
        "causes": f"Exact identification could not be confirmed automatically. In {crop_name}, start by checking for common AP issues such as {fallback_pest}.",
        "location_insight": f"{district_name} conditions can increase crop stress and pest spread if affected plants are left untreated.{top_crop_note}".strip(),
        "pesticides": [{
            "name": treatment["name"],
            "brand": treatment["brand"],
            "type": "organic" if pest_type == "nematode" else ("chemical" if pest_type != "virus" else "chemical"),
            "dosage": treatment["dosage"],
            "application": treatment["application"],
            "safety_days": treatment["safety_days"],
        }],
        "organic_alternative": treatment["organic"],
        "prevention_tips": "• Remove badly affected leaves\n• Avoid overwatering and keep airflow open\n• Recheck the crop within 2 days",
        "urgency": "Inspect and treat within 2-3 days",
        "nearby_risk": f"Nearby {crop_name} plots may face similar pressure if symptoms are spreading.",
        "location_used": location or "Andhra Pradesh",
        "district_used": district_name,
        "fallback": True,
    }


def build_fallback_chat(message, context=None):
    ctx = context or {}
    crop = ctx.get("crop_name") or "your crop"
    pest = ctx.get("pest_name") or "the detected issue"
    district = ctx.get("district") or "your district"
    lower = message.lower()

    if "dosage" in lower or "how much" in lower or "spray" in lower:
        return f"For {crop} in {district}, start with the recommended label dose and spray in the cool hours of the day. If symptoms are spreading fast, repeat only as per label directions."
    if "organic" in lower:
        return f"For {crop}, start with neem-based spray, remove badly affected leaves, and monitor fresh growth over the next 2 to 3 days."
    if "spread" in lower or "other crops" in lower:
        return f"Yes, {pest} may spread if infected plants stay in the field. Isolate affected plants where possible and monitor nearby rows closely."
    return f"I could not reach the live AI service just now, but for {crop} in {district}, focus first on checking symptom spread, removing heavily affected parts, and starting treatment early for {pest}."


def analyze_crop_image(image_bytes, crop_name, mime_type="image/jpeg",
                       location="", district="", location_stats=None, language="English"):
    dist_display = district or "Andhra Pradesh"

    known_pests = AP_PEST_KNOWLEDGE.get(crop_name, [])
    for k, v in AP_PEST_KNOWLEDGE.items():
        if k.lower() in crop_name.lower():
            known_pests = v; break
    known_pests_str = ", ".join(known_pests) if known_pests else "general AP pests"

    district_crops = AP_DISTRICT_CROPS.get(dist_display, [])
    district_crops_str = ", ".join(district_crops) if district_crops else "mixed AP crops"

    stats_str = "No specific data."
    if location_stats:
        crop_lower = crop_name.lower()
        matching = {k: v for k, v in location_stats.items() if crop_lower in k.lower()}
        if matching:
            parts = [f"{k}: {v.get('total_area_hectare',0):.0f} ha, yield {v.get('max_yield',0):.1f} T/ha"
                     for k, v in matching.items()]
            stats_str = "; ".join(parts)
        elif location_stats:
            top = list(location_stats.items())[:3]
            stats_str = "District crops: " + ", ".join(f"{k}({v.get('total_area_hectare',0):.0f}ha)" for k, v in top)

    prompt = ANALYSIS_PROMPT.format(
        crop_name=crop_name, district=dist_display,
        known_pests=known_pests_str, district_crops=district_crops_str,
        location_stats=stats_str, language=language
    )

    try:
        response = safe_generate_content([prompt, {"mime_type": mime_type, "data": image_bytes}])
        raw = response.text.strip()
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"): raw = raw[4:]
        raw = raw.strip()
        result = json.loads(raw)
        result["location_used"] = location or "Andhra Pradesh"
        result["district_used"] = dist_display
        return {"success": True, "data": result}
    except json.JSONDecodeError:
        fallback = build_fallback_analysis(crop_name, district, location, location_stats)
        return {"success": True, "data": fallback, "warning": "AI parse error"}
    except FutureTimeoutError:
        fallback = build_fallback_analysis(crop_name, district, location, location_stats)
        return {"success": True, "data": fallback, "warning": "AI timeout"}
    except Exception as e:
        fallback = build_fallback_analysis(crop_name, district, location, location_stats)
        return {"success": True, "data": fallback, "warning": str(e)}


def chat_with_ai(message, context=None):
    """Context-aware concise AP farming assistant."""
    ctx = context or {}
    language    = ctx.get("language", "English")
    crop        = ctx.get("crop_name", "")
    pest        = ctx.get("pest_name", "")
    district    = ctx.get("district", "")
    is_followup = ctx.get("is_followup", False)
    history     = ctx.get("history_summary", "")

    if is_followup and (crop or pest):
        prompt = FOLLOWUP_PROMPT.format(
            language=language, crop=crop or "unknown", pest=pest or "unknown",
            district=district or "AP", history_summary=history or "pest detected",
            message=message
        )
    else:
        prompt = FIRST_CHAT_PROMPT.format(
            language=language, crop=crop or "AP crop", district=district or "AP",
            pest=pest or "unknown pest", message=message
        )

    try:
        response = safe_generate_content(prompt)
        return response.text
    except FutureTimeoutError:
        return build_fallback_chat(message, ctx)
    except Exception as e:
        print(f"[gemini chat] {e}")
        return build_fallback_chat(message, ctx)
