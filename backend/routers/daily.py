import os
import hashlib
import json
import re
import time
from fastapi import APIRouter, Query
from utils.llm import call_llm, add_tokens
from utils.astrology_rules import get_zodiac_sign
from datetime import datetime

router = APIRouter()

CACHE_DIR = "data"
CACHE_FILE = os.path.join(CACHE_DIR, "dashboard_cache.json")

def load_cache():
    try:
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return {}

def save_cache(data):
    try:
        os.makedirs(CACHE_DIR, exist_ok=True)
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error saving cache: {e}")

def build_dashboard_prompt(zodiac: str) -> str:
    zodiac_context = f" The user's zodiac sign is {zodiac}." if zodiac != "General" else ""

    return f"""You are a mystical astrologer and life guide. Generate a daily personalized astrology dashboard.{zodiac_context}
Generate the text content simultaneously in BOTH English ("en") and proper Malayalam script ("ml").

Return ONLY valid JSON matching exactly this structure, with no markdown, no other text:
{{
  "energy_score": 82,
  "ratings": {{
    "career": 8,
    "finance": 7,
    "love": 6,
    "health": 9,
    "family": 8
  }},
  "lucky_number": 7,
  "en": {{
    "energy_explanation": "Short sentence explaining the energy score today.",
    "lucky_color": "A color name",
    "lucky_direction": "A compass direction",
    "lucky_time": "A specific time, e.g., 06:30 PM",
    "guru_insight": "A personalized AI insight (30-50 words) based on planetary energies.",
    "do_activities": ["Activity 1", "Activity 2", "Activity 3"],
    "avoid_activities": ["Activity 1", "Activity 2", "Activity 3"],
    "focus": "A short, engaging sentence on what to focus on today.",
    "reflection": "A thoughtful question to reflect on.",
    "motivation": "A powerful, personalized motivational quote.",
    "nakshatra": "A Nakshatra name appropriate for today's astrological weather",
    "moon_phase": "Current Moon Phase",
    "planetary_influence": "Dominant Planet today",
    "mantra": "A recommended spiritual mantra",
    "affirmation": "A positive affirmation for today",
    "best_activities": ["Activity 1", "Activity 2", "Activity 3"]
  }},
  "ml": {{
    "energy_explanation": "[Malayalam translation of energy_explanation]",
    "lucky_color": "[Malayalam translation of lucky_color]",
    "lucky_direction": "[Malayalam translation of lucky_direction]",
    "lucky_time": "[Malayalam translation of lucky_time]",
    "guru_insight": "[Malayalam translation of guru_insight]",
    "do_activities": ["[Malayalam Activity 1]", "[Malayalam Activity 2]", "[Malayalam Activity 3]"],
    "avoid_activities": ["[Malayalam Activity 1]", "[Malayalam Activity 2]", "[Malayalam Activity 3]"],
    "focus": "[Malayalam translation of focus]",
    "reflection": "[Malayalam translation of reflection]",
    "motivation": "[Malayalam translation of motivation]",
    "nakshatra": "[Malayalam translation of nakshatra]",
    "moon_phase": "[Malayalam translation of moon_phase]",
    "planetary_influence": "[Malayalam translation of planetary_influence]",
    "mantra": "[Malayalam translation of mantra]",
    "affirmation": "[Malayalam translation of affirmation]",
    "best_activities": ["[Malayalam Activity 1]", "[Malayalam Activity 2]", "[Malayalam Activity 3]"]
  }}
}}
Make the content feel highly personalized, mystical, and engaging. DO NOT wrap the output in markdown blocks.
CRITICAL: Ensure you complete all sentences. Do NOT cut off the text mid-sentence.
CRITICAL: All keys must match exactly.
"""

