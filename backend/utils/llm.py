import os
import re
import time
import google.generativeai as genai
from groq import Groq

# ── API KEYS & CLIENTS ──
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "").strip().replace('"', '').replace("'", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip().replace('"', '').replace("'", "")

if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

groq_client = None
if GROQ_API_KEY:
    try:
        groq_client = Groq(api_key=GROQ_API_KEY)
    except Exception as e:
        print(f"Groq init: {e}")

# ── TOKEN TRACKER ──
_TOTAL_APP_TOKENS = 0

def add_tokens(tokens: int) -> int:
    global _TOTAL_APP_TOKENS
    _TOTAL_APP_TOKENS += tokens
    return _TOTAL_APP_TOKENS

def get_tokens() -> int:
    global _TOTAL_APP_TOKENS
    return _TOTAL_APP_TOKENS

# ── LLM CALLER ──
def call_llm(prompt, system, max_tokens=500, temp=0.7, json_mode=False):
    result = ""
    if groq_client and GROQ_API_KEY:
        for model in ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]:
            try:
                kwargs = {}
                if json_mode:
                    kwargs["response_format"] = {"type": "json_object"}
                
                r = groq_client.chat.completions.create(
                    model=model, max_tokens=max_tokens, temperature=temp,
                    messages=[{"role":"system","content":system},{"role":"user","content":prompt}],
                    **kwargs
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
            kwargs = {}
            if json_mode:
                kwargs["generation_config"] = {"response_mime_type": "application/json"}
            result = m.generate_content(f"{system}\n\n{prompt}", **kwargs).text.strip()
        except Exception as e:
            print(f"Gemini: {e}")
    return result

def stream_chat_llm(messages, max_tokens=1000, temp=0.7):
    """
    Expects messages in format: [{"role": "system"|"user"|"assistant", "content": "..."}]
    Yields chunks of text as they arrive.
    """
    if groq_client and GROQ_API_KEY:
        for model in ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]:
            try:
                stream = groq_client.chat.completions.create(
                    model=model, max_tokens=max_tokens, temperature=temp,
                    messages=messages,
                    stream=True
                )
                for chunk in stream:
                    content = chunk.choices[0].delta.content
                    if content:
                        yield content
                    if hasattr(chunk, "x_groq") and chunk.x_groq and hasattr(chunk.x_groq, "usage") and chunk.x_groq.usage:
                        u = chunk.x_groq.usage
                        print(f"\n[TOKEN USAGE - GROQ] Prompt: {u.prompt_tokens} | Completion: {u.completion_tokens} | Total: {u.total_tokens}")
                return
            except Exception as e:
                err = str(e)
                if "rate_limit" in err.lower():
                    m = re.search(r'try again in (\d+)m(\d+)', err)
                    wait = (int(m.group(1))*60 + int(m.group(2))) if m else 10
                    print(f"Rate limit — waiting {min(wait,30)}s")
                    time.sleep(min(wait, 30))
                else:
                    print(f"Groq {model} stream error: {e}")

    if GOOGLE_API_KEY:
        try:
            gemini_messages = []
            system_instruction = ""
            for msg in messages:
                if msg["role"] == "system":
                    system_instruction += msg["content"] + "\n"
                elif msg["role"] == "user":
                    gemini_messages.append({"role": "user", "parts": [msg["content"]]})
                elif msg["role"] == "assistant":
                    gemini_messages.append({"role": "model", "parts": [msg["content"]]})
            
            m = genai.GenerativeModel('gemini-1.5-flash', system_instruction=system_instruction.strip() if system_instruction else None)
            response = m.generate_content(gemini_messages, stream=True)
            for chunk in response:
                if chunk.text:
                    yield chunk.text
            try:
                # Some Gemini versions return usage in the final response
                if hasattr(response, 'usage_metadata') and response.usage_metadata:
                    u = response.usage_metadata
                    print(f"\n[TOKEN USAGE - GEMINI] Prompt: {u.prompt_token_count} | Completion: {u.candidates_token_count} | Total: {u.total_token_count}")
            except Exception:
                pass
        except Exception as e:
            print(f"Gemini stream error: {e}")

def generate_horoscope_summary(zodiac: str, element: str, career: str, love: str, health: str, finance: str, lang: str, timeframe: str = "daily", name: str = "User", relation: str = "Myself") -> str:
    lang_instruction = "Respond in English." if lang == "en" else "Respond ONLY in natural, fluent Malayalam script. Do not use English."
    
    subject = "me" if relation.lower() in ["myself", "self", ""] else f"my {relation} ({name})"
    pronoun = "you" if relation.lower() in ["myself", "self", ""] else "they"
    
    system_prompt = f"""You are a friendly and wise astrologer.
{lang_instruction}

Reading is for: {subject}
Zodiac: {zodiac}
Element: {element}
Timeframe: {timeframe}

Career: {career}
Love: {love}
Health: {health}
Finance: {finance}

Create a warm, detailed, and cohesive {timeframe} horoscope summarizing these points in a SINGLE paragraph.
Provide a deep and insightful reading.
If the reading is for a relative or friend, speak directly to the user about their {relation} (e.g. "Your {relation} will find...").
Otherwise, speak directly to the user (e.g. "You will find...").

RULES:
- Length: Strictly 80-120 words (or about 4 to 6 detailed sentences if writing in Malayalam).
- Format: MUST be a single cohesive paragraph. Do NOT use multiple paragraphs.
- No bullet points, lists, or headers.
- Be positive and encouraging.
- No scary predictions.
- No guaranteed future claims (use "may", "could", etc.).
- Sound mystical and wise.
- CRITICAL: Ensure you complete all sentences. Do NOT cut off the text mid-sentence. Keep your output concise if needed to fit within limits, but NEVER leave a sentence unfinished.
- Return plain text only (no markdown, no headings).
"""
    
    prompt = f"Please provide the {timeframe} horoscope reading for {subject}."
    
    res = call_llm(prompt, system_prompt, max_tokens=3000, temp=0.7)
    
    # Calculate approx tokens (1 token ~ 4 chars) and add to tracker
    add_tokens(len(res) // 4 + len(system_prompt) // 4)
    
    return res
    add_tokens(len(res) // 4 + len(system_prompt) // 4)
    
    return res
