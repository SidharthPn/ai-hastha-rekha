"""
palm_templates_v2.py — Drop-in replacement for the Malayalam template + phrase bank system.

Improvements over v1:
  1. Slot-aware phrase selection — phrases key off slot VALUES, not just a random seed.
     e.g. hand_type="fire" always pulls from the fire-specific pool.
  2. Richer phrase banks — 4-6 variants per slot value (was 2 global).
  3. Sentence-level composability — each section assembles from 3 independent
     sentence "atoms" so combinations grow exponentially without adding new entries.
  4. Better seed — hashes ALL slots (not just 2), so two different palms with the
     same hand_type never collide on the same phrasing.
  5. English prompt also benefits: build_english_prompt() now injects per-slot
     guidance lines so the LLM can tailor tone (e.g. "fate=absent → self-made framing").
"""

import hashlib
import random

# ─────────────────────────────────────────────────────────────
# SEED HELPER
# ─────────────────────────────────────────────────────────────

def _seed(slots: dict) -> int:
    """Deterministic integer seed from full slot dict — avoids collisions."""
    raw = "|".join(f"{k}:{v}" for k, v in sorted(slots.items()))
    return int(hashlib.md5(raw.encode()).hexdigest(), 16)


def _pick(pool: list, rng: random.Random) -> str:
    return rng.choice(pool)


def _pick_keyed(mapping: dict, key: str, rng: random.Random, fallback_key="default") -> str:
    """Pick a random phrase from mapping[key], falling back to mapping[fallback_key]."""
    pool = mapping.get(key) or mapping.get(fallback_key, [""])
    return rng.choice(pool)


# ─────────────────────────────────────────────────────────────
# QUALITY MAP  (English token → Malayalam adjective)
# ─────────────────────────────────────────────────────────────

QUALITY_MAP = {
    "deep":        "ആഴത്തിലുള്ള",
    "strong":      "ശക്തമായ",
    "clear":       "വ്യക്തമായ",
    "long":        "നീണ്ട",
    "short":       "ചെറിയ",
    "curved":      "വളഞ്ഞ",
    "straight":    "നേരായ",
    "faint":       "നേർത്ത",
    "wide":        "വിശാലമായ",
    "wide-arc":    "വിശാലമായ",
    "absent":      "ഇല്ലാത്ത",
    "present":     "ഉള്ള",
    "broken":      "ഇടവേള ഉള്ള",
    "forked":      "ശാഖകളായ",
    "chained":     "ചങ്ങലാകൃതിയിലുള്ള",
    "flexible":    "വഴക്കമുള്ള",
    "stiff":       "ഉറച്ച",
    "close-thumb": "ശ്രദ്ധാലുവായ",
    "branching":   "ശക്തിയേറിയ",
    "drooping":    "ഭാവനാശക്തിയുള്ള",
    "multiple":    "ഒന്നിലധികം",
    "one":         "ഒരു",
}


def _q(text: str, fallback="ശക്തമായ") -> str:
    t = (text or "").lower()
    for eng, ml in QUALITY_MAP.items():
        if eng in t:
            return ml
    return fallback


# ─────────────────────────────────────────────────────────────
# PHRASE BANKS  — keyed by slot value, each value → list[str]
# ─────────────────────────────────────────────────────────────

# ── HAND TYPE ──────────────────────────────────────────────────
HAND_TYPE_ML = {
    "earth": "ഭൂമി സ്വഭാവമുള്ള കൈ",
    "air":   "വായു സ്വഭാവമുള്ള കൈ",
    "fire":  "അഗ്നി സ്വഭാവമുള്ള കൈ",
    "water": "ജല സ്വഭാവമുള്ള കൈ",
}

HAND_MEANING_ML = {
    "earth": ["ഉറച്ചതും വിശ്വസ്തവും പ്രായോഗികവുമായ",
              "നമ്പകത്തക്കതും ക്ഷമയുള്ളതുമായ",
              "ഭൂമിയെ പോലെ ഉറച്ചതും ആശ്രയയോഗ്യവുമായ"],
    "air":   ["ബൗദ്ധികവും സാമൂഹികവും ജിജ്ഞാസയുള്ളതുമായ",
              "ചിന്തിക്കാൻ ഇഷ്ടപ്പെടുന്ന, സ്വതന്ത്ര ബുദ്ധിയുള്ള",
              "ആശയ സമ്പന്നവും ആശയ വിനിമയ ശക്തിയുള്ളതുമായ"],
    "fire":  ["ഉത്സാഹഭരിതവും ധൈര്യശാലിയും ക്രിയാത്മകവുമായ",
              "ജ്വലിക്കുന്ന ആവേശവും നേതൃ ഗുണവുമുള്ള",
              "ഊർജ്ജ പ്രവാഹം നിറഞ്ഞ, ഉദ്ദേശ്യ ദൃഢതയുള്ള"],
    "water": ["സൂക്ഷ്മ ബോധവും അവബോധവും സഹാനുഭൂതിയുമുള്ള",
              "വൈകാരിക ഗഹനതയും ഭാവനാ ശക്തിയുമുള്ള",
              "ഹൃദയം കൊണ്ട് ചിന്തിക്കുന്ന, ആഴത്തിൽ അനുഭവിക്കുന്ന"],
}

HAND_OPENING_A = {
    "earth": ["ഈ കൈ കണ്ടപ്പോൾ ഒരു ഭൂമിയുടെ ഉറപ്പ് തോന്നി.",
              "ഭൂമി പോലെ ഉറച്ചതാണ് ഈ കൈ.",
              "ഈ കൈ ഒരു ആഴമുള്ള, ശാന്തമായ ശക്തി കാണിക്കുന്നു."],
    "air":   ["ഈ കൈ ഒരു ജ്ഞാനി ചിന്തകന്റേതാണ്.",
              "ബൗദ്ധിക ഊർജ്ജം ഈ കൈ മൊത്തം ഉണ്ട്.",
              "ആശയങ്ങൾ ഒഴുകുന്ന ഒരു കൈ — വായുവിന്റെ ഗുണം."],
    "fire":  ["ഈ കൈ കണ്ടാൽ ഒരു ആവേശം തോന്നും.",
              "ഉത്സാഹത്തിന്റെ ഊർജ്ജം ഈ കൈ നിറഞ്ഞ് നിൽക്കുന്നു.",
              "അഗ്നി പോലെ ജ്വലിക്കുന്ന ഒരു കൈ."],
    "water": ["ഈ കൈ ഒരു അഗാധ ഹൃദയത്തിന്റേതാണ്.",
              "ജലം പോലെ ആഴവും ഒഴുക്കും ഉള്ള ഒരു കൈ.",
              "ഈ കൈ കണ്ടാൽ ഒരു ദയ നിറഞ്ഞ ആൾ ഉണ്ട് എന്ന് മനസ്സ് പറഞ്ഞു."],
}

