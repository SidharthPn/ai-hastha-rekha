/* ─── THEME LOGIC ───────────────────────────────────────── */
const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
document.documentElement.setAttribute('data-theme', savedTheme);

document.addEventListener('DOMContentLoaded', () => {
    // Wake up backend to avoid cold start delays
    const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:8000'
        : 'https://ai-hastha-rekha.onrender.com';
    fetch(`${API_URL}/`).catch(() => {});

    const themeToggler = document.getElementById('themeToggler');
    if (themeToggler) {
        themeToggler.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
        });
    }
});

/* ─── COSMOS CANVAS ─────────────────────────────────────── */
const bgCanvas = document.getElementById('cosmosCanvas');
if (bgCanvas) {
    const bgCtx = bgCanvas.getContext('2d');

    let bgStars = [];
    const numStars = 150;

    function resizeCanvas() {
        bgCanvas.width = window.innerWidth;
        bgCanvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    class Star {
        constructor() {
            this.x = Math.random() * bgCanvas.width;
            this.y = Math.random() * bgCanvas.height;
            this.size = Math.random() * 1.5 + 0.5;
            this.speedY = Math.random() * 0.2 + 0.05;
            this.alpha = Math.random();
            this.alphaChange = (Math.random() * 0.02) - 0.01;
        }
        update() {
            this.y -= this.speedY;
            if (this.y < 0) {
                this.y = bgCanvas.height;
                this.x = Math.random() * bgCanvas.width;
            }
            this.alpha += this.alphaChange;
            if (this.alpha <= 0 || this.alpha >= 1) this.alphaChange *= -1;
        }
        draw() {
            bgCtx.fillStyle = `rgba(201, 168, 76, ${this.alpha})`;
            bgCtx.beginPath();
            bgCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            bgCtx.fill();
        }
    }

    for (let i = 0; i < numStars; i++) {
        bgStars.push(new Star());
    }

    function animateCosmos() {
        bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
        bgStars.forEach(star => {
            star.update();
            star.draw();
        });
        requestAnimationFrame(animateCosmos);
    }
    animateCosmos();
}


/* ─── NAVIGATION DRAWER ─────────────────────────────────── */
const navDrawer = document.getElementById('navDrawer');
function openDrawer() {
    navDrawer.classList.add('open');
}
function closeDrawer() {
    navDrawer.classList.remove('open');
}


/* ─── AMBIENT MUSIC ─────────────────────────────────────── */
let audioCtx = null;
let masterGain = null;
let filterLfo = null;
let lfoNode = null;
let filter = null;
let musicPlaying = false;

function buildMantraAudio() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.15; // slightly louder
  masterGain.connect(audioCtx.destination);
  
  filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 400;
  filter.connect(masterGain);

  const baseFreq = 136.1;
  const numOscs = 4;
  const oscillators = [];

  const ratios = [1, 1.01, 0.99, 2];
  ratios.forEach((ratio, i) => {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    
    osc.type = i % 2 === 0 ? 'sine' : 'triangle';
    osc.frequency.value = baseFreq * ratio;
    
    g.gain.value = 0.8 / numOscs;
    osc.connect(g); g.connect(filter);
    osc.start();
    oscillators.push({ osc, g });
  });

  function playBell() {
    if (!musicPlaying) return;
    const bellFreqs = [544, 816, 1088];
    bellFreqs.forEach(f => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0, audioCtx.currentTime);
      g.gain.linearRampToValueAtTime(0.015, audioCtx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 4);
      o.connect(g); g.connect(filter);
      o.start(); o.stop(audioCtx.currentTime + 4.5);
    });
    const delay = 8000 + Math.random() * 10000;
    setTimeout(playBell, delay);
  }
  setTimeout(playBell, 4000);

  filterLfo = audioCtx.createOscillator();
  const filterLfoGain = audioCtx.createGain();
  filterLfo.type = 'sine';
  filterLfo.frequency.value = 0.05; 
  filterLfoGain.gain.value = 100; 
  filterLfo.connect(filterLfoGain);
  filterLfoGain.connect(filter.frequency);
  filterLfo.start();

  lfoNode = audioCtx.createOscillator();
  const lfoGain = audioCtx.createGain();
  lfoNode.frequency.value = 0.08;
  lfoGain.gain.value = 0.012;
  lfoNode.connect(lfoGain);
  lfoGain.connect(masterGain.gain);
  lfoNode.start();
}

function toggleMusic() {
    const musicBtn = document.getElementById('musicBtn');
    const musicWaves = document.getElementById('musicWaves');
    if (!musicBtn || !musicWaves) return;

    if (!musicPlaying) {
        if (!audioCtx) buildMantraAudio();
        else {
            audioCtx.resume();
            masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
            masterGain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 1);
        }
        musicPlaying = true;
        musicBtn.textContent = '⏸';
        musicWaves.classList.add('playing');
    } else {
        if(masterGain) {
            masterGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.5);
            setTimeout(() => { if(!musicPlaying) audioCtx.suspend(); }, 1600);
        }
        musicPlaying = false;
        musicBtn.textContent = '▶';
        musicWaves.classList.remove('playing');
    }
}


/* ─── HOROSCOPE TAB LOGIC ───────────────────────────────── */
const horoTabs = document.querySelectorAll('.tab-btn');
horoTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        horoTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
    });
});

