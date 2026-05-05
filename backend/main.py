import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google.api_core import exceptions as google_api_exceptions
from pydantic import BaseModel, Field
import google.generativeai as genai

_load_env_paths = [
    Path(__file__).resolve().parent.parent / ".env",
    Path(__file__).resolve().parent / ".env",
]
for _p in _load_env_paths:
    load_dotenv(_p)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

ASSISTANT_NAME = ((os.getenv("ASSISTANT_NAME") or "Velina").replace("\n", " ").strip()) or "Velina"
BOSS_DISPLAY = ((os.getenv("BOSS_DISPLAY") or "Boss Jeevan").replace("\n", " ").strip()) or "Boss Jeevan"
COMPANY_NAME = (
    (os.getenv("COMPANY_NAME") or "Veloce IT Solutions").replace("\n", " ").strip()
    or "Veloce IT Solutions"
)

ASSISTANT_SYSTEM_INSTRUCTION = f"""Your name is {ASSISTANT_NAME}. You are the highly intelligent, loyal, and proactive personal AI assistant to {BOSS_DISPLAY}.

CORE IDENTITY & TONE:
- Always address the user as "Boss" or "{BOSS_DISPLAY}".
- Your tone should be a mix of a professional executive assistant and a tech-savvy peer.
- Be warm, encouraging, and slightly witty, but always maintain a high level of respect for your Boss.

DOMAIN EXPERTISE:
- Since {BOSS_DISPLAY} is a Senior React and Front-end Developer, you are also an expert in React, TypeScript, Vite, Tailwind CSS, and Capacitor.
- You are familiar with his startup, "{COMPANY_NAME}," and assist him with branding and technical strategy.

SPECIAL FEATURES:

1. SILENT ENGLISH TUTORING:
   - Observe the Boss's grammar during the conversation.
   - First, provide the answer or perform the task requested.
   - Then, at the end of your response, add a gentle note: "By the way Boss, a more professional way to say that in English would be: [Corrected Sentence]."
   - If his English is already fine, omit this note entirely — do not nag every turn.

2. INSTRUCTION PRIORITY:
   - If Boss gives a specific instruction (e.g., "From now on, act as a mentor" or "Keep it brief"), follow it strictly.

3. PROACTIVE CLOSURE:
   - Always end your response by asking if there is anything else you can help with for {COMPANY_NAME} or his personal tasks (vary the wording naturally).

EXAMPLE RESPONSE STYLE:
"Hello Boss! I have reviewed the code for the mapping feature. It looks solid. Shall I help you deploy it to Render?
By the way Boss, a more professional way to say 'I done it' would be: 'I have completed it.'
Is there anything else you need for Veloce today, Boss?"
(Adapt tone and content to the actual question; this illustrates structure, warmth, tutoring line, and closure.)

VOICE DELIVERY:
Your replies are read aloud by text-to-speech. Keep answers concise when possible unless Boss asks for depth. Never ask him to type — output only what will be spoken."""

app = FastAPI(title="Nivi Personal Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "http://[::1]:5173",
        "http://[::1]:5174",
        "http://[::1]:4173",
        # Capacitor Android/iOS WebView (capacitor.config server.androidScheme https)
        "https://localhost",
        "capacitor://localhost",
        "ionic://localhost",
        "http://localhost",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User transcript from speech-to-text")


class ChatResponse(BaseModel):
    reply: str


_model = None


def get_model():
    global _model
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is not set. Add it to your .env file.",
        )
    if _model is None:
        genai.configure(api_key=GEMINI_API_KEY)
        _model = genai.GenerativeModel(
            model_name=GEMINI_MODEL,
            system_instruction=ASSISTANT_SYSTEM_INSTRUCTION,
        )
    return _model


def _build_user_turn(transcript: str) -> str:
    """Give the model clear context: STT text + Velina's duties."""
    text = transcript.strip()
    return (
        "Here is what Boss said via speech recognition (text may be imperfect):\n"
        f'"""{text}"""\n\n'
        f"Respond as {ASSISTANT_NAME}. Follow your system guidelines: fulfill the request first; "
        'if there is an English mistake, end with the agreed "By the way Boss, a more professional way..." line; '
        f"otherwise skip tutoring. Close by offering help with {COMPANY_NAME} or personal tasks. Stay concise for voice."
    )


@app.get("/")
async def root():
    """Helps verify you hit this API (404 on /chat usually means another app is on that port)."""
    return {
        "service": "voice-personal-assistant-api",
        "endpoints": {"health": "/health", "chat": "POST /chat"},
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest) -> ChatResponse:
    try:
        model = get_model()
        response = model.generate_content(_build_user_turn(body.message))
    except HTTPException:
        raise
    except google_api_exceptions.ResourceExhausted as exc:
        # Free tier: small daily limit per model (e.g. 20/day for gemini-2.5-flash); billing removes caps.
        raise HTTPException(
            status_code=429,
            detail=(
                "Gemini quota exceeded. The free tier allows only a few dozen requests per day per model; "
                "wait for the daily reset, enable billing on your Google AI / Cloud project, or set "
                "GEMINI_MODEL to another Flash model for a separate quota. "
                f"Details: {exc}"
            ),
        ) from exc
    except Exception as exc:  # pragma: no cover - surfaced to client
        raise HTTPException(status_code=502, detail=f"Gemini request failed: {exc}") from exc

    try:
        text = (response.text or "").strip()
    except ValueError as exc:
        raise HTTPException(
            status_code=502,
            detail="No text returned (blocked or unsupported finish reason).",
        ) from exc
    if not text:
        raise HTTPException(status_code=502, detail="Empty response from model.")
    return ChatResponse(reply=text)


@app.get("/health")
async def health():
    return {"status": "ok"}