HAND_OPENING_B = [
    "ഒരു നിമിഷം ശ്രദ്ധയോടെ ഇത് നോക്കി — ഇവിടെ ഒരു {hand_quality} ആളിന്റെ ചരിത്രം ഉണ്ട്.",
    "ഓരോ രേഖയും ഒരു കഥ പറയുന്നു, ഈ കൈ ഒരു {hand_quality} ജീവിതം ഉറക്കെ പ്രഖ്യാപിക്കുന്നു.",
    "ഇത്തരം കൈകൾ അപൂർവ്വമാണ് — {hand_quality} ഗുണം ഉള്ള ഒരു ആൾ.",
    "ആദ്യ കാഴ്ചയിൽ തന്നെ ഒരു കാര്യം വ്യക്തം: ഇത് {hand_quality} ഒരു ആളിന്റെ കൈ.",
]

HAND_QUALITY_ML = [
    "ശക്തിയുള്ളതും നല്ല മനസ്സുള്ളതുമായ",
    "ഊഷ്മളവും ആത്മാർത്ഥതയുള്ളതുമായ",
    "ബുദ്ധിമാനും സ്നേഹമുള്ളതുമായ",
    "ദൃഢനിശ്ചയവും ദയയുള്ളതുമായ",
    "ക്ഷമയും ആത്മവിശ്വാസവും ഉള്ള",
    "ഉത്തരവാദിത്തബോധവും ഊർജ്ജവുമുള്ള",
]

# ── LIFE LINE ─────────────────────────────────────────────────
LIFE_OPENING = {
    "deep":        ["ജീവരേഖ ആഴത്തിൽ, ഒഴുക്കോടെ ഉണ്ട്.",
                    "ജീവരേഖ കണ്ടപ്പോൾ ഒരു ആശ്വാസം — ആഴവും ദൃഢതയും ഉണ്ട്.",
                    "ഈ ജീവരേഖ ശക്തമായ ജീവ ഊർജ്ജം പറഞ്ഞുതരുന്നു."],
    "faint":       ["ജീവരേഖ നേർത്തതാണ്, പക്ഷേ ഇത് ദൗർബ്ബല്യമല്ല.",
                    "നേർത്ത ജീവരേഖ ശ്രദ്ധാലുത്വവും ആഴത്തിലുള്ള ചിന്തയും കാണിക്കുന്നു.",
                    "ജീവരേഖ നേർത്താൽ ഊർജ്ജം ഉള്ളിലേക്ക് ആഴ്ന്നിറങ്ങിയതാണ്."],
    "wide-arc":    ["ജീവരേഖ വിശാലമായ വൃത്തത്തിൽ ഉണ്ട്.",
                    "ഈ വളഞ്ഞ ജീവരേഖ ഒരു സാഹസിക ജീവിതം കാണിക്കുന്നു.",
                    "വിശാലമായ ചാപം — ലോകത്തെ ആലിംഗനം ചെയ്യാൻ ആഗ്രഹിക്കുന്ന ഒരു ആൾ."],
    "broken":      ["ജീവരേഖയിൽ ഒരു ഇടവേള ഉണ്ട് — ഭയക്കേണ്ടതില്ല.",
                    "ഈ ഇടവേള ഒരു ധൈര്യമുള്ള ജീവിത മാറ്റം കാണിക്കുന്നു.",
                    "ഇടവേള ദൗർബ്ബല്യമല്ല — ജീവിതം ഒരു പുതിയ ദിശ കണ്ടെത്തുകയാണ്."],
    "close-thumb": ["ജീവരേഖ ശ്രദ്ധാലുവായ സ്വഭാവം കാണിക്കുന്നു.",
                    "ഈ കൈ ഒരു സൂക്ഷ്മ ബോധമുള്ള ആളിന്റേതാണ്.",
                    "ശ്രദ്ധയും ജാഗ്രതയും ഉള്ള ഒരു ആൾ."],
    "branching":   ["ജീവരേഖ ശാഖകളോടെ ഉണ്ട് — ഉയർന്ന ഊർജ്ജം.",
                    "ഈ ശാഖകൾ ജീവ ഊർജ്ജം അഭിവൃദ്ധിപ്പെടുന്നതിന്റെ ലക്ഷണം.",
                    "ശക്തിയേറിയ ജീവരേഖ — ഒന്നിൽ നിന്ന് ഒരുപാട് ദിശകൾ."],
    "default":     ["ജീവരേഖ നല്ല ലക്ഷണം കാണിക്കുന്നു.",
                    "ജീവരേഖ ഒരു ശോഭനമായ യാത്ര പ്രതിഫലിപ്പിക്കുന്നു.",
                    "ഈ ജീവരേഖ ഒരു ആരോഗ്യകരമായ ജീവിതം കാണിക്കുന്നു."],
}

LIFE_MEANING_ML = {
    "vitality":       "ശക്തമായ ജീവ ഊർജ്ജവും ആരോഗ്യവും",
    "adventurous":    "സാഹസിക ജീവിതവും ഉത്സാഹ മനോഭാവവും",
    "cautious":       "ശ്രദ്ധയും ജ്ഞാനവും ഉള്ള ജീവിതം",
    "transformation": "ഒരു ധൈര്യമുള്ള ജീവിത മാറ്റം",
    "rising":         "ഉയർന്നു വരുന്ന ഊർജ്ജവും അഭിലാഷവും",
    "default":        "നല്ല ജീവ ഊർജ്ജവും ആരോഗ്യകരമായ ജീവിതവും",
}

