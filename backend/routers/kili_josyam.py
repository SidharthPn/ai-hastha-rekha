from fastapi import APIRouter
from pydantic import BaseModel
from utils.llm import call_llm, add_tokens

router = APIRouter()

class KiliRequest(BaseModel):
    dob: str
    age: int
    lang: str = "en"
    name: str = "User"
    relation: str = "Myself"
    card_data: dict = None


@router.post("/kili-reading")
async def get_kili_reading(req: KiliRequest):
    try:
        subject = "the user" if req.relation.lower() in ["myself", "self", ""] else f"the user's {req.relation} ({req.name})"
        pronoun_instruct = "Speak directly to the user (e.g. 'You are in a phase...')." if req.relation.lower() in ["myself", "self", ""] else f"Speak directly to the user about their {req.relation} (e.g. 'Your {req.relation} is in a phase...')."

        if req.lang == "ml":
            system_prompt = f"""You are a wise Kerala astrologer. 
The reading is for: {subject}.
Output EXACTLY 1 or 2 SHORT sentences strictly in native Malayalam script (മലയാള ലിപി).
Provide mystical insights on current life stage opportunities or challenges based on the age provided. 
CRITICAL RULE 1: DO NOT explicitly mention the age in the output. Make it sound like a magical reading from the cards.
CRITICAL RULE 2: You MUST use the native Malayalam alphabet. ANY output in Latin/English alphabet is a CRITICAL ERROR. Do NOT use Manglish.
CRITICAL RULE 3: Use very simple, everyday conversational Malayalam. Keep it friendly and simple.
CRITICAL RULE 4: {pronoun_instruct}
Keep it traditional and positive.
DO NOT output JSON. Just the plain text."""
        else:
            system_prompt = f"""You are a wise Kerala astrologer. 
The reading is for: {subject}.
Output EXACTLY 1 or 2 SHORT sentences entirely in English.
Provide mystical insights on current life stage opportunities or challenges based on the age provided. 
CRITICAL RULE 1: DO NOT explicitly mention the age in the output. Make it sound like a magical reading from the cards.
CRITICAL RULE 2: {pronoun_instruct}
Keep it traditional and positive.
DO NOT output JSON. Just the plain text."""

        card_theme = req.card_data.get("theme", "Unknown") if req.card_data else "Unknown"
        card_meaning = req.card_data.get("meaning", "Unknown") if req.card_data else "Unknown"
        
        prompt = f"The reading is for {subject}, age {req.age}. The parrot has chosen a mystical card with the theme of '{card_theme}' and the meaning: '{card_meaning}'. Write the insight based on this mystical omen."
        raw_response = call_llm(prompt, system_prompt, max_tokens=300, temp=0.7)
        
        # Prepare the response payload from the card data
        reading_data = {
            "insights": raw_response.strip(),
            "card_data": req.card_data
        }

        tokens_used = len(raw_response.split()) * 2
        total_tokens = add_tokens(tokens_used)
        
        print("\n" + "="*50)
        print(f"🦜 [KILI JOSYAM TOKENS]")
        print(f"   Tokens for this reading: ~{tokens_used}")
        print(f"   Model used: Groq (llama-3-versatile)")
        print(f"🌟 TOTAL APP TOKENS SPENT: ~{total_tokens}")
        print("="*50 + "\n")
        
        return {"status": "success", "reading": reading_data, "tokens_used": tokens_used}
            
    except Exception as e:
        return {"status": "error", "message": str(e)}