function goRashi(rashi) {
    const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
    window.location.href = `horoscope.html?rashi=${rashi}&period=${activeTab}`;
}


/* ─── DAILY CHALLENGES ──────────────────────────────────── */
const streakPips = document.getElementById('streakPips');
if (streakPips) {
    for (let i = 1; i <= 7; i++) {
        const pip = document.createElement('div');
        pip.className = 'day-pip' + (i <= 6 ? ' done' : '') + (i === 6 ? ' today' : '');
        pip.textContent = i <= 6 ? '✓' : i;
        streakPips.appendChild(pip);
    }
}

const tasks = [
    { label: 'Read daily horoscope', done: true },
    { label: 'Chant mantra 11 times', done: true },
    { label: 'Light a lamp / diya', done: true },
    { label: 'Express gratitude', done: false },
    { label: 'Consult AI Guru', done: false }
];

const taskList = document.getElementById('taskList');
function renderTasks() {
    if (!taskList) return;
    taskList.innerHTML = '';
    let doneCount = 0;
    tasks.forEach((task, idx) => {
        if (task.done) doneCount++;
        const tItem = document.createElement('div');
        tItem.className = 'task-item';
        tItem.innerHTML = `
      <div class="task-check ${task.done ? 'done' : ''}">${task.done ? '✓' : ''}</div>
      <div class="task-label ${task.done ? 'done' : ''}">${task.label}</div>
    `;
        tItem.addEventListener('click', () => {
            tasks[idx].done = !tasks[idx].done;
            renderTasks();
        });
        taskList.appendChild(tItem);
    });
    const taskCount = document.getElementById('taskCount');
    if (taskCount) taskCount.textContent = `${doneCount} / ${tasks.length} done`;
}
if (taskList) renderTasks();


/* ─── AI GURU CHAT ──────────────────────────────────────── */
const chatWindow = document.getElementById('chatWindow');
const guruInput = document.getElementById('guruInput');

function appendMessage(sender, text) {
    if (!chatWindow) return;
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-msg ${sender === 'user' ? 'user-msg' : ''}`;

    const avatarDiv = document.createElement('div');
    avatarDiv.className = `chat-avatar ${sender}`;
    avatarDiv.textContent = sender === 'user' ? '🙏' : '🕉️';

    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = `chat-bubble ${sender === 'user' ? 'user-b' : ''}`;
    bubbleDiv.textContent = text;

    msgDiv.appendChild(avatarDiv);
    msgDiv.appendChild(bubbleDiv);
    chatWindow.appendChild(msgDiv);

    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function askGuru() {
    if (!guruInput) return;
    const text = guruInput.value.trim();
    if (!text) return;

    appendMessage('user', text);
    guruInput.value = '';

    // Simulate AI Response
    setTimeout(() => {
        appendMessage('guru', 'Your path is guided by your actions. Trust in the cosmic alignment, and the answers will reveal themselves.');
    }, 1000);
}

function quickAsk(q) {
    if (!guruInput) return;
    guruInput.value = q;
    askGuru();
}

if (guruInput) {
    guruInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') askGuru();
    });
}
/* -- KILI DAILY FORTUNE WIDGET -- */
let dailyKiliCards = [];
let selectedDailyCard = null;

async function loadFortuneCards() {
    try {
        const res = await fetch("data/kili_cards.json");
        const cards = await res.json();
        // pick 3 random unique cards
        const shuffled = cards.sort(() => 0.5 - Math.random());
        dailyKiliCards = shuffled.slice(0, 3);

        const lang = localStorage.getItem('astro_lang_preference') || 'en';
        // preload back data to DOM
        for (let i = 0; i < 3; i++) {
            document.getElementById(`fcSym${i}`).textContent = dailyKiliCards[i].icon;
            document.getElementById(`fcName${i}`).textContent = (lang === 'ml' && dailyKiliCards[i].ml_name) ? dailyKiliCards[i].ml_name : dailyKiliCards[i].name;
        }
    } catch (e) {
        console.error("Failed to load kili cards", e);
    }
}

function pickFortuneCard(index) {
    if (selectedDailyCard) return; // already picked one
    selectedDailyCard = dailyKiliCards[index];

    // Flip chosen card
    const cards = document.querySelectorAll(".fortune-card");
    cards[index].classList.add("flipped");

    // Dim the other cards
    cards.forEach((c, i) => {
        if (i !== index) {
            c.style.opacity = "0.3";
            c.style.pointerEvents = "none";
        }
    });

    // Show result text
    setTimeout(() => {
        const lang = localStorage.getItem('astro_lang_preference') || 'en';
        const msg = (lang === 'ml' && selectedDailyCard.ml_short_message) ? selectedDailyCard.ml_short_message : selectedDailyCard.short_message;
        document.getElementById("fcShortMsg").textContent = `"${msg}"`;
        document.getElementById("fortuneResult").style.display = "block";
    }, 600);
}

function continueToKili() {
    if (selectedDailyCard) {
        sessionStorage.setItem("kili_daily_card", JSON.stringify(selectedDailyCard));
        window.location.href = "kili.html";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("fortuneWidget")) {
        loadFortuneCards();
    }
});
