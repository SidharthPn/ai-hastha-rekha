# Jyotish AI (AI Hastha Rekha) - Project Overview

**Jyotish AI** is a full-stack, AI-powered astrological and spiritual guidance application. It seamlessly blends ancient Vedic traditions (Palmistry, Kili Josyam, Horoscope) with modern Artificial Intelligence (LLMs and Vision Models) to provide personalized, culturally resonant readings in both English and Malayalam.

---

## 🛠 Tech Stack

### Frontend
- **HTML5 / CSS3**: Custom-built, highly responsive UI without heavy CSS frameworks. Utilizes complex CSS variables for seamless theme toggling (Dark "Deep Space" Mode vs. Light "Astra Almanac" Parchment Mode).
- **Vanilla JavaScript (ES6+)**: Handles complex DOM manipulation, SVG animations, async API calls, and state management (e.g., multilingual toggling) without the overhead of React/Vue.
- **SVG & Canvas Animations**: Custom SVG interactive wheel for Horoscopes, animated Kili Josyam cards, and a dynamic HTML5 Canvas particle system for the cosmos background.

### Backend
- **Python (FastAPI)**: High-performance, async web framework used to build modular RESTful APIs for each feature.
- **LLM Integration**: 
  - **Google Gemini (Vision & Text)**: Used for complex image analysis (Palmistry) and generative text summaries.
  - **Groq (Llama 3)**: Used as a blazing-fast fallback for text generation.
- **Caching & Rule Engine**: Custom deterministic rule engine using MD5 hashing and JSON file-based caching.

---

## 🔮 Core Features & "How It Works"

### 1. AI Palmistry (Hastha Rekha)
- **What it does**: Users upload a photo of their palm, and the AI provides a detailed reading of their Life, Heart, and Head lines.
- **How it works**: 
  - The frontend validates the image aspect ratio and quality before sending it to the backend.
  - The backend uses **Gemini 1.5 Pro/Flash Vision** to analyze the palm lines based on strict prompt constraints.
  - Returns structured JSON data, which the frontend dynamically renders into beautifully formatted UI cards.
  - **Edge-case handling**: If the AI fails to parse the image, the backend falls back to a deterministic template matching algorithm based on image hash data, ensuring 100% uptime.

### 2. Token-Optimized Daily Horoscope
- **What it does**: Provides daily personalized readings based on Date of Birth.
- **How it works (The Engineering Marvel)**:
  - **Zero-AI Calculation**: The backend calculates the exact Zodiac sign, Element, Ruling Planet, and Lucky numbers mathematically from the DOB.
  - **Deterministic Rule Engine**: Generates a daily seed (e.g., `Leo-2026-06-15-en`), hashes it, and uses it to randomly select pre-written base predictions for Career, Love, Health, and Finance. Every Leo gets the exact same base rules today, but they change tomorrow.
  - **Minimal AI Polishing**: The LLM is *only* passed those 4 selected rules and asked to polish them into a cohesive 60-word summary. The AI cannot invent new predictions.
  - **Caching Layer**: The LLM output is cached instantly. The AI is called a maximum of **12 times per day** (once per Zodiac sign), regardless of how many thousands of users request a reading. This reduces API token costs by 99.9%.

### 3. Kili Josyam (Parrot Astrology)
- **What it does**: An interactive experience where a digital parrot picks a tarot-style card for the user.
- **How it works**: The user selects a card from an animated SVG deck. The backend uses the selected card index to prompt the LLM for a highly contextualized, mystical reading.

### 4. Daily Vedic Dashboard & AI Guru
- **Dashboard**: Displays daily Panchangam metrics (Rahu Kalam, Yamagandam) mathematically.
- **AI Guru**: A conversational chatbot utilizing the LLM with a specialized system prompt to act as a wise, empathetic spiritual guide.

---

## 🚀 Key Resume Bullet Points (For Interviews)

If you are putting this on your resume, use these bullet points to highlight your engineering decisions:

* **Architected a Full-Stack AI Application:** Built "Jyotish AI", a culturally-aware astrological platform using FastAPI (Python) and Vanilla JS, serving interactive AI-driven Palmistry and Horoscope readings.
* **Engineered Token-Optimized LLM Workflows:** Designed a hybrid deterministic rule-engine and LLM architecture for daily horoscopes. Utilized MD5 hashing for daily seeds and an advanced caching layer to reduce daily AI API calls by 99%, lowering operational costs while supporting unbounded user scaling.
* **Integrated Multimodal Vision AI:** Implemented Google Gemini Vision API to analyze user-uploaded palm images, utilizing strict prompt engineering to force structured JSON responses for seamless frontend rendering.
* **Developed Custom State Management & UI:** Built a highly responsive, dual-theme frontend (Dark Space / Light Parchment) entirely in Vanilla JS/CSS, featuring complex SVG interactions and HTML5 Canvas animations without relying on heavy frameworks.
* **Implemented Fault-Tolerant Fallbacks:** Created a robust error-handling system where vision model failures gracefully degrade to deterministic template-matching algorithms, ensuring 100% reading availability for end-users.
* **Built Multilingual Capabilities:** Developed a global `i18n` localization system allowing users to instantly toggle the entire UI and AI-generated content between English and regional languages (Malayalam) dynamically.

---

## 🧠 Technical Interview Talking Points

1. **"Why didn't you use React/Next.js?"**
   * *Answer:* "I wanted absolute control over the DOM for the complex SVG animations (like the Horoscope wheel and Kili cards) and Canvas rendering. Using Vanilla JS allowed me to keep the bundle size incredibly small and performance lightning-fast, proving I understand core web technologies beneath the abstractions of modern frameworks."

2. **"How did you optimize LLM costs?"**
   * *Answer:* "Instead of asking the LLM to generate a horoscope from scratch for every single user (which is expensive and slow), I built a deterministic Rule Engine in Python. It picks base rules based on a hashed date-seed, and the LLM only *polishes* the text. I then cache the result. This means whether I have 10 users or 100,000 users, I only make 12 API calls per day."

3. **"How did you handle AI Hallucinations in Palmistry?"**
   * *Answer:* "I used strict Prompt Engineering telling Gemini to output *only* valid JSON. Additionally, if the AI timed out or failed to find a palm, I implemented a custom fallback script that calculates a pseudo-random (but deterministic) reading based on the image's binary hash, ensuring the user always gets a response."
