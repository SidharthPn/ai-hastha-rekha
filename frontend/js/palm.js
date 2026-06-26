
// Automatically switch API URL based on where the app is running
const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8000'
  : 'https://ai-hastha-rekha.onrender.com';

// Set the language from the global Hub preference on load
document.addEventListener('DOMContentLoaded', () => {
  const savedLang = localStorage.getItem('astro_lang_preference');
  if (savedLang) {
    switchLang(savedLang);
  }

  // Prevent future dates
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('dobInput').setAttribute('max', today);
});

document.addEventListener('langChanged', (e) => {
  switchLang(e.detail);
});

let selectedFile = null;
let englishText = '', malayalamText = '';
let currentLang = 'en';
let pendingForm = null; // form prepared for the hand-mismatch confirmation flow

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const cameraInput = document.getElementById('cameraInput');
const analyzeBtn = document.getElementById('analyzeBtn');

// ── MEDIA PICKER FIX ─────────────────────────────────────────────
// The "Take Photo" / "Upload" buttons sit as transparent overlays on
// top of <input type="file"> elements. The whole drop-zone ALSO has a
// click handler that opens the gallery picker (fileInput). Without
// stopping propagation, tapping either button bubbles up to the
// drop-zone and triggers a SECOND, conflicting file-picker request —
// which on mobile browsers (Android Chrome / iOS Safari) causes the
// camera picker to be cancelled or replaced by the gallery picker.
document.querySelectorAll('.upload-action-wrap').forEach(wrapper => {
  wrapper.addEventListener('click', e => e.stopPropagation());
});

// Support clicking anywhere else on the zone to fall back to gallery
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover') });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => {
  e.preventDefault(); dropZone.classList.remove('dragover');
  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', e => { if (e.target.files[0]) handleFile(e.target.files[0]) });
cameraInput.addEventListener('change', e => { if (e.target.files[0]) handleFile(e.target.files[0]) });

function handleFile(file) {
  selectedFile = file;
  const reader = new FileReader();
  reader.onload = e => {
    const src = e.target.result;
    document.getElementById('originalImg').innerHTML = `<img src="${src}" style="width:100%;display:block">`;
    document.getElementById('scannedImg').innerHTML = `<img src="${src}" id="scannedImgEl" style="width:100%;display:block;filter:grayscale(1)contrast(1.4)">`;
    document.getElementById('previewGrid').style.display = 'grid';
  };
  reader.readAsDataURL(file);
  analyzeBtn.disabled = false;
  setStep(1);
}

// ── STEP CONTROL ───────────────────────────────────────────────
function setStep(active) {
  [1, 2, 3].forEach(n => {
    const el = document.getElementById('step' + n);
    el.classList.remove('active', 'done');
    if (n < active) el.classList.add('done');
    else if (n === active) el.classList.add('active');
  });
  [1, 2].forEach(n => {
    const line = document.getElementById('line' + n);
    if (n < active) line.classList.add('done');
    else line.classList.remove('done');
  });
}

// ── RITUAL LOADING MESSAGES ────────────────────────────────────
const ritualMessages = [
  { t: 'Tracing the sacred lines…', s: 'Examining life, heart, and head lines' },
  { t: 'Reading the planetary mounts…', s: 'Jupiter, Venus, Saturn speak their truth' },
  { t: 'Consulting the ancient knowledge…', s: '30 years of wisdom, awakened' },
  { t: 'Feeling the energy of your hand…', s: 'Krishnan Ashan is with you now' },
  { t: 'Weaving your destiny story…', s: 'Almost ready to reveal what the lines say' },
];
let ritualIdx = 0, ritualTimer = null;
function startRitualMessages() {
  ritualIdx = 0;
  updateRitual();
  ritualTimer = setInterval(() => {
    ritualIdx = (ritualIdx + 1) % ritualMessages.length;
    updateRitual();
  }, 3200);
}
function updateRitual() {
  const m = ritualMessages[ritualIdx];
  const el1 = document.getElementById('ritualText');
  const el2 = document.getElementById('ritualSub');
  el1.style.opacity = 0; el2.style.opacity = 0;
  setTimeout(() => {
    el1.textContent = m.t; el2.textContent = m.s;
    el1.style.transition = 'opacity .5s'; el2.style.transition = 'opacity .5s';
    el1.style.opacity = 1; el2.style.opacity = 1;
  }, 300);
}
function stopRitualMessages() { clearInterval(ritualTimer) }