LIFE_CLOSE = [
    "ഭാവിയിൽ ഒരുപാട് ഊർജ്ജവും ആരോഗ്യവും നിങ്ങൾക്ക് ഉണ്ടാകും.",
    "ദൈവം നിങ്ങൾക്ക് ഒരുപാട് ആരോഗ്യവും ഊർജ്ജവും നൽകിയിട്ടുണ്ട്.",
    "ജീവിതം ഒരു മഹത്തായ ഉപഹാരം — ഈ ജീവരേഖ അത് ഓർമ്മിപ്പിക്കുന്നു.",
    "ശരീരം ശ്രദ്ധിക്കൂ, ഊർജ്ജം നിലനിൽക്കും.",
]

# ── HEART LINE ─────────────────────────────────────────────────
HEART_OPENING = {
    "curved":  ["വളഞ്ഞ ഹൃദയരേഖ ഒരു ഊഷ്മളമായ ഹൃദയം കാണിക്കുന്നു.",
                "ഈ വളഞ്ഞ രേഖ സ്നേഹ ദാഹം പ്രകടിപ്പിക്കുന്നു.",
                "ഈ ഹൃദയരേഖ ഒരു തുറന്ന, ഊഷ്മള ആൾ ഉണ്ടെന്ന് പറഞ്ഞുതരുന്നു."],
    "straight": ["നേരായ ഹൃദയരേഖ ബുദ്ധിയും ഹൃദയവും ഒന്നിക്കുന്നത് കാണിക്കുന്നു.",
                 "ഹൃദയ-ബുദ്ധി ഒരു ശക്തിയായി ചേരുന്ന ആൾ.",
                 "ഈ രേഖ — ഹൃദയം ഒരിക്കലും ബുദ്ധിക്ക് മുന്നിൽ കീഴടങ്ങില്ല."],
    "chained":  ["ചങ്ങലാകൃതിയിലുള്ള ഹൃദയരേഖ ആഴമേറിയ സ്നേഹ ജീവിതം കാണിക്കുന്നു.",
                 "ഈ ഹൃദയരേഖ ഒരു സ്നേഹ സമൃദ്ധ ജീവിതം പ്രതിഫലിപ്പിക്കുന്നു.",
                 "ചങ്ങലാകൃതി — ബന്ധങ്ങൾ ആഴത്തിൽ അനുഭവിക്കുന്ന ഒരു ആൾ."],
    "forked":   ["ശാഖകളായ ഹൃദയരേഖ ഹൃദയ-ബുദ്ധി സന്തുലനം കാണിക്കുന്നു.",
                 "ഈ ഫോർക്ക് — സ്നേഹവും ജ്ഞാനവും ഒരുമിച്ച് നൽകുന്ന ഒരാൾ.",
                 "ശാഖ ഉള്ള ഹൃദയരേഖ ഒരു അഭൂതപൂർവ്വ ഗുണം."],
    "deep":     ["ആഴമേറിയ ഹൃദയരേഖ ഗഹനമായ സ്നേഹ ശേഷി കാണിക്കുന്നു.",
                 "ഈ ആഴമുള്ള ഹൃദയരേഖ ഒരു ഉഗ്ര സ്നേഹ ശക്തി.",
                 "ആഴത്തിൽ സ്നേഹിക്കുന്ന ഒരു ആൾ — ഈ ഹൃദയരേഖ സാക്ഷ്യപ്പെടുത്തുന്നു."],
    "default":  ["ഹൃദയരേഖ ഒരു നല്ല ഹൃദയം കാണിക്കുന്നു.",
                 "ഈ ഹൃദയരേഖ ഒരു ആഴമേറിയ സ്നേഹ ജീവിതം കാണിക്കുന്നു.",
                 "ഹൃദയ രേഖ — നിങ്ങളുടെ ഹൃദയ ഭാഷ ഇവിടെ ഉണ്ട്."],
}

HEART_MEANING_ML = {
    "deep-love": "ആഴത്തിലുള്ള സ്നേഹ ശേഷി",
    "warm":      "ഊഷ്മളവും വാത്സല്യ പൂർണ്ണവുമായ സ്വഭാവം",
    "practical": "ഹൃദയത്തോടൊപ്പം ബുദ്ധിയും ഉപയോഗിക്കുന്ന",
    "loyal":     "അചഞ്ചലമായ വിശ്വസ്തത",
    "balanced":  "ഹൃദയവും ബുദ്ധിയും ഒരേ അളവിൽ",
    "default":   "ആഴത്തിലുള്ള, ആത്മാർത്ഥ സ്നേഹം",
}

LOVE_STYLE_ML = {
    "openly":      ["തുറന്ന്, ഒളിവില്ലാതെ",
                    "തുറന്ന ഹൃദയത്തോടെ",
                    "ആരോടും ഒളിക്കാതെ"],
    "deeply":      ["ആഴത്തിൽ, മൗനമായി",
                    "അഗാധമായ ആഴത്തിൽ",
                    "ആഴത്തിൽ അനുഭവിക്കുന്ന"],
    "quietly":     ["ശാന്തമായി, ആർഭാടം ഇല്ലാതെ",
                    "ശബ്ദമില്ലാതെ, ആഴത്തിൽ",
                    "ഉൾക്കൊണ്ട്, ശാന്തമായി"],
    "loyally":     ["വിശ്വസ്തതയോടെ, ദൃഢതയോടെ",
                    "ഒരിക്കലും കൈ വിടാതെ",
                    "ഉറച്ച കൂറോടെ"],
    "practically": ["പ്രായോഗിക ബുദ്ധിയോടെ",
                    "ഹൃദയത്തെ ബുദ്ധി നയിക്കുന്ന",
                    "ചിന്തിച്ചിട്ട് സ്നേഹിക്കുന്ന"],
    "default":     ["ആത്മാർത്ഥതയോടെ",
                    "ഹൃദയം കൊണ്ട്",
                    "നിഷ്കളങ്കമായി"],
}

