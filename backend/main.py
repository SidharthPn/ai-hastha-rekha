from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import os, io, base64, re, traceback, time, json, hashlib
import requests, urllib.parse
from dotenv import load_dotenv
from PIL import Image, ImageEnhance, ImageOps
import google.generativeai as genai
from groq import Groq
from palm_templates_v2 import (
    build_malayalam,
    build_english_prompt,
    PALMISTRY_KNOWLEDGE,
)

load_dotenv()
os.environ["CHROMA_TELEMETRY"] = "false"
os.environ["ANONYMIZED_TELEMETRY"] = "false"

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY","").strip().replace('"','').replace("'","")
GROQ_API_KEY   = os.getenv("GROQ_API_KEY","").strip().replace('"','').replace("'","")
if GOOGLE_API_KEY: genai.configure(api_key=GOOGLE_API_KEY)

groq_client = None
if GROQ_API_KEY:
    try: groq_client = Groq(api_key=GROQ_API_KEY)
    except Exception as e: print(f"Groq init: {e}")

# FIX 1: EN_SYS kept here (was deleted along with old template code)
EN_SYS = "Warm Kerala palmist elder. English only. Never clinical. Always encouraging."

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

# ── LLM CALLER with smart rate-limit wait ─────────────────────
def call_llm(prompt, system, max_tokens=500, temp=0.7):
    result = ""
    if groq_client and GROQ_API_KEY:
        for model in ["llama-3.3-70b-versatile","llama-3.1-8b-instant"]:
            try:
                r = groq_client.chat.completions.create(
                    model=model, max_tokens=max_tokens, temperature=temp,
                    messages=[{"role":"system","content":system},{"role":"user","content":prompt}]
                )
                result = r.choices[0].message.content.strip()
                if result: break
            except Exception as e:
                err = str(e)
                if "rate_limit" in err.lower():
                    m = re.search(r'try again in (\d+)m(\d+)', err)
                    wait = (int(m.group(1))*60 + int(m.group(2))) if m else 10
                    print(f"Rate limit — waiting {min(wait,30)}s")
                    time.sleep(min(wait, 30))
                else:
                    print(f"Groq {model}: {e}")
    if not result and GOOGLE_API_KEY:
        try:
            m = genai.GenerativeModel('gemini-1.5-flash')
            result = m.generate_content(f"{system}\n\n{prompt}").text.strip()
        except Exception as e: print(f"Gemini: {e}")
    return result

# ── ROUTES ─────────────────────────────────────────────────────
@app.get("/")
def read_root():
    return {"message":"AI Hastha Rekha API running"}

@app.post("/detect-hand")
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

@app.post("/analyze-palm")
async def analyze_palm(file: UploadFile = File(...)):
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
        if GOOGLE_API_KEY:
            try:
                raw = genai.GenerativeModel('gemini-1.5-flash').generate_content(
                    [enhanced_rgb, VISION_JSON_PROMPT]).text.strip()
                raw = re.sub(r'^```(?:json)?\s*','',raw); raw = re.sub(r'\s*```$','',raw)
                slots = json.loads(raw)
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

        reading_en = call_llm(build_english_prompt(slots), EN_SYS, max_tokens=900, temp=0.72)
        if not reading_en:
            raise Exception("Failed to generate English reading.")
        reading_en = re.sub(r'[\u0d00-\u0d7f]+','',reading_en).strip()

        seed = str(slots.get("hand_type","e")) + str(slots.get("life","d"))
        reading_ml = build_malayalam(slots, seed)
        # FIX 2: confidence footer is now inside build_malayalam — no duplicate here
        # (palm_templates_v2 already appends "വിശ്വാസ്യതാ നില: ...")

        if os.path.exists(temp_path): os.remove(temp_path)

        total = 400 + 500
        print(f"[TOKENS] ~{total} total (vision~400 + english~500 + malayalam=0)")

        return {
            "status":"success",
            "palm_analysis": str(slots),
            "reading": f"{reading_en}\n\n===MALAYALAM_READING_SPLIT===\n\n{reading_ml}",
            "scanned_image": f"data:image/jpeg;base64,{scanned_b64}"
        }
    except Exception as e:
        traceback.print_exc()
        if os.path.exists(temp_path): os.remove(temp_path)
        return {"status":"error","message":str(e)}

@app.get("/tts")
def text_to_speech(text: str, lang: str = "ml"):
    try:
        clean = text.replace('###','').replace('\n','... ').replace('.','. ')
        encoded = urllib.parse.quote(clean)
        url = f"https://translate.google.com/translate_tts?ie=UTF-8&q={encoded}&tl={lang}&client=tw-ob"
        res = requests.get(url, headers={"User-Agent":"Mozilla/5.0"}, stream=True)
        if res.status_code != 200: raise Exception(f"TTS {res.status_code}")
        def iterfile():
            for chunk in res.iter_content(chunk_size=1024): yield chunk
        return StreamingResponse(iterfile(), media_type="audio/mpeg")
    except Exception as e:
        return {"status":"error","message":str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)