import io
import traceback
from fastapi import APIRouter
from fastapi.responses import JSONResponse, StreamingResponse
from gtts import gTTS

router = APIRouter()

@router.get("/tts")
def text_to_speech(text: str, lang: str = "ml"):
    try:
        clean = text.replace('###','').replace('\n','... ').replace('*','')
        tts = gTTS(text=clean, lang=lang)
        audio_fp = io.BytesIO()
        tts.write_to_fp(audio_fp)
        audio_fp.seek(0)
        return StreamingResponse(audio_fp, media_type="audio/mpeg")
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})
