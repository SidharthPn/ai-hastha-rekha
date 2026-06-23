# Jyotish AI - Hastha Rekha & Kili Josyam

A comprehensive modern web application that combines traditional Vedic astrology, Palmistry (Hastha Rekha), and Parrot Astrology (Kili Josyam) with the power of modern Artificial Intelligence.

## Features

- **Daily Astrology Dashboard**: Personalized daily horoscope, lucky numbers, directions, and activities generated dynamically via AI. Bilingual support (English & Malayalam) guarantees synchronized logic.
- **AI Palmistry (Hastha Rekha)**: Upload an image of your palm and receive a deep, symbolic AI reading analyzing the major lines (Heart line, Head line, Life line, Fate line) and mounts.
- **Kili Josyam (Parrot Astrology)**: An interactive and beautifully animated experience where a parrot picks a card for you. Includes rare Mythic, Golden, and Silver cards.
- **AI Guru**: Ask spiritual and astrological questions to an AI Guru that gives wisdom based on Vedic principles.
- **Bilingual Interface**: Full support for English and Malayalam translations across the entire application.

## Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Backend**: Python, FastAPI
- **AI Integration**: Google Gemini AI (via `google-genai` SDK)

## Setup & Run

### 1. Backend
Navigate to the `backend` directory and install dependencies:
```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file in the `backend` directory and add your Gemini API Key:
```
GEMINI_API_KEY=your_api_key_here
```

Start the backend server:
```bash
python main.py
```
*(The backend runs on port 8000 by default)*

### 2. Frontend
You can serve the frontend files using a simple HTTP server. Navigate to the `frontend` directory:
```bash
cd frontend
python -m http.server 3000
```
Then open `http://localhost:3000` in your web browser.

## Deployment
- The backend is configured to be easily deployable on **Render**.
- The frontend can be deployed on static hosting providers like **Vercel** or **Netlify**.

## Recent Updates
- Added highly interactive Mythic card animations for Kili Josyam.
- Refactored Kili Josyam card logic to support multi-language translation bindings consistently.
- Optimized Daily Dashboard AI generation to ensure lucky numbers, ratings, and astrological features remain perfectly consistent when switching languages.
- Restored missing palmistry reading modules for advanced palm line tracking.