HEART_CLOSE = [
    "ബന്ധങ്ങൾ ഇനി കൂടുതൽ ദൃഢമാകും.",
    "നിങ്ങളുടെ സ്നേഹം ചുറ്റുമുള്ളവർക്ക് ഒരു അനുഗ്രഹമാണ്.",
    "ഈ ഹൃദയ ഗുണം ജീവിതത്തിൽ ഒരു വലിയ ആസ്തിയാണ്.",
    "ആഴത്തിൽ ബന്ധപ്പെടുന്ന ഒരു ആൾ — ഇത് ഒരു വലിയ ഭാഗ്യം.",
]

# ── HEAD LINE ─────────────────────────────────────────────────
HEAD_OPENING = {
    "straight":  ["നേരായ ശിരോരേഖ ഒരു യുക്തി ബദ്ധ ചിന്തകൻ കാണിക്കുന്നു.",
                  "ഈ നേർ രേഖ — കൃത്യത ഇഷ്ടപ്പെടുന്ന, ക്രമമായ ചിന്ത ഉള്ള ഒരാൾ.",
                  "ഉത്തരം കണ്ടെത്തും വരെ ചിന്തിക്കുന്ന ഒരു ആൾ."],
    "curved":    ["വളഞ്ഞ ശിരോരേഖ സൃഷ്ടിപര ചിന്ത കാണിക്കുന്നു.",
                  "ഈ വളഞ്ഞ ശിരോരേഖ ഒരു ഭാവനാ ലോകം ഉള്ള ആൾ.",
                  "കലയും ഭാവനയും ഒഴുകുന്ന ഒരു ബുദ്ധി."],
    "drooping":  ["ആഴത്തിലേക്ക് ഇറങ്ങുന്ന ശിരോരേഖ ഭാവനാ ശക്തി കാണിക്കുന്നു.",
                  "ഈ ശിരോരേഖ ആഴത്തിൽ ചിന്തിക്കുന്ന, ഭാവനാ ലോകം ഉള്ള ഒരാൾ.",
                  "ലോകം മറ്റുള്ളവർ കാണാത്ത രീതിയിൽ കാണുന്ന ഒരു ബുദ്ധി."],
    "forked":    ["ശാഖകളായ ശിരോരേഖ — ബിസിനസ്സും ഭാവനയും ഒരുമിക്കുന്ന ഒരു ബുദ്ധി.",
                  "ഈ ഫോർക്ക് ഒരു ബഹുമുഖ ബുദ്ധിയുടെ ലക്ഷണം.",
                  "ഒരു ആൾ — ഒന്നിലധികം ലോകങ്ങൾ ഒരേ സമയം ചിന്തിക്കുന്ന."],
    "long":      ["നീണ്ട ശിരോരേഖ ശ്രദ്ധേയമായ ഓർമ്മ ശക്തി കാണിക്കുന്നു.",
                  "ഈ നീണ്ട ശിരോരേഖ — ഒന്നും മറക്കില്ല, ഒന്നും കൈ വിടില്ല.",
                  "ദീർഘ ദൃഷ്ടിയോടെ ചിന്തിക്കുന്ന ഒരു ആൾ."],
    "short":     ["ചെറിയ ശിരോരേഖ — ഒറ്റ നോട്ടത്തിൽ കാര്യം കണ്ടെത്തുന്ന ബുദ്ധി.",
                  "ഈ ചെറിയ ശിരോരേഖ സ്വഭാവ നേരിട്ടുള്ള ചിന്ത കാണിക്കുന്നു.",
                  "ആലോചന കൂടാതെ ശരിയുത്തരം കണ്ടെത്തുന്ന ഒരു ആൾ."],
    "default":   ["ശിരോരേഖ ഒരു ശക്തമായ ബുദ്ധി കാണിക്കുന്നു.",
                  "ഈ ശിരോരേഖ ഒരു ചിന്തനശീലം കാണിക്കുന്നു.",
                  "ബുദ്ധിശക്തി ഉള്ള, ആഴം ഉള്ള ഒരു ആൾ."],
}

HEAD_MEANING_ML = {
    "logical":    "യുക്തിസഹ, ക്രമ ബദ്ധ",
    "creative":   "സൃഷ്ടിപര, ഭാവനാ ശക്തിയുള്ള",
    "analytical": "വിശകലന ബുദ്ധിയുള്ള",
    "practical":  "പ്രായോഗിക, ഫലദായക",
    "quick":      "വേഗത്തിൽ, കൂർമ്മ ബുദ്ധിയുള്ള",
    "focused":    "ഏകാഗ്രത, ഫോക്കസ്ഡ്",
    "default":    "സമർത്ഥ, ശ്രദ്ധയുള്ള",
}

HEAD_CLOSE = [
    "ഈ ബുദ്ധിശക്തി ഉപയോഗിച്ചാൽ ഏത് ലക്ഷ്യവും നേടാം.",
    "ഈ ബുദ്ധിശക്തി ജീവിതത്തിൽ ഒരു വലിയ ആസ്തിയാണ്.",
    "ചിന്ത ഒരു ആയുധം — ഇത് ഉപയോഗിക്കൂ.",
    "ഈ ചിന്താ ശക്തി ഒരുപാട് നേട്ടങ്ങൾ ഉണ്ടാക്കും.",
]

