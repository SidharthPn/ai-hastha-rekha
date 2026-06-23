import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
os.environ["CHROMA_TELEMETRY"] = "false"
os.environ["ANONYMIZED_TELEMETRY"] = "false"

from routers import palmistry, kili_josyam, tts, daily, horoscope, guru

app = FastAPI(title="Jyotish AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
)

# ── ROUTER MOUNTING ──
app.include_router(palmistry.router, tags=["Palmistry"])
app.include_router(kili_josyam.router, tags=["Kili Josyam"])
app.include_router(tts.router, tags=["Text-to-Speech"])
app.include_router(daily.router, tags=["Daily Dashboard"])
app.include_router(horoscope.router, prefix="/horoscope", tags=["Horoscope"])
app.include_router(guru.router, prefix="/guru", tags=["AI Guru"])

@app.get("/")
def read_root():
    return {"message": "AI Hastha Rekha API is running efficiently."}

if __name__ == "__main__":
    import uvicorn
    # Make sure to run on port 8000 to match the frontend expectations
    uvicorn.run(app, host="0.0.0.0", port=8000)