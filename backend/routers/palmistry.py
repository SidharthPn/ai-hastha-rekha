from fastapi import APIRouter, File, UploadFile, Form
import os, io, base64, re, json, traceback
from PIL import Image, ImageEnhance, ImageOps
from datetime import datetime

from utils.llm import call_llm, add_tokens, GOOGLE_API_KEY, GROQ_API_KEY, groq_client, genai
from palm_templates_v2 import build_advanced_palmistry_prompt

router = APIRouter()

VISION_JSON_PROMPT = """Examine this palm image. Output ONLY valid JSON, no other text:
{
  "hand_type": "earth|air|fire|water",
  "thumb": "long|short|flexible|stiff",
  "fingers": "wide|close|long|short",
  "life": "deep|faint|broken|wide-arc|close-thumb|branching",
  "life_meaning": "vitality|adventurous|cautious|transformation|rising",
  "heart": "curved|straight|chained|forked|deep",
  "heart_meaning": "deep-love|warm|practical|loyal|balanced",
  "love_style": "openly|deeply|quietly|loyally|practically",
  "head": "straight|curved|drooping|forked|long|short",
  "head_meaning": "logical|creative|analytical|practical|quick|focused",
  "fate": "strong|faint|absent|broken",
  "sun": "present|absent",
  "mount": "venus|jupiter|saturn|moon|mercury|none",
  "marriage": "one|multiple|absent",
  "confidence": "high|medium|low"
}
Use "none" if unclear. Confidence = image clarity."""

@router.post("/detect-hand")
async def detect_hand(file: UploadFile = File(...)):
    try:
        data = await file.read()
        image = Image.open(io.BytesIO(data))
        if image.mode != "RGB": image = image.convert("RGB")
        dp = "Is this Left or Right hand? Reply: Hand Type: Left Hand OR Hand Type: Right Hand OR Hand Type: Undetermined"
        detected = "undetermined"
        if GOOGLE_API_KEY:
            try:
                t = genai.GenerativeModel('gemini-1.5-flash').generate_content([image, dp]).text
                if "Left Hand" in t: detected = "left"
                elif "Right Hand" in t: detected = "right"
            except: pass
        if detected == "undetermined" and GROQ_API_KEY and groq_client:
            buf = io.BytesIO(); image.save(buf, format="JPEG")
            b64 = base64.b64encode(buf.getvalue()).decode()
            try:
                t = groq_client.chat.completions.create(
                    model="meta-llama/llama-4-scout-17b-16e-instruct", max_tokens=15,
                    messages=[{"role":"user","content":[
                        {"type":"text","text":dp},
                        {"type":"image_url","image_url":{"url":f"data:image/jpeg;base64,{b64}"}}
                    ]}]).choices[0].message.content
                if "Left Hand" in t: detected = "left"
                elif "Right Hand" in t: detected = "right"
            except: pass
        return {"status":"success","detected_hand":detected}
    except Exception as e:
        return {"status":"error","message":str(e)}

@router.post("/analyze-palm")
async def analyze_palm(file: UploadFile = File(...), lang: str = Form("en"), dob: str = Form(None), dominance: str = Form("right")):
    temp_path = "temp_palm.jpg"
    try:
        if not GOOGLE_API_KEY and not GROQ_API_KEY:
            return {"status":"error","message":"No API keys configured."}

        data = await file.read()
        image = Image.open(io.BytesIO(data))
        if image.mode != "RGB": image = image.convert("RGB")
        gray = ImageOps.grayscale(image)
        enhanced = ImageEnhance.Sharpness(ImageEnhance.Contrast(gray).enhance(2.5)).enhance(2.0)
        enhanced_rgb = enhanced.convert("RGB")
        enhanced_rgb.save(temp_path)
        buf = io.BytesIO(); enhanced.save(buf, format="JPEG")
        scanned_b64 = base64.b64encode(buf.getvalue()).decode()

        slots = {}
        tokens_used = 0
        if GOOGLE_API_KEY:
            try:
                raw = genai.GenerativeModel('gemini-1.5-flash').generate_content(
                    [enhanced_rgb, VISION_JSON_PROMPT]).text.strip()
                raw = re.sub(r'^```(?:json)?\s*','',raw); raw = re.sub(r'\s*```$','',raw)
                slots = json.loads(raw)
                tokens_used += len(raw.split()) * 2
                print(f"[VISION JSON OK] slots={list(slots.keys())}")
            except Exception as e:
                print(f"Gemini vision JSON: {e}")

        if not slots and GROQ_API_KEY and groq_client:
            try:
                buf2 = io.BytesIO(); enhanced.save(buf2, format="JPEG")
                b64_small = base64.b64encode(buf2.getvalue()).decode()
                raw = groq_client.chat.completions.create(
                    model="meta-llama/llama-4-scout-17b-16e-instruct", max_tokens=300,
                    messages=[{"role":"user","content":[
                        {"type":"text","text":VISION_JSON_PROMPT},
                        {"type":"image_url","image_url":{"url":f"data:image/jpeg;base64,{b64_small}"}}
                    ]}]).choices[0].message.content.strip()
                raw = re.sub(r'^```(?:json)?\s*','',raw); raw = re.sub(r'\s*```$','',raw)
                slots = json.loads(raw)
            except Exception as e:
                print(f"Groq vision JSON: {e}")

        if not slots:
            slots = {"hand_type":"earth","thumb":"flexible","fingers":"wide",
                     "life":"deep","life_meaning":"vitality","heart":"curved",
                     "heart_meaning":"deep-love","love_style":"deeply","head":"straight",
                     "head_meaning":"logical","fate":"present","sun":"present",
                     "mount":"venus","marriage":"one","confidence":"medium"}

        # ── NATIVE ASTRO MATH ──
        astro_data = {}
        if dob:
            try:
                d = datetime.strptime(dob, "%Y-%m-%d")
                age = datetime.now().year - d.year - ((datetime.now().month, datetime.now().day) < (d.month, d.day))
                astro_data["age"] = str(age)
                
                m, day = d.month, d.day
                if (m==3 and day>=21) or (m==4 and day<=19): z, el = "Aries", "Fire"
                elif (m==4 and day>=20) or (m==5 and day<=20): z, el = "Taurus", "Earth"
                elif (m==5 and day>=21) or (m==6 and day<=20): z, el = "Gemini", "Air"
                elif (m==6 and day>=21) or (m==7 and day<=22): z, el = "Cancer", "Water"
                elif (m==7 and day>=23) or (m==8 and day<=22): z, el = "Leo", "Fire"
                elif (m==8 and day>=23) or (m==9 and day<=22): z, el = "Virgo", "Earth"
                elif (m==9 and day>=23) or (m==10 and day<=22): z, el = "Libra", "Air"
                elif (m==10 and day>=23) or (m==11 and day<=21): z, el = "Scorpio", "Water"
                elif (m==11 and day>=22) or (m==12 and day<=21): z, el = "Sagittarius", "Fire"
                elif (m==12 and day>=22) or (m==1 and day<=19): z, el = "Capricorn", "Earth"
                elif (m==1 and day>=20) or (m==2 and day<=18): z, el = "Aquarius", "Air"
                else: z, el = "Pisces", "Water"
                astro_data["zodiac_sign"] = z
                astro_data["element"] = el
                
                digits = [int(x) for x in dob.replace("-", "")]
                lp = sum(digits)
                while lp > 9 and lp not in [11, 22, 33]:
                    lp = sum(int(x) for x in str(lp))
                astro_data["life_path_number"] = str(lp)
            except Exception as e:
                print(f"Astro calc error: {e}")

        # ── GENERATE JSON READING ──
        prompt = build_advanced_palmistry_prompt(slots, astro_data, dominance, lang)
        
        raw_json = call_llm(prompt, "You are a specialized Astro-Palmistry JSON generator. Return only valid JSON.", max_tokens=4500, temp=0.72, json_mode=True)
        if not raw_json:
            raise Exception("Failed to generate reading. The AI might be overloaded.")
            
        raw_json = re.sub(r'^```(?:json)?\s*','',raw_json).strip()
        raw_json = re.sub(r'\s*```$','',raw_json).strip()
        
        try:
            json.loads(raw_json)
        except json.JSONDecodeError:
            raise Exception("The AI generated a reading that was too long and got cut off. Please try again.")
        
        tokens_used += len(raw_json.split()) * 2
        
        total_tokens = add_tokens(tokens_used)
        print("\n" + "="*50)
        print(f"🔮 [PALMISTRY TOKENS]")
        print(f"   Tokens for this reading: ~{tokens_used}")
        print(f"   Model used: Groq / Gemini Hybrid")
        print(f"🌟 TOTAL APP TOKENS SPENT: ~{total_tokens}")
        print("="*50 + "\n")

        if os.path.exists(temp_path): os.remove(temp_path)

        return {
            "status": "success",
            "palm_analysis": str(slots),
            "reading": raw_json,
            "scanned_image": f"data:image/jpeg;base64,{scanned_b64}",
            "tokens_used": tokens_used
        }
    except Exception as e:
        traceback.print_exc()
        if os.path.exists(temp_path): os.remove(temp_path)
        return {"status":"error","message":str(e)}