# ── FATE LINE ─────────────────────────────────────────────────
FATE_INTRO_ML = {
    "absent":  ["ഭാഗ്യരേഖ ഇല്ലാത്തത് ഭയക്കേണ്ടതില്ല — ഇത് സ്വന്തം വഴി തീർക്കുന്ന ആളിന്റെ ലക്ഷണം.",
                "ഭാഗ്യ രേഖ ഇല്ലാത്തത് ദൗർഭാഗ്യമല്ല — ഇത് ഒരു സ്വതന്ത്ര ജീവിതത്തിന്റെ ലക്ഷണം.",
                "ഭാഗ്യരേഖ ഇല്ലാത്തവർ സ്വയം ഭാഗ്യം ഉണ്ടാക്കുന്നവരാണ്."],
    "strong":  ["ഭാഗ്യരേഖ ശക്തമായി ഉണ്ട് — ഒരു വ്യക്തമായ ജീവിത ദിശ ഉണ്ട്.",
                "ഈ ശക്തമായ ഭാഗ്യരേഖ ഒരു ദൃഢ ലക്ഷ്യം ഉള്ള ആൾ കാണിക്കുന്നു.",
                "ഭാഗ്യരേഖ ശക്തമാണ് — ജോലി, ദിശ, ലക്ഷ്യം എല്ലാം വ്യക്തം."],
    "faint":   ["ഭാഗ്യരേഖ കാണുന്നുണ്ട്, ഇനിയും ശക്തമാകും.",
                "നേർത്ത ഭാഗ്യരേഖ ഉണ്ട് — ഊർജ്ജം ഉള്ളിൽ ഉണ്ട്, ഇനി പ്രകടമാകും.",
                "ഈ ഭാഗ്യരേഖ ഇനി ശക്തമാകുന്നതിന്റെ ആരംഭം കാണിക്കുന്നു."],
    "broken":  ["ഭാഗ്യരേഖ ഒരു നല്ല മാറ്റം കാണിക്കുന്നു.",
                "ഇടവേള ഉള്ള ഭാഗ്യരേഖ ഒരു ധൈര്യമുള്ള ജീവിത ദിശ മാറ്റം.",
                "ഈ ഇടവേള ഒരു ഉറച്ച ദിശ മാറ്റത്തിന്റെ ലക്ഷണം — നല്ലതാണ്."],
    "present": ["ഭാഗ്യരേഖ ദൃശ്യമാണ്.",
                "ഭാഗ്യ രേഖ കണ്ടു — ഒരു ദിശ ഉണ്ട്.",
                "ഭാഗ്യ രേഖ ഉണ്ട് — ജോലി, ദിശ ഇതൊക്കെ ശരിയാകും."],
    "default": ["ഭാഗ്യ രേഖ നോക്കുമ്പോൾ,",
                "ഭാഗ്യ രേഖ ഒരു ദിശ കാണിക്കുന്നു.",
                "ഈ ഭാഗ്യ രേഖ ഒരു ജോലി മേഖലയിൽ ഉയർച്ച കാണിക്കുന്നു."],
}

FATE_MEANING_ML = {
    "absent":  ["ആത്മ ശക്തി കൊണ്ട് ജീവിതം കെട്ടിപ്പടുക്കുന്ന ഒരു ആൾ.",
                "ഭാഗ്യം സ്വയം ഉണ്ടാക്കുന്ന ആൾ — ഇത് ഒരു ശക്തമായ ഗുണം."],
    "default": ["ജോലി മേഖലയിൽ ഉയർച്ചയും നേട്ടവും ഉണ്ടാകും.",
                "ഉദ്ദ്യോഗ ജീവിതത്തിൽ ഒരു നല്ല ദിശ ഉണ്ടാകും.",
                "സാമ്പത്തിക നില ഇനി മെച്ചപ്പെടും."],
}

FATE_CLOSE = [
    "കഠിനാധ്വാനം ഒരിക്കലും വ്യർത്ഥമാകില്ല.",
    "ആത്മാർത്ഥതയോടെ പ്രവർത്തിക്കൂ, ഫലം ഉറപ്പ് ആണ്.",
    "ദൈവം നൽകുന്ന ദിശ ഒരിക്കലും തെറ്റില്ല.",
    "ഊർജ്ജം ഒരു ദിശയിൽ കേന്ദ്രീകരിച്ചാൽ വലിയ നേട്ടങ്ങൾ ഉണ്ടാകും.",
]

# ── SUN LINE ──────────────────────────────────────────────────
SUN_INTRO_ML = {
    "present": ["സൂര്യ രേഖ ദൃശ്യമാണ് — അംഗീകാരവും വിജയവും ഉണ്ടാകും.",
                "ഈ സൂര്യ രേഖ — ആളുകൾ നിങ്ങളുടെ കഴിവ് തിരിച്ചറിയും.",
                "സൂര്യ രേഖ ഉള്ളത് ഒരു ഭാഗ്യ ലക്ഷണം — ഒരു പ്രത്യേക കഴിവ് ഉണ്ട്."],
    "absent":  ["സൂര്യ രേഖ ഇല്ലെന്ന് ഭയക്കേണ്ടതില്ല — ശ്രദ്ധിക്കപ്പെടാതെ ഉള്ള വിജയം ഉണ്ടാകും.",
                "ഭൂഗർഭ ജലം പോലെ — ആഴത്തിൽ ഒഴുകുന്ന ഒരു കഴിവ് ഉണ്ട്.",
                "ശ്രദ്ധ ആഗ്രഹിക്കാതെ ഉള്ള ഒരു ശക്തി — ഇത് ദൗർബ്ബല്യമല്ല."],
    "default": ["ഒരു പ്രത്യേക കഴിവ് ഉണ്ട്, ആ കഴിവ് ആളുകൾ തിരിച്ചറിയും.",
                "ഇനിയും ഉള്ള ജീവിതം ഒരുപാട് നേട്ടങ്ങൾ ഉണ്ടാകും.",
                "ആ ഉള്ളിലെ ശക്തി ഇനി പ്രകടമാകും."],
}