// ── IMAGE COMPRESSION ──────────────────────────────────────────
function compressImage(file, maxSize) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = event => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const c = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round(height *= maxSize / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round(width *= maxSize / height);
            height = maxSize;
          }
        }

        c.width = width;
        c.height = height;
        const cctx = c.getContext('2d');
        cctx.drawImage(img, 0, 0, width, height);

        c.toBlob(blob => {
          resolve(blob);
        }, 'image/jpeg', 0.8);
      };
      img.onerror = error => reject(error);
    };
    reader.onerror = error => reject(error);
  });
}

// ── MODAL (hand mismatch & alerts) ─────────────────────────────
function showModal(msg, isAlertOnly = false) {
  document.getElementById('modalMsg').textContent = msg;
  const confirmModal = document.getElementById('confirmModal');

  const proceedBtn = confirmModal.querySelector('.modal-btn.proceed');
  const cancelBtn = confirmModal.querySelector('.modal-btn.cancel');

  if (isAlertOnly) {
    proceedBtn.style.display = 'none';
    cancelBtn.textContent = 'OK';
    // Make OK button more prominent like a primary button
    cancelBtn.style.background = 'var(--gold-dim)';
    cancelBtn.style.borderColor = 'var(--gold)';
    cancelBtn.style.color = 'var(--gold-light)';
  } else {
    proceedBtn.style.display = 'inline-block';
    cancelBtn.textContent = 'Go Back';
    // Restore secondary style
    cancelBtn.style.background = 'transparent';
    cancelBtn.style.borderColor = 'rgba(255, 255, 255, 0.15)';
    cancelBtn.style.color = 'var(--text-dim)';
  }

  confirmModal.style.display = 'flex';
}

function closeModal() {
  pendingForm = null;
  document.getElementById('confirmModal').style.display = 'none';
  document.getElementById('loadingSection').style.display = 'none';
  document.getElementById('uploadSection').style.display = 'block';
  document.getElementById('scannedBox').classList.remove('scanning');
  setStep(1);

  // Re-enable the analyze button
  analyzeBtn.disabled = false;
  analyzeBtn.innerHTML = '✦ &nbsp; Reveal My Destiny &nbsp; ✦';
}

async function proceedAfterWarning() {
  document.getElementById('confirmModal').style.display = 'none';
  document.getElementById('uploadSection').style.display = 'none';
  document.getElementById('loadingSection').style.display = 'block';
  document.getElementById('scannedBox').classList.add('scanning');
  setStep(2);
  startRitualMessages();
  const form = pendingForm;
  pendingForm = null;
  await runFullAnalysis(form);
}