@router.get("/daily-dashboard")
async def get_daily_dashboard(lang: str = "en", dob: str = None):
    try:
        today = time.strftime("%Y-%m-%d")
        
        zodiac = "General"
        if dob:
            try:
                birth_date = datetime.strptime(dob, "%Y-%m-%d")
                zodiac = get_zodiac_sign(birth_date.day, birth_date.month)
            except Exception:
                pass
                
        cache_key = f"{zodiac}-{today}"
        cache = load_cache()
        if cache_key in cache:
            bilingual_data = cache[cache_key]
            dashboard_data = {
                "energy_score": bilingual_data.get("energy_score", 80),
                "lucky_number": bilingual_data.get("lucky_number", 7),
                "ratings": bilingual_data.get("ratings", {"career": 8, "finance": 7, "love": 7, "health": 8, "family": 8})
            }
            lang_content = bilingual_data.get(lang, bilingual_data.get("en", {}))
            dashboard_data.update(lang_content)
            dashboard_data["tokens_used"] = bilingual_data.get("tokens_used", 0)
            return {"status": "success", "dashboard": dashboard_data, "cached": True}

        prompt = f"Today's date is {today}. Generate today's personalized dashboard in BOTH English and Malayalam."
        system_prompt = build_dashboard_prompt(zodiac)
        
        raw_response = call_llm(prompt, system_prompt, max_tokens=2500, temp=0.8)
        
        clean_json = re.sub(r'^```(?:json)?\s*', '', raw_response.strip())
        clean_json = re.sub(r'\s*```$', '', clean_json)
        
        try:
            bilingual_data = json.loads(clean_json)
            tokens_used = len(raw_response.split()) * 2
            add_tokens(tokens_used)
            bilingual_data["tokens_used"] = tokens_used
            
            # Store in cache
            cache[cache_key] = bilingual_data
            save_cache(cache)
            
            dashboard_data = {
                "energy_score": bilingual_data.get("energy_score", 80),
                "lucky_number": bilingual_data.get("lucky_number", 7),
                "ratings": bilingual_data.get("ratings", {"career": 8, "finance": 7, "love": 7, "health": 8, "family": 8})
            }
            lang_content = bilingual_data.get(lang, bilingual_data.get("en", {}))
            dashboard_data.update(lang_content)
            dashboard_data["tokens_used"] = tokens_used
            
            return {"status": "success", "dashboard": dashboard_data, "cached": False}
        except Exception as e:
            if lang == "ml":
                fallback = {
                    "energy_score": 85,
                    "energy_explanation": "ഇന്ന് ആശയവിനിമയത്തിനും ആസൂത്രണത്തിനും മികച്ച ദിവസമാണ്.",
                    "ratings": {"career": 8, "finance": 7, "love": 7, "health": 8, "family": 9},
                    "lucky_color": "സ്വർണ്ണമഞ്ഞ",
                    "lucky_number": 9,
                    "lucky_direction": "വടക്ക് കിഴക്ക്",
                    "lucky_time": "അതിരാവിലെ",
                    "guru_insight": "ഗ്രഹങ്ങളുടെ സ്വാധീനം ഇന്ന് നിങ്ങൾക്ക് പുതിയ അറിവുകൾ നേടാൻ സഹായകമാണ്. പ്രധാനപ്പെട്ട കാര്യങ്ങൾ മാറ്റിവെക്കാതിരിക്കുക.",
                    "do_activities": ["പഠനം", "പുതിയ കാര്യങ്ങൾ തുടങ്ങുക", "പ്രാർത്ഥന"],
                    "avoid_activities": ["തർക്കങ്ങൾ", "അനാവശ്യ ചെലവുകൾ", "കോപം"],
                    "focus": "പുതിയ അവസരങ്ങളെ സന്തോഷത്തോടെ സ്വീകരിക്കുക.",
                    "reflection": "ഇന്ന് നിങ്ങൾക്ക് ഏറ്റവും കൂടുതൽ സമാധാനം ലഭിച്ചത് എന്തിൽ നിന്നാണ്?",
                    "motivation": "നിങ്ങൾ പ്രപഞ്ചത്തിൽ വിശ്വസിച്ചാൽ നിങ്ങളുടെ കഴിവുകൾക്ക് അതിരുകളില്ല.",
                    "nakshatra": "രോഹിണി",
                    "moon_phase": "വളർപ്പിറയുന്ന ചന്ദ്രൻ",
                    "planetary_influence": "ബുധൻ",
                    "mantra": "ഓം ഗം ഗണപതയേ നമഹ",
                    "affirmation": "എന്റെ ജീവിതത്തിലേക്ക് ഞാൻ വിജയവും സമാധാനവും സ്വീകരിക്കുന്നു.",
                    "best_activities": ["ധ്യാനം", "വായന", "യാത്ര"],
                    "tokens_used": 0
                }
            else:
                fallback = {
                    "energy_score": 85,
                    "energy_explanation": "Today favors communication, planning, and steady progress.",
                    "ratings": {"career": 8, "finance": 7, "love": 7, "health": 8, "family": 9},
                    "lucky_color": "Golden Yellow",
                    "lucky_number": 9,
                    "lucky_direction": "North-East",
                    "lucky_time": "Early Morning",
                    "guru_insight": "The planetary energies today favor learning and communication. Avoid delaying important tasks and trust your instincts during important conversations.",
                    "do_activities": ["Learning", "Job Applications", "Networking"],
                    "avoid_activities": ["Arguments", "Impulsive Spending", "Emotional Decisions"],
                    "focus": "Embrace the new opportunities coming your way.",
                    "reflection": "What small moment brought you peace today?",
                    "motivation": "Your potential is endless when you trust the universe's timing.",
                    "nakshatra": "Rohini",
                    "moon_phase": "Waxing Moon",
                    "planetary_influence": "Mercury",
                    "mantra": "Om Gam Ganapataye Namaha",
                    "affirmation": "I welcome growth, wisdom, and opportunity into my life.",
                    "best_activities": ["Study", "Travel", "Meditation"],
                    "tokens_used": 0
                }
            return {"status": "success", "dashboard": fallback, "cached": False}
            
    except Exception as e:
        return {"status": "error", "message": str(e)}