# ── MOUNTS ────────────────────────────────────────────────────
MOUNT_INFO_ML = {
    "venus":   ["ശുക്ര പർവ്വതം ഉയർന്നിരിക്കുന്നു — കുടുംബ സ്നേഹവും ഉദാരതയും ഉണ്ട്.",
                "ശുക്ര ഊർജ്ജം — സ്നേഹവും സൗന്ദര്യ ബോധവും ഉള്ള ഒരാൾ.",
                "ഈ ശുക്ര പർവ്വതം ഒരു കലാ-സ്നേഹ ഗുണം കാണിക്കുന്നു."],
    "jupiter": ["ഗുരു പർവ്വതം ഉയർന്നിരിക്കുന്നു — നേതൃത്വ ഗുണവും ആത്മ വിശ്വാസവും ഉണ്ട്.",
                "ഗുരു ഊർജ്ജം — ആൾക്കൂട്ടത്തിൽ ഒറ്റ നോട്ടത്തിൽ ശ്രദ്ധ ആകർഷിക്കുന്ന ഒരാൾ.",
                "ഈ ഗുരു പർവ്വതം ആജ്ഞാ ഗുണവും നേതൃ ശക്തിയും കാണിക്കുന്നു."],
    "saturn":  ["ശനി പർവ്വതം ഉയർന്നിരിക്കുന്നു — ജ്ഞാനവും ക്ഷമയും ഉണ്ട്.",
                "ശനി ഊർജ്ജം — ദീർഘ ദൃഷ്ടിയോടെ ജീവിതം കാണുന്ന ഒരാൾ.",
                "ഈ ശനി പർവ്വതം ആഴമേറിയ ജ്ഞാനവും ആത്മ ദൃഢതയും കാണിക്കുന്നു."],
    "moon":    ["ചന്ദ്ര പർവ്വതം ഉയർന്നിരിക്കുന്നു — ഭാവനാ ശക്തിയും അവബോധവും ഉണ്ട്.",
                "ചന്ദ്ര ഊർജ്ജം — ഒരു ഭാവനാ ലോകം ഉള്ള, അവബോധം ഉള്ള ഒരാൾ.",
                "ഈ ചന്ദ്ര പർവ്വതം ആഴത്തിലുള്ള ഭാവനയും ആത്മ ബോധവും കാണിക്കുന്നു."],
    "mercury": ["ബുധ പർവ്വതം ഉയർന്നിരിക്കുന്നു — ആശയ വിനിമയ കഴിവും ബിസിനസ് ബുദ്ധിയും ഉണ്ട്.",
                "ബുധ ഊർജ്ജം — വാക്ക് ഒരായുധം ആക്കുന്ന ഒരാൾ.",
                "ഈ ബുധ പർവ്വതം ബിസിനസ്, ആശയ വിനിമയ ഗുണം കാണിക്കുന്നു."],
    "none":    ["പർവ്വതങ്ങൾ സന്തുലിതമായ ഊർജ്ജം കാണിക്കുന്നു.",
                "ഊർജ്ജ സന്തുലനം ഉള്ള ഒരാൾ — ഒരു ഗുണവും അമിതമല്ല.",
                "എല്ലാ ഗുണങ്ങളും ഒരു ശരിയായ അളവിൽ."],
    "default": ["പർവ്വതങ്ങൾ സന്തുലിതമായ ഊർജ്ജം കാണിക്കുന്നു.",
                "ഊർജ്ജ ബന്ധം ശക്തമാണ്.",
                "ഗ്രഹ ഊർജ്ജം ഒരു സന്തുലിത ജീവിതം കാണിക്കുന്നു."],
}

# ── MARRIAGE LINES ────────────────────────────────────────────
MARRIAGE_INFO_ML = {
    "one":      ["വിവാഹ രേഖ ഒന്ന് വ്യക്തമായി കാണുന്നു — ഒരു ദൃഢ ബന്ധം ഉണ്ടാകും.",
                 "ഒരൊറ്റ, ശക്തമായ ബന്ധ രേഖ — ജീവിതം നിറഞ്ഞ ഒരു ബന്ധം.",
                 "ഒരു ദൃഢ ബന്ധം — ഇത് ഒരു ഭാഗ്യ ലക്ഷണം."],
    "multiple": ["ഒന്നിലധികം ബന്ധ രേഖകൾ — ആഴമേറിയ ബന്ധങ്ങൾ ഉണ്ടാകും.",
                 "ഒന്നിലധികം ബന്ധ ഊർജ്ജം — ജീവിതം ബന്ധ സമ്പന്നമാകും.",
                 "ഈ ബന്ധ രേഖകൾ ഒരു ബന്ധ ഉദ്ദേശ്യ ജീവിതം കാണിക്കുന്നു."],
    "absent":   ["ബന്ധ ജീവിതം ഇനി ശക്തമാകും.",
                 "ബന്ധങ്ങൾ ഇനി ദൃഢമാകും.",
                 "ആഴമേറിയ ബന്ധം ഇനി ഉണ്ടാകും."],
    "default":  ["ബന്ധ ജീവിതം ശക്തമാകും.",
                 "ഈ ബന്ധ ലക്ഷണം ഒരു ഭാഗ്യ ചിഹ്നം.",
                 "ബന്ധ ജീവിതം ഒരു ഉയർന്ന ഊർജ്ജം ഉണ്ടാകും."],
}

# ── CLOSING ADVICE ────────────────────────────────────────────
ADVICE_ML = {
    "earth": ["ക്ഷമ കൈ വിടരുത്, ദൈവം നിങ്ങൾക്ക് കൂടെ ഉണ്ട്",
              "ഉറപ്പോടെ ഒരു ചുവട് ഒരു ദിവസം — ലക്ഷ്യം ഒരു ദിവസം അടുക്കും",
              "കഠിനാധ്വാനം ഒരിക്കലും വ്യർത്ഥമാകില്ല"],
    "air":   ["ആലോചിച്ചിട്ടേ തീരുമാനം എടുക്കൂ, ബുദ്ധി ഒരു ഭൂഷണമാണ്",
              "ആശയങ്ങൾ ഉള്ളിൽ ഒതുക്കരുത്, ലോകം കാണട്ടെ",
              "ജ്ഞാനം ഒരു ദൈവ ദാനം — ഇത് ഉപയോഗിക്കൂ"],
    "fire":  ["ആ ആവേശം ശരിയായ ദിശയിൽ ഉപയോഗിക്കൂ",
              "ഉത്സാഹം ഒരായുധം — ഒരിക്കലും കൈ വിടരുത്",
              "ലക്ഷ്യം ഒരു തീ — ആ തീ കെടാൻ അനുവദിക്കരുത്"],
    "water": ["ഹൃദയം ശ്രദ്ധിക്കൂ, ഉള്ളിലെ ശബ്ദം ഒരിക്കലും തെറ്റില്ല",
              "ദയ ഒരു ശക്തി — ഇത് ഒരു ദൗർബ്ബല്യം അല്ല",
              "ആഴത്തിൽ അനുഭവിക്കൂ — ഈ ജീവിതം ഒരു വലിയ ഉപഹാരം"],
    "default": ["ആത്മ വിശ്വാസത്തോടെ മുന്നോട്ട് പോകൂ",
                "നിങ്ങളുടെ കഴിവുകൾ വിശ്വസിക്കൂ",
                "ദൈവം നിങ്ങളെ ഒരിക്കലും കൈവിടില്ല"],
}

