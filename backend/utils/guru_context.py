from utils.astrology_rules import get_zodiac_sign
from datetime import datetime
from routers.horoscope import load_cache as load_horoscope_cache
import time

def get_todays_advice(zodiac: str, lang: str, relation: str = "Myself") -> str:
    """Fetch the cached daily horoscope and extract a short snippet for advice."""
    try:
        current_date_str = time.strftime("%Y-%m-%d")
        seed_str = f"{zodiac}-{current_date_str}-{lang}-{relation}"
        cache = load_horoscope_cache()
        if seed_str in cache and "summary" in cache[seed_str]:
            summary = cache[seed_str]["summary"]
            # Extract just the first sentence or first 100 chars to save tokens
            snippet = summary.split('.')[0] + "."
            if len(snippet) > 150:
                snippet = summary[:150] + "..."
            return snippet
    except:
        pass
    return "The stars are observing you."

def build_guru_context(name: str, dob: str, lang: str = "en", mood: str = "General Inquiry") -> str:
    """
    Builds a minimal, highly token-efficient context for the AI Guru.
    """
    zodiac = "Unknown"
    if dob:
        try:
            birth_date = datetime.strptime(dob, "%Y-%m-%d")
            zodiac = get_zodiac_sign(birth_date.day, birth_date.month)
        except Exception:
            pass

    advice = get_todays_advice(zodiac, lang)

    return f"""[USER CONTEXT]
Name: {name}
Zodiac: {zodiac}
Mood: {mood}
Today's Advice: {advice}
[/USER CONTEXT]"""
