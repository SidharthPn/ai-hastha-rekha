from datetime import datetime

ZODIAC_DATA = {
    "Aries": {"element": "Fire", "planet": "Mars", "number": 9, "color": "Red", "start": (3, 21), "end": (4, 19), "ml": "മേടം", "ml_element": "അഗ്നി", "ml_planet": "ചൊവ്വ", "ml_color": "ചുവപ്പ്"},
    "Taurus": {"element": "Earth", "planet": "Venus", "number": 6, "color": "Green", "start": (4, 20), "end": (5, 20), "ml": "ഇടവം", "ml_element": "ഭൂമി", "ml_planet": "ശുക്രൻ", "ml_color": "പച്ച"},
    "Gemini": {"element": "Air", "planet": "Mercury", "number": 5, "color": "Yellow", "start": (5, 21), "end": (6, 20), "ml": "മിഥുനം", "ml_element": "വായു", "ml_planet": "ബുധൻ", "ml_color": "മഞ്ഞ"},
    "Cancer": {"element": "Water", "planet": "Moon", "number": 2, "color": "Silver", "start": (6, 21), "end": (7, 22), "ml": "കർക്കടകം", "ml_element": "ജലം", "ml_planet": "ചന്ദ്രൻ", "ml_color": "വെള്ളി"},
    "Leo": {"element": "Fire", "planet": "Sun", "number": 1, "color": "Gold", "start": (7, 23), "end": (8, 22), "ml": "ചിങ്ങം", "ml_element": "അഗ്നി", "ml_planet": "സൂര്യൻ", "ml_color": "സ്വർണ്ണം"},
    "Virgo": {"element": "Earth", "planet": "Mercury", "number": 5, "color": "Brown", "start": (8, 23), "end": (9, 22), "ml": "കന്നി", "ml_element": "ഭൂമി", "ml_planet": "ബുധൻ", "ml_color": "തവിട്ടുനിറം"},
    "Libra": {"element": "Air", "planet": "Venus", "number": 6, "color": "Pink", "start": (9, 23), "end": (10, 22), "ml": "തുലാം", "ml_element": "വായു", "ml_planet": "ശുക്രൻ", "ml_color": "പിങ്ക്"},
    "Scorpio": {"element": "Water", "planet": "Pluto/Mars", "number": 9, "color": "Black", "start": (10, 23), "end": (11, 21), "ml": "വൃശ്ചികം", "ml_element": "ജലം", "ml_planet": "ചൊവ്വ", "ml_color": "കറുപ്പ്"},
    "Sagittarius": {"element": "Fire", "planet": "Jupiter", "number": 3, "color": "Purple", "start": (11, 22), "end": (12, 21), "ml": "ധനു", "ml_element": "അഗ്നി", "ml_planet": "വ്യാഴം", "ml_color": "പർപ്പിൾ"},
    "Capricorn": {"element": "Earth", "planet": "Saturn", "number": 8, "color": "Brown", "start": (12, 22), "end": (1, 19), "ml": "മകരം", "ml_element": "ഭൂമി", "ml_planet": "ശനി", "ml_color": "തവിട്ടുനിറം"},
    "Aquarius": {"element": "Air", "planet": "Uranus/Saturn", "number": 4, "color": "Blue", "start": (1, 20), "end": (2, 18), "ml": "കുംഭം", "ml_element": "വായു", "ml_planet": "ശനി", "ml_color": "നീല"},
    "Pisces": {"element": "Water", "planet": "Neptune/Jupiter", "number": 7, "color": "Sea Green", "start": (2, 19), "end": (3, 20), "ml": "മീനം", "ml_element": "ജലം", "ml_planet": "വ്യാഴം", "ml_color": "കടൽ പച്ച"},
}

def get_zodiac_sign(day: int, month: int) -> str:
    for sign, data in ZODIAC_DATA.items():
        start_m, start_d = data["start"]
        end_m, end_d = data["end"]
        if (month == start_m and day >= start_d) or (month == end_m and day <= end_d):
            return sign
    return "Capricorn"  # Fallback for overlapping boundary

# The Rule Engine base lists
CAREER_RULES = [
    "A challenging task requires your full focus today.",
    "Opportunities for advancement are forming around you.",
    "Your creativity will impress your superiors today.",
    "A collaborative project brings unexpected success.",
    "Stay organized to handle today's heavy workload.",
    "A new contact could lead to an exciting venture.",
    "Your hard work will finally be recognized.",
    "Trust your instincts when making career decisions.",
    "Communication is key to resolving workplace conflicts.",
    "Take time to learn a new skill related to your job.",
    "A leadership role may soon be offered to you.",
    "Stay adaptable to sudden changes in your schedule."
]

LOVE_RULES = [
    "A deep conversation strengthens your relationship.",
    "Surprise someone special with a thoughtful gesture.",
    "An unexpected encounter sparks a new connection.",
    "Patience is needed to resolve a misunderstanding.",
    "Your charm and charisma are highly magnetic today.",
    "Focus on loving yourself before seeking it elsewhere.",
    "A past connection may reach out to you.",
    "Plan a cozy evening to reconnect with your partner.",
    "Honesty will bring you closer to someone you care about.",
    "Let go of past grievances to move forward.",
    "Your emotional intuition is exceptionally strong.",
    "A shared adventure brings immense joy."
]

HEALTH_RULES = [
    "Prioritize getting extra rest tonight.",
    "A brisk walk outdoors will clear your mind.",
    "Stay hydrated and nourish your body with wholesome foods.",
    "Incorporate light stretching into your daily routine.",
    "Focus on deep breathing to relieve stress.",
    "Your energy levels are high, channel them productively.",
    "Take a break from screens to rest your eyes.",
    "A good laugh will be the best medicine today.",
    "Listen to your body and avoid overexertion.",
    "Try a new healthy recipe for dinner.",
    "Mental clarity returns after a period of fog.",
    "A calming evening routine will improve your sleep."
]

FINANCE_RULES = [
    "A cautious approach to spending is advised today.",
    "An unexpected small gain is on the horizon.",
    "Review your budget to find hidden savings.",
    "Avoid impulsive purchases, focus on long-term goals.",
    "Your financial intuition is sharp, trust it.",
    "A lucrative opportunity may present itself.",
    "Consider seeking advice for a complex financial decision.",
    "Hard work begins to translate into financial stability.",
    "Organize your financial documents for peace of mind.",
    "A past investment may start showing positive returns.",
    "Be generous, but stay within your means.",
    "A creative idea could lead to a side income."
]