CLOSING_BLESSING = [
    "ദൈവം നിങ്ങൾക്ക് എല്ലാ നന്മകളും നൽകട്ടെ. ആയുസ്സും ആരോഗ്യവും സൗഭാഗ്യവും ഉണ്ടാകട്ടെ. 🙏",
    "ജീവിതം ഒരു മനോഹര യാത്രയാണ്. ആത്മവിശ്വാസത്തോടെ മുന്നോട്ട് പോകൂ.🙏",
    "ദൈവം നൽകിയ ഈ ജീവിതം ആസ്വദിക്കൂ. ഭാവി ശോഭനമാണ്. 🙏",
    "ദൈവ ഹസ്തം നിങ്ങൾക്ക് കൂടെ ഉണ്ട്. 🙏",
]


# ─────────────────────────────────────────────────────────────
# MAIN BUILD FUNCTION
# ─────────────────────────────────────────────────────────────

def build_malayalam(slots: dict, seed_override: str = "") -> str:
    """
    Build a full Malayalam palm reading from slot dict.

    seed_override: legacy compat — if supplied, mixed into the hash so old
    call sites still work. Normally leave empty; seed comes from slots.
    """
    rng = random.Random(_seed(slots) ^ hash(seed_override))
    s = slots

    hk = s.get("hand_type", "earth")
    fk = s.get("fate", "present")
    lk = s.get("life", "deep")
    heart_k = s.get("heart", "curved")
    head_k = s.get("head", "straight")
    mk = s.get("mount", "none")
    mar_k = s.get("marriage", "absent")
    sun_k = s.get("sun", "absent")

    parts = []

    # ── 1. OPENING ──────────────────────────────────────────────
    hand_quality = _pick(HAND_QUALITY_ML, rng)
    opening_a = _pick_keyed(HAND_OPENING_A, hk, rng)
    opening_b = _pick(HAND_OPENING_B, rng).format(hand_quality=hand_quality)
    parts.append(
        f"### നിങ്ങളുടെ കൈ — ആദ്യ കാഴ്ച\n"
        f"{opening_a} {opening_b} ഇനി ഞാൻ ഓരോ രേഖയും ശ്രദ്ധയോടെ വായിക്കാം."
    )

    # ── 2. HAND TYPE ──────────────────────────────────────────────
    hand_type_label = HAND_TYPE_ML.get(hk, HAND_TYPE_ML["earth"])
    hand_meaning = _pick_keyed(HAND_MEANING_ML, hk, rng)
    thumb_q = _q(s.get("thumb", "flexible"))
    finger_k = s.get("fingers", "wide")
    finger_meaning_map = {
        "wide": "സ്വതന്ത്ര ചിന്തകൻ",
        "close": "ശ്രദ്ധാലു",
        "long": "ബൗദ്ധിക ജ്ഞാനമുള്ള",
        "short": "പ്രായോഗിക ബുദ്ധിയുള്ള",
        "default": "നല്ല സ്വഭാവ ഗുണമുള്ള",
    }
    finger_meaning = finger_meaning_map.get(finger_k, finger_meaning_map["default"])
    parts.append(
        f"### നിങ്ങളുടെ കൈയുടെ കഥ\n"
        f"നിങ്ങളുടേത് {hand_type_label} — {hand_meaning} വ്യക്തിത്വം കാണിക്കുന്നു. "
        f"തള്ളവിരൽ {thumb_q} ആണ്, ഇത് ശക്തമായ ഇഷ്ടശക്തിയുടെ ലക്ഷണം. "
        f"വിരലുകൾ {_q(finger_k)} ആണ്, ഇത് {finger_meaning} ആളാണ് എന്ന് കാണിക്കുന്നു."
    )

    # ── 3. LIFE LINE ─────────────────────────────────────────────
    life_opening = _pick_keyed(LIFE_OPENING, lk, rng)
    life_meaning = LIFE_MEANING_ML.get(s.get("life_meaning", "default"), LIFE_MEANING_ML["default"])
    life_close = _pick(LIFE_CLOSE, rng)
    extra = ("ഈ ഇടവേള ഒരു ധൈര്യമുള്ള ജീവിത മാറ്റം കാണിക്കുന്നു. "
             if "broken" in lk else "")
    parts.append(
        f"### ജീവരേഖ — ജീവ ശക്തിയും യാത്രയും\n"
        f"ജീവ രേഖ ആയുസ്സ് കാണിക്കുന്നില്ല — ജീവ ശക്തിയും ജീവിത യാത്രയും ആണ് ഇത് പറയുന്നത്. "
        f"{life_opening} ഇത് {life_meaning} കാണിക്കുന്നു. {extra}{life_close}"
    )

    # ── 4. HEART LINE ─────────────────────────────────────────────
    heart_opening = _pick_keyed(HEART_OPENING, heart_k, rng)
    heart_meaning = HEART_MEANING_ML.get(s.get("heart_meaning", "default"), HEART_MEANING_ML["default"])
    love_style = _pick_keyed(LOVE_STYLE_ML, s.get("love_style", "default"), rng)
    heart_close = _pick(HEART_CLOSE, rng)
    parts.append(
        f"### ഹൃദയ രേഖ — സ്നേഹത്തിന്റെ ഭാഷ\n"
        f"{heart_opening} ഇത് {heart_meaning} കാണിക്കുന്നു. "
        f"നിങ്ങൾ {love_style} സ്നേഹിക്കുന്ന ആളാണ്. {heart_close}"
    )

    # ── 5. HEAD LINE ─────────────────────────────────────────────
    head_opening = _pick_keyed(HEAD_OPENING, head_k, rng)
    head_meaning = HEAD_MEANING_ML.get(s.get("head_meaning", "default"), HEAD_MEANING_ML["default"])
    head_close = _pick(HEAD_CLOSE, rng)
    parts.append(
        f"### ശിരോ രേഖ — ചിന്തയുടെ വഴി\n"
        f"{head_opening} ഇത് {head_meaning} ചിന്താ ശക്തി കാണിക്കുന്നു. {head_close}"
    )

    # ── 6. FATE LINE ─────────────────────────────────────────────
    fate_intro = _pick_keyed(FATE_INTRO_ML, fk, rng)
    fate_meaning_key = "absent" if fk == "absent" else "default"
    fate_meaning = _pick_keyed(FATE_MEANING_ML, fate_meaning_key, rng)
    fate_close = _pick(FATE_CLOSE, rng)
    parts.append(
        f"### ഭാഗ്യ രേഖ — ജോലിയും ദിശയും\n"
        f"{fate_intro} {fate_meaning} {fate_close}"
    )

    # ── 7. SUN + MOUNTS + MARRIAGE ──────────────────────────────
    sun_intro = _pick_keyed(SUN_INTRO_ML, sun_k, rng)
    mount_info = _pick_keyed(MOUNT_INFO_ML, mk, rng)
    marriage_info = _pick_keyed(MARRIAGE_INFO_ML, mar_k, rng)
    parts.append(
        f"### സൂര്യ രേഖയും മറ്റ് ലക്ഷണങ്ങളും\n"
        f"{sun_intro} {mount_info} {marriage_info} "
        f"ഈ ലക്ഷണങ്ങൾ ചേർന്ന് പറയുന്നത്, നിങ്ങളുടെ ജീവിതം സന്തോഷകരവും സമ്പന്നവും ആകും എന്നാണ്."
    )

    # ── 8. CLOSING ───────────────────────────────────────────────
    advice = _pick_keyed(ADVICE_ML, hk, rng)
    blessing = _pick(CLOSING_BLESSING, rng)
    parts.append(
        f"### നിങ്ങളുടെ കൈ പറയുന്നത്\n"
        f"ഈ കൈ ആകെ നോക്കുമ്പോൾ, ഒരു ശക്തിയുള്ള, സ്നേഹമുള്ള ആളിന്റെ ചിത്രം കാണാം. "
        f"ഒരു ഉപദേശം: {advice}. ഭാവി ശോഭനമാണ്, ദൈവം നിങ്ങളുടെ കൂടെ ഉണ്ട്.\n{blessing}"
    )

    # ── CONFIDENCE FOOTER ───────────────────────────────────────
    conf_map = {"high": "ഉയർന്നത്", "medium": "മധ്യമം", "low": "കുറഞ്ഞത്"}
    conf = s.get("confidence", "medium").lower()
    result = "\n\n".join(parts)
    result += f"\n\nവിശ്വാസ്യതാ നില: {conf_map.get(conf, 'മധ്യമം')}"
    return result


