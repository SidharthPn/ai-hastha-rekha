import json
import os
import hashlib

MEMORY_FILE = "data/guru_memory.json"

def load_memory_store():
    if not os.path.exists(MEMORY_FILE):
        return {}
    try:
        with open(MEMORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return {}

def save_memory_store(store):
    try:
        os.makedirs(os.path.dirname(MEMORY_FILE), exist_ok=True)
        with open(MEMORY_FILE, "w", encoding="utf-8") as f:
            json.dump(store, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error saving memory: {e}")

def get_user_id(name: str, dob: str) -> str:
    """Generate a consistent ID for a user based on name and DOB."""
    seed = f"{name.lower()}-{dob}"
    return hashlib.md5(seed.encode('utf-8')).hexdigest()

def get_hybrid_history(name: str, dob: str, frontend_history: list) -> list:
    """
    Combines long-term DB history (last 20 messages) with frontend history (last 5).
    Returns a deduplicated, coherent history list for the LLM.
    """
    uid = get_user_id(name, dob)
    store = load_memory_store()
    
    if uid not in store:
        store[uid] = {"messages": []}
    
    db_history = store[uid].get("messages", [])
    
    # We trust frontend history for the absolute latest context (e.g. last 5-10 messages)
    # But we want to prepend DB history (older context) that frontend might have dropped.
    
    # Very simple deduplication: compare content
    frontend_contents = [msg.get("content", "") for msg in frontend_history]
    
    combined_history = []
    # Add older DB messages that are NOT in the current frontend history
    for msg in db_history:
        if msg.get("content", "") not in frontend_contents:
            combined_history.append(msg)
            
    # Then append all frontend history
    combined_history.extend(frontend_history)
    
    # Keep only the last 30 messages to avoid huge token usage
    combined_history = combined_history[-30:]
    
    return combined_history

def update_db_history(name: str, dob: str, new_messages: list):
    """Save new messages to the DB history."""
    uid = get_user_id(name, dob)
    store = load_memory_store()
    
    if uid not in store:
        store[uid] = {"messages": []}
        
    # Append new messages
    store[uid]["messages"].extend(new_messages)
    
    # Keep DB history bounded to last 50 messages
    store[uid]["messages"] = store[uid]["messages"][-50:]
    
    save_memory_store(store)