// ── ANALYZE ────────────────────────────────────────────────────
async function analyze() {
  if (!selectedFile) return;

  const lang = localStorage.getItem('astro_lang_preference') || 'en';
  const includeAstrology = document.getElementById('includeAstrology') ? document.getElementById('includeAstrology').checked : false;

  let dobInput = '';
  let relation = '';
  let name = '';

  if (includeAstrology) {
    const profile = window.AstroProfiles ? window.AstroProfiles.getActiveProfile() : null;
    if (!profile) {
      if (window.AstroProfiles) window.AstroProfiles.showModal();
      return;
    }
    dobInput = profile.dob;
    relation = profile.relation;
    name = profile.name;

    const selectedDate = new Date(dobInput);
    const today = new Date();
    if (selectedDate > today) {
      showModal(lang === 'en' ? 'Date of Birth cannot be in the future.' : 'ജനനത്തീയതി ഭാവിയിലാകാൻ പാടില്ല.', true);
      return;
    }
  }

  stopTts();

  // Debounce protection
  analyzeBtn.disabled = true;
  analyzeBtn.innerHTML = '✦ &nbsp; Scanning... &nbsp; ✦';

  setStep(2);
  document.getElementById('scannedBox').classList.add('scanning');
  document.getElementById('errorSection').style.display = 'none';

  try {
    // Compress once, reuse for both hand-detection and analysis
    let imageBlob;
    try {
      imageBlob = await compressImage(selectedFile, 512);
    } catch (e) {
      console.error("Compression failed, using original", e);
      imageBlob = selectedFile;
    }

    const userLang = localStorage.getItem('astro_lang_preference') || 'en';
    const dominance = document.querySelector('input[name="dominance"]:checked').value;

    const form = new FormData();
    form.append('file', imageBlob, 'palm.jpg');
    form.append('lang', userLang);
    if (dobInput) form.append('dob', dobInput);
    if (name) form.append('name', name);
    if (relation) form.append('relation', relation);
    form.append('dominance', dominance);

    // Show upload/loading UI before the (optional) hand-detection call
    document.getElementById('uploadSection').style.display = 'none';
    document.getElementById('loadingSection').style.display = 'block';
    document.getElementById('resultSection').style.display = 'none';
    document.getElementById('ritualText').textContent = 'Confirming hand orientation...';
    document.getElementById('ritualSub').textContent = 'Analyzing shape and alignment';

    // Optional hand-orientation check
    try {
      const detectForm = new FormData();
      detectForm.append('file', imageBlob, 'palm.jpg');
      detectForm.append('lang', userLang);

      const res = await fetch(`${API_URL}/detect-hand`, { method: 'POST', body: detectForm });
      const data = await res.json();

      if (data.status === 'success') {
        const detected = data.detected_hand; // 'left', 'right', 'undetermined'
        if (detected !== 'undetermined' && detected !== dominance) {
          document.getElementById('scannedBox').classList.remove('scanning');
          const selectedLabel = dominance === 'left' ? 'Left Hand' : 'Right Hand';
          const detectedLabel = detected === 'left' ? 'Left Hand' : 'Right Hand';
          pendingForm = form;
          showModal(`You selected your hand as "${selectedLabel}", but our analysis detected a "${detectedLabel}". Palm readings are most accurate when using the correct hand. Do you want to proceed anyway or go back and change your choice?`);
          return;
        }
      }
    } catch (err) {
      console.error("Hand detection failed, proceeding directly to analysis:", err);
    }

    // No mismatch (or detection skipped) — run the full analysis
    startRitualMessages();
    await runFullAnalysis(form);

  } catch (err) {
    stopRitualMessages();
    showError('Could not prepare your image. Please try again.');
  }
}

async function runFullAnalysis(form) {
  try {
    const res = await fetch(`${API_URL}/analyze-palm`, { method: 'POST', body: form });
    const data = await res.json();
    stopRitualMessages();
    document.getElementById('scannedBox').classList.remove('scanning');

    if (data.status === 'success') {
      if (data.scanned_image) {
        const el = document.getElementById('scannedImgEl');
        if (el) { el.src = data.scanned_image; el.style.filter = 'none'; }
      }
      parseAndRender(data.reading, data.tokens_used);
      setStep(3);
    } else {
      showError(data.message || 'Analysis failed');
    }
  } catch (err) {
    stopRitualMessages();
    showError('Could not connect to server. Is the backend running?');
  } finally {
    document.getElementById('loadingSection').style.display = 'none';
    analyzeBtn.disabled = false;
    analyzeBtn.innerHTML = '✦ &nbsp; Reveal My Destiny &nbsp; ✦';
  }
}

