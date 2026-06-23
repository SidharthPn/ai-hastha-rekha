from fastapi import APIRouter, HTTPException, Query
from datetime import datetime
import json
import os
import hashlib
import random

from utils.astrology_rules import ZODIAC_DATA, get_zodiac_sign, CAREER_RULES, LOVE_RULES, HEALTH_RULES, FINANCE_RULES
from utils.llm import generate_horoscope_summary

router = APIRouter()

CACHE_DIR = "data"
CACHE_FILE = os.path.join(CACHE_DIR, "horoscope_cache.json")

# Ensure cache directory and file exist
os.makedirs(CACHE_DIR, exist_ok=True)
if not os.path.exists(CACHE_FILE):
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump({}, f)

def load_cache():
    try:
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return {}

def save_cache(data):
    try:
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error saving cache: {e}")

@router.get("/daily")
def get_daily_horoscope(dob: str = Query(..., description="Date of birth in YYYY-MM-DD format"), lang: str = "en", name: str = "User", relation: str = "Myself"):
    """
    Returns the daily horoscope based on DOB and relation.
    Implements a token-optimized deterministic rule engine with caching.
    """
    try:
        birth_date = datetime.strptime(dob, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid DOB format. Use YYYY-MM-DD.")

    current_date_obj = datetime.now()
    current_date_str = current_date_obj.strftime("%Y-%m-%d")

    # 1. Calculate Age
    age = current_date_obj.year - birth_date.year - ((current_date_obj.month, current_date_obj.day) < (birth_date.month, birth_date.day))

    # 2. Calculate Zodiac Sign
    zodiac = get_zodiac_sign(birth_date.day, birth_date.month)
    z_data = ZODIAC_DATA[zodiac]

    # 3. Generate Daily Seed and Check Cache
    seed_str = f"{zodiac}-{current_date_str}-{lang}-{relation}"
    cache = load_cache()

    if seed_str in cache:
        result = cache[seed_str]
        result["age"] = age
        return result

    seed_int = int(hashlib.md5(seed_str.encode('utf-8')).hexdigest(), 16)
    random.seed(seed_int)

    career_msg = random.choice(CAREER_RULES)
    love_msg = random.choice(LOVE_RULES)
    health_msg = random.choice(HEALTH_RULES)
    finance_msg = random.choice(FINANCE_RULES)

    summary = generate_horoscope_summary(
        zodiac=zodiac,
        element=z_data["element"],
        career=career_msg,
        love=love_msg,
        health=health_msg,
        finance=finance_msg,
        lang=lang,
        timeframe="daily",
        name=name,
        relation=relation
    )

    result = {
        "zodiac": zodiac,
        "zodiac_ml": z_data["ml"],
        "element": z_data["ml_element"] if lang == "ml" else z_data["element"],
        "planet": z_data["ml_planet"] if lang == "ml" else z_data["planet"],
        "lucky_number": z_data["number"],
        "lucky_color": z_data["ml_color"] if lang == "ml" else z_data["color"],
        "summary": summary,
        "date": current_date_str
    }

    cache[seed_str] = result
    save_cache(cache)

    # Inject age before returning (do not cache age)
    result_with_age = dict(result)
    result_with_age["age"] = age

    return result_with_age

@router.get("/weekly")
def get_weekly_horoscope(dob: str = Query(..., description="Date of birth in YYYY-MM-DD format"), lang: str = "en", name: str = "User", relation: str = "Myself"):
    try:
        birth_date = datetime.strptime(dob, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid DOB format. Use YYYY-MM-DD.")

    current_date_obj = datetime.now()
    year, week, _ = current_date_obj.isocalendar()
    week_str = f"{year}-W{week}"

    age = current_date_obj.year - birth_date.year - ((current_date_obj.month, current_date_obj.day) < (birth_date.month, birth_date.day))
    zodiac = get_zodiac_sign(birth_date.day, birth_date.month)
    z_data = ZODIAC_DATA[zodiac]

    seed_str = f"{zodiac}-{week_str}-{lang}-{relation}"
    cache = load_cache()

    if seed_str in cache:
        result = cache[seed_str]
        result["age"] = age
        return result

    seed_int = int(hashlib.md5(seed_str.encode('utf-8')).hexdigest(), 16)
    random.seed(seed_int)

    career_msg = random.choice(CAREER_RULES)
    love_msg = random.choice(LOVE_RULES)
    health_msg = random.choice(HEALTH_RULES)
    finance_msg = random.choice(FINANCE_RULES)

    summary = generate_horoscope_summary(
        zodiac=zodiac, element=z_data["element"], career=career_msg, love=love_msg,
        health=health_msg, finance=finance_msg, lang=lang, timeframe="weekly", name=name, relation=relation
    )

    result = {
        "zodiac": zodiac, "zodiac_ml": z_data["ml"],
        "element": z_data["ml_element"] if lang == "ml" else z_data["element"],
        "planet": z_data["ml_planet"] if lang == "ml" else z_data["planet"],
        "lucky_number": z_data["number"],
        "lucky_color": z_data["ml_color"] if lang == "ml" else z_data["color"],
        "summary": summary, "date": week_str
    }

    cache[seed_str] = result
    save_cache(cache)
    result_with_age = dict(result)
    result_with_age["age"] = age
    return result_with_age

@router.get("/monthly")
def get_monthly_horoscope(dob: str = Query(..., description="Date of birth in YYYY-MM-DD format"), lang: str = "en", name: str = "User", relation: str = "Myself"):
    try:
        birth_date = datetime.strptime(dob, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid DOB format. Use YYYY-MM-DD.")

    current_date_obj = datetime.now()
    month_str = current_date_obj.strftime("%Y-%m")

    age = current_date_obj.year - birth_date.year - ((current_date_obj.month, current_date_obj.day) < (birth_date.month, birth_date.day))
    zodiac = get_zodiac_sign(birth_date.day, birth_date.month)
    z_data = ZODIAC_DATA[zodiac]

    seed_str = f"{zodiac}-{month_str}-{lang}-{relation}"
    cache = load_cache()

    if seed_str in cache:
        result = cache[seed_str]
        result["age"] = age
        return result

    seed_int = int(hashlib.md5(seed_str.encode('utf-8')).hexdigest(), 16)
    random.seed(seed_int)

    career_msg = random.choice(CAREER_RULES)
    love_msg = random.choice(LOVE_RULES)
    health_msg = random.choice(HEALTH_RULES)
    finance_msg = random.choice(FINANCE_RULES)

    summary = generate_horoscope_summary(
        zodiac=zodiac, element=z_data["element"], career=career_msg, love=love_msg,
        health=health_msg, finance=finance_msg, lang=lang, timeframe="monthly", name=name, relation=relation
    )

    result = {
        "zodiac": zodiac, "zodiac_ml": z_data["ml"],
        "element": z_data["ml_element"] if lang == "ml" else z_data["element"],
        "planet": z_data["ml_planet"] if lang == "ml" else z_data["planet"],
        "lucky_number": z_data["number"],
        "lucky_color": z_data["ml_color"] if lang == "ml" else z_data["color"],
        "summary": summary, "date": month_str
    }

    cache[seed_str] = result
    save_cache(cache)
    result_with_age = dict(result)
    result_with_age["age"] = age
    return result_with_age
