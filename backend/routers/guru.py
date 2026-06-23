from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List
from utils.llm import stream_chat_llm
from utils.guru_context import build_guru_context
from utils.guru_memory import get_hybrid_history, update_db_history
from utils.rag import retrieve

router = APIRouter()

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    name: str
    dob: str
    lang: str = "en"
    mood: str = "General Inquiry"
    message: str
    history: List[ChatMessage] = []

def build_system_prompt(lang: str, user_context: str, rag_context: str) -> str:
    if lang == "en":
        lang_instruction = "Respond in English."
        length_instruction = "Keep responses extremely concise, under 60 words."
    else:
        lang_instruction = "Respond ONLY in natural, fluent Malayalam script (മലയാള ലിപി)."
        length_instruction = "CRITICAL: Malayalam consumes many tokens. Keep your response extremely brief, strictly under 3 sentences to save tokens."
    
    return f"""You are a wise, empathetic, and mystical AI Astrology Guru.
Your goal is to provide deeply personal, helpful, and spiritual advice to the user.
{lang_instruction}

{user_context}

{rag_context}

RULES:
- Be profoundly insightful but brief.
- {length_instruction}
- Never mention "According to the RAG context" or "As an AI".
- Speak like a true spiritual guide.
- Provide practical advice alongside mystical observations.
"""

@router.post("/chat")
async def guru_chat(request: ChatRequest):
    # 1. Retrieve RAG Knowledge
    rag_context = retrieve(request.message, n_results=2)
    
    # 2. Build User Context
    user_context = build_guru_context(request.name, request.dob, request.lang, request.mood)
    
    # 3. Build System Prompt
    system_prompt = build_system_prompt(request.lang, user_context, rag_context)
    
    # 4. Get Hybrid History
    frontend_hist = [{"role": m.role, "content": m.content} for m in request.history]
    history = get_hybrid_history(request.name, request.dob, frontend_hist)
    
    # 5. Prepare Messages for LLM
    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(history)
    messages.append({"role": "user", "content": request.message})
    
    # 6. Stream Response
    def stream_generator():
        # Save user message to memory
        update_db_history(request.name, request.dob, [{"role": "user", "content": request.message}])
        
        full_response = ""
        for chunk in stream_chat_llm(messages, max_tokens=400, temp=0.7):
            full_response += chunk
            yield chunk
            
        # Save assistant message to memory
        update_db_history(request.name, request.dob, [{"role": "assistant", "content": full_response}])
        
    return StreamingResponse(stream_generator(), media_type="text/plain")