function showError(msg) {
  stopRitualMessages();
  document.getElementById('scannedBox').classList.remove('scanning');
  document.getElementById('loadingSection').style.display = 'none';
  document.getElementById('errorMsg').textContent = '🔮 ' + msg;
  document.getElementById('errorSection').style.display = 'block';
  document.getElementById('uploadSection').style.display = 'block';
  analyzeBtn.disabled = false;
  analyzeBtn.innerHTML = '✦ &nbsp; Reveal My Destiny &nbsp; ✦';
}

// ── PARSE + RENDER ─────────────────────────────────────────────
function parseAndRender(raw, tokensUsed) {
  try {
    const readingData = JSON.parse(raw);
    const userLang = localStorage.getItem('astro_lang_preference') || 'en';

    if (tokensUsed) readingData.tokens_used = tokensUsed;
    // Cache to sessionStorage based on lang
    sessionStorage.setItem(`palm_reading_${userLang}`, JSON.stringify(readingData));

    renderReadingJSON(readingData, userLang);

    document.getElementById('loadingSection').style.display = 'none';
    document.getElementById('resultSection').style.display = 'block';

    // smooth scroll
    setTimeout(() => {
      document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);

  } catch (e) {
    console.error("Failed to parse JSON", e);
    showError("Failed to interpret the reading.");
  }
}

function getSectionTitle(key, lang) {
  const tr = window.translations && window.translations[lang] ? window.translations[lang] : {};
  const map = {
    'personality': tr['palm_sec_personality'] || 'Personality',
    'strengths': tr['palm_sec_strengths'] || 'Strengths',
    'career': tr['palm_sec_career'] || 'Career & Finances',
    'relationships': tr['palm_sec_relationships'] || 'Relationships',
    'current_life_phase': tr['palm_sec_phase'] || 'Current Life Phase',
    'hidden_potential': tr['palm_sec_potential'] || 'Hidden Potential',
    'guidance': tr['palm_sec_guidance'] || 'Spiritual Guidance'
  };
  return map[key] || key;
}

function renderReadingJSON(data, lang) {
  const containerEn = document.getElementById('readingEn');
  const containerMl = document.getElementById('readingMl');

  let html = '';

  // Metadata Bar
  html += `<div style="background:var(--surface2); padding:15px; border-radius:10px; margin-bottom:20px; display:flex; flex-wrap:wrap; gap:10px; font-size:0.9rem; color:var(--text-dim); border:1px solid var(--gold-dim);">
          <span>${lang === 'en' ? 'Age' : 'പ്രായം'}: <b style="color:var(--text);">${data.age || '-'}</b></span> |
          <span>${lang === 'en' ? 'Zodiac' : 'രാശി'}: <b style="color:var(--text);">${data.zodiac_sign || '-'}</b></span> |
          <span>${lang === 'en' ? 'Element' : 'മൂലകം'}: <b style="color:var(--text);">${data.element || '-'}</b></span>
        </div>`;

  const sections = ['personality', 'strengths', 'career', 'relationships', 'current_life_phase', 'hidden_potential', 'guidance'];

  sections.forEach(sec => {
    if (data[sec]) {
      html += `<div class="r-section">
              <h3>${getSectionTitle(sec, lang)}</h3>
              <p>${escHtml(data[sec])}</p>
            </div>`;
    }
  });

  // Set content and toggle display
  if (lang === 'en') {
    containerEn.innerHTML = html;
    containerEn.style.display = 'block';
    containerMl.style.display = 'none';
  } else {
    containerMl.innerHTML = html;
    containerEn.style.display = 'none';
    containerMl.style.display = 'block';
  }

  // Stagger section animations
  const activeContainer = lang === 'en' ? containerEn : containerMl;
  const domSections = activeContainer.querySelectorAll('.r-section');
  domSections.forEach((s, i) => { s.style.animationDelay = `${i * 0.12}s` });

  // Update TTS label
  document.getElementById('ttsLabel').textContent =
    lang === 'en' ? '🔊 Hear the reading' : '🔊 വായന കേൾക്കാം';
  document.getElementById('ttsPlayBtn').textContent =
    lang === 'en' ? '▶ Speak' : '▶ കേൾക്കുക';
}

function escHtml(s) {
  if (!s) return "";
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

// ── LANGUAGE SWITCH ────────────────────────────────────────────
window.switchLang = function (lang) {
  currentLang = lang;
  stopTts();

  // Check if we are viewing the reading
  if (document.getElementById('resultSection').style.display === 'block') {
    const cached = sessionStorage.getItem(`palm_reading_${lang}`);
    if (cached) {
      renderReadingJSON(JSON.parse(cached), lang);
    } else {
      // Re-fetch since it's not cached in this language
      document.getElementById('resultSection').style.display = 'none';
      document.getElementById('loadingSection').style.display = 'flex';
      analyze();
    }
  }
};

// ── TTS ────────────────────────────────────────────────────────
let ttsChunks = [], ttsIdx = 0, ttsPaused = false, ttsAudio = null, nextTtsAudio = null, ttsActive = false;

function getReadingText() {
  const lang = localStorage.getItem('astro_lang_preference') || 'en';
  const cached = sessionStorage.getItem(`palm_reading_${lang}`);
  if (!cached) return "";
  const data = JSON.parse(cached);
  const sections = ['personality', 'strengths', 'career', 'relationships', 'current_life_phase', 'hidden_potential', 'guidance'];
  let fullText = "";
  sections.forEach(sec => {
    if (data[sec]) fullText += data[sec] + ". ";
  });
  return fullText;
}

function cleanForTts(t) {
  return t.replace(/#{1,4}/g, '').replace(/\*+/g, '').replace(/═+/g, '').replace(/━+/g, '').replace(/\s+/g, ' ').trim();
}

function handleTtsPlay() {
  stopTts();
  const text = cleanForTts(getReadingText());
  if (currentLang === 'ml') {
    const voices = window.speechSynthesis ? speechSynthesis.getVoices() : [];
    const hasMlVoice = voices.some(v => v.lang.toLowerCase().includes('ml'));
    if (hasMlVoice) {
      startBrowserTts(text, 'ml-IN');
    } else {
      startGoogleTts(text, 'ml');
    }
  } else {
    startBrowserTts(text, 'en-US');
  }
}

function handleTtsPause() {
  if (ttsAudio) {
    if (ttsAudio.paused) { ttsAudio.play(); }
    else { ttsAudio.pause(); }
  } else if (window.speechSynthesis) {
    if (speechSynthesis.paused) speechSynthesis.resume();
    else speechSynthesis.pause();
  }
}

function handleTtsStop() { stopTts(); }

function stopTts() {
  ttsActive = false; ttsPaused = false;
  if (ttsAudio) { ttsAudio.pause(); ttsAudio = null; }
  if (nextTtsAudio) { nextTtsAudio.pause(); nextTtsAudio = null; }
  if (window.speechSynthesis) speechSynthesis.cancel();
  document.getElementById('ttsWaves').classList.remove('active');
  document.getElementById('ttsPauseBtn').disabled = true;
  document.getElementById('ttsPlayBtn').disabled = false;
}

function setTtsPlaying(on) {
  document.getElementById('ttsWaves').classList.toggle('active', on);
  document.getElementById('ttsPauseBtn').disabled = !on;
  document.getElementById('ttsPlayBtn').disabled = on;
}

function startGoogleTts(text, lang) {
  // chunk by sentences
  ttsChunks = text.match(/[^.!?।\n]{1,150}[.!?।\n]?/g) || [text];
  ttsChunks = ttsChunks.map(s => s.trim()).filter(s => s.length > 2);
  ttsIdx = 0; ttsActive = true;
  setTtsPlaying(true);
  playChunk(lang);
}

function playChunk(lang) {
  if (!ttsActive || ttsIdx >= ttsChunks.length) { stopTts(); return; }

  if (nextTtsAudio && nextTtsAudio.dataset.idx === String(ttsIdx)) {
    ttsAudio = nextTtsAudio;
    nextTtsAudio = null;
  } else {
    const encoded = encodeURIComponent(ttsChunks[ttsIdx]);
    const url = `${API_URL}/tts?text=${encoded}&lang=${lang}`;
    ttsAudio = new Audio(url);
    ttsAudio.preservesPitch = false;
    ttsAudio.playbackRate = 0.82;
  }

  setTtsPlaying(true);

  ttsAudio.play().then(() => {
    // Preload next sentence chunk
    const nextIdx = ttsIdx + 1;
    if (nextIdx < ttsChunks.length) {
      const nextEncoded = encodeURIComponent(ttsChunks[nextIdx]);
      const nextUrl = `${API_URL}/tts?text=${nextEncoded}&lang=${lang}`;
      nextTtsAudio = new Audio(nextUrl);
      nextTtsAudio.dataset.idx = String(nextIdx);
      nextTtsAudio.preservesPitch = false;
      nextTtsAudio.playbackRate = 0.82;
      nextTtsAudio.load();
    }

    ttsAudio.onended = () => { ttsIdx++; playChunk(lang); };
  }).catch(() => {
    ttsIdx++; playChunk(lang);
  });

  ttsAudio.onerror = () => { ttsIdx++; playChunk(lang); };
}

function startBrowserTts(text, lang) {
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  // Lower pitch (0.65) and slower rate (0.76) to simulate a 65-70 year old voice
  utter.rate = 0.76;
  utter.pitch = 0.65;

  const voices = speechSynthesis.getVoices();

  // Try to find a male voice first (e.g. including 'male', 'valluvan', 'ravi', or 'david')
  let v = voices.find(v =>
    v.lang.toLowerCase().startsWith(lang.toLowerCase().split('-')[0]) &&
    (v.name.toLowerCase().includes('male') ||
      v.name.toLowerCase().includes('valluvan') ||
      v.name.toLowerCase().includes('ravi') ||
      v.name.toLowerCase().includes('david'))
  );

  if (!v) {
    v = voices.find(v => v.lang.toLowerCase() === lang.toLowerCase());
  }
  if (!v) {
    v = voices.find(v => v.lang.toLowerCase().startsWith(lang.toLowerCase().split('-')[0]));
  }
  if (!v && lang.startsWith('en')) {
    v = voices.find(v => v.lang.includes('en-IN') || v.lang.includes('en-GB'));
  }
  if (v) utter.voice = v;

  utter.onstart = () => setTtsPlaying(true);
  utter.onend = utter.onerror = () => stopTts();
  speechSynthesis.speak(utter);
  setTtsPlaying(true);
}

// ── RESET ──────────────────────────────────────────────────────
function resetApp() {
  stopTts();
  selectedFile = null;
  pendingForm = null;
  englishText = ''; malayalamText = '';
  fileInput.value = '';
  cameraInput.value = '';
  analyzeBtn.disabled = true;
  analyzeBtn.innerHTML = '✦ &nbsp; Reveal My Destiny &nbsp; ✦';
  document.getElementById('previewGrid').style.display = 'none';
  document.getElementById('originalImg').innerHTML = '';
  document.getElementById('scannedImg').innerHTML = '';
  document.getElementById('resultSection').style.display = 'none';
  document.getElementById('errorSection').style.display = 'none';
  document.getElementById('uploadSection').style.display = 'block';
  document.getElementById('readingEn').innerHTML = '';
  document.getElementById('readingMl').innerHTML = '';
  switchLang('en');
  setStep(1);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// voices preload
if (window.speechSynthesis) speechSynthesis.onvoiceschanged = () => { };