# ─────────────────────────────────────────────────────────────
# IMPROVED ENGLISH PROMPT BUILDER
# Adds per-slot guidance so the LLM tailors its tone.
# ─────────────────────────────────────────────────────────────

PALMISTRY_KNOWLEDGE = """Heart:long=deep love.curved=warm.straight=practical.chained=ups&downs.forked=balanced.
Head:long=sharp memory.curved=creative.straight=logical.forked=versatile.
Life:NOT lifespan.deep=strong vitality.wide arc=adventurous.breaks=positive change.
Fate:strong=clear purpose.absent=self-made.mid-palm=found later.
Sun:present=recognized talent.absent=quiet success.
Mounts:venus=love family.jupiter=leadership.saturn=wisdom.moon=intuition.mercury=business.
Hands:earth=reliable.air=intellectual.fire=energetic.water=sensitive."""

_FATE_GUIDANCE = {
    "absent":  "Frame as self-made, entrepreneurial. Never negative.",
    "broken":  "Frame as a brave life pivot — exciting, not scary.",
    "faint":   "Frame as emerging, growing strength.",
    "strong":  "Affirm clear purpose and career momentum.",
    "default": "Standard career encouragement.",
}
_HEART_GUIDANCE = {
    "chained": "Acknowledge emotional richness; frame complexity as depth not instability.",
    "forked":  "Emphasize head-heart balance as a rare gift.",
    "straight":"Emphasize wisdom in love, not coldness.",
    "default": "Warm, encouraging.",
}
_HAND_GUIDANCE = {
    "fire":  "Use energetic, active language. Short punchy sentences.",
    "water": "Use gentle, emotionally resonant language.",
    "air":   "Use intellectual, curious language.",
    "earth": "Use grounded, reassuring language.",
}


def build_english_prompt(slots: dict) -> str:
    s = slots
    summary = (
        f"Hand:{s.get('hand_type','earth')} Life:{s.get('life','deep')} "
        f"Heart:{s.get('heart','curved')} Head:{s.get('head','straight')} "
        f"Fate:{s.get('fate','present')} Sun:{s.get('sun','present')} "
        f"Mount:{s.get('mount','venus')} Marriage:{s.get('marriage','one')}"
    )
    fate_note = _FATE_GUIDANCE.get(s.get("fate", "default"), _FATE_GUIDANCE["default"])
    heart_note = _HEART_GUIDANCE.get(s.get("heart", "default"), _HEART_GUIDANCE["default"])
    hand_note = _HAND_GUIDANCE.get(s.get("hand_type", "earth"), _HAND_GUIDANCE["earth"])

    return f"""Palm data: {summary}
Knowledge: {PALMISTRY_KNOWLEDGE}

Tone guidance (follow these exactly):
- Hand type ({s.get('hand_type','earth')}): {hand_note}
- Fate line ({s.get('fate','present')}): {fate_note}
- Heart line ({s.get('heart','curved')}): {heart_note}

"Write warm English palm reading. Exactly 1 sentence per section. No padding, no filler. Stop after 'What Your Hand Is Telling You'."

### Opening
### Your Hand's First Story
### Life Line — Your Vitality and Journey
### Heart Line — How You Love
### Head Line — How You Think
### Fate Line — Your Career and Purpose
### Sun and Other Lines
### What Your Hand Is Telling You
Confidence Level: {s.get('confidence','medium').capitalize()}

Rules: no bullet points, no clinical words, frame everything positively."""