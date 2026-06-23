const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8000'
  : 'https://ai-hastha-rekha.onrender.com';

const TRANSLATIONS = {
  en: {
    hero_title: "Astro Hub",
    hero_sub: "Your portal to cosmic guidance and ancient wisdom",
    palm_title: "Hastha Rekha",
    palm_desc: "Discover your destiny through ancient AI palm reading.",
    kili_title: "Kili Josyam",
    kili_desc: "Seek guidance from the mystical Kerala Parrot Astrologer.",
    loading_stars: "Aligning the stars...",
    dash_title: "Daily Cosmic Dashboard",
    lucky_color: "Lucky Color",
    lucky_number: "Lucky Number",
    lucky_direction: "Lucky Direction",
    lucky_time: "Lucky Time",
    today_focus: "🎯 Today's Focus",
    daily_reflection: "💭 Daily Reflection",
    motivation: "✨ Motivation",
    challenges_title: "Daily Challenges"
  },
  ml: {
    hero_title: "ആസ്ട്രോ ഹബ്",
    hero_sub: "ദിവ്യമായ മാർഗ്ഗനിർദ്ദേശങ്ങൾക്കും പുരാതന അറിവുകൾക്കുമായുള്ള ഇടം",
    palm_title: "ഹസ്തരേഖ",
    palm_desc: "നിങ്ങളുടെ ഭാവി എ.ഐ വഴി ഹസ്തരേഖയിലൂടെ അറിയുക.",
    kili_title: "കിളി ജ്യോതിഷം",
    kili_desc: "കേരളത്തിലെ തത്ത ജ്യോതിഷത്തിലൂടെ നിങ്ങളുടെ ഫലം അറിയുക.",
    loading_stars: "ഗ്രഹനിലകൾ ഒരുക്കുന്നു...",
    dash_title: "ഇന്നത്തെ ഫലങ്ങൾ",
    lucky_color: "ഭാഗ്യ നിറം",
    lucky_number: "ഭാഗ്യ നമ്പർ",
    lucky_direction: "ഭാഗ്യ ദിശ",
    lucky_time: "ഭാഗ്യ സമയം",
    today_focus: "🎯 ഇന്നത്തെ ലക്ഷ്യം",
    daily_reflection: "💭 ഇന്നത്തെ ചിന്ത",
    motivation: "✨ പ്രചോദനം",
    challenges_title: "ഇന്നത്തെ ലളിതമായ കാര്യങ്ങൾ"
  }
};

const ALL_CHALLENGES = {
  en: [
    "Help one person today without expecting anything back.",
    "Learn something new for 10 minutes.",
    "Practice gratitude: write down 3 things you are thankful for.",
    "Call a family member or an old friend.",
    "Spend 15 minutes completely without distractions or screens.",
    "Drink an extra glass of water and take 5 deep breaths.",
    "Compliment a stranger or a colleague today.",
    "Declutter one small area of your room or workspace.",
    "Go for a 15-minute mindful walk.",
    "Read an inspiring article or a chapter of a book."
  ],
  ml: [
    "പ്രതിഫലം ഇച്ഛിക്കാതെ ഒരാളെ സഹായിക്കുക.",
    "പുതിയതായി എന്തെങ്കിലും 10 മിനിറ്റ് പഠിക്കുക.",
    "നിങ്ങൾ നന്ദിയുള്ള 3 കാര്യങ്ങൾ എഴുതി വെക്കുക.",
    "ഒരു കുടുംബാംഗത്തെയോ പഴയ സുഹൃത്തിനെയോ വിളിക്കുക.",
    "മൊബൈൽ ഇല്ലാതെ 15 മിനിറ്റ് ശാന്തമായി ഇരിക്കുക.",
    "ഒരു ഗ്ലാസ്സ് വെള്ളം കൂടി കുടിക്കുക, 5 തവണ ദീർഘമായി ശ്വാസമെടുക്കുക.",
    "ഇന്ന് ഒരാളെ ആത്മാർത്ഥമായി അഭിനന്ദിക്കുക.",
    "നിങ്ങളുടെ മുറിയോ മേശയോ അല്പം വൃത്തിയാക്കുക.",
    "15 മിനിറ്റ് ശാന്തമായി നടക്കാൻ ഇറങ്ങുക.",
    "നല്ലൊരു പുസ്തകമോ ലേഖനമോ വായിക്കുക."
  ]
};

function getSavedLang() {
  return localStorage.getItem('astro_lang_preference');
}

function selectLanguage(lang) {
  localStorage.setItem('astro_lang_preference', lang);
  document.getElementById('langModal').style.display = 'none';

  applyTranslations();
  renderChallenges();
  fetchDashboard();
}

function applyTranslations() {
  const lang = getSavedLang() || 'en';
  const dict = TRANSLATIONS[lang];

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      el.textContent = dict[key];
    }
  });
}

function getTodayDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function getRandomChallenges(count) {
  const lang = getSavedLang() || 'en';
  const challengesList = ALL_CHALLENGES[lang];
  const shuffled = [...challengesList].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function handleCheckboxChange() {
  const checkboxes = document.querySelectorAll('.challenge-item input[type="checkbox"]');
  const states = Array.from(checkboxes).map(cb => cb.checked);
  localStorage.setItem('astro_challenges_state', JSON.stringify(states));
}

function renderChallenges() {
  const list = document.getElementById('challenges-list');
  const today = getTodayDateString();
  const lang = getSavedLang();

  if (!lang) return; // Wait for selection

  let selected = [];
  let states = [false, false, false];

  const savedDate = localStorage.getItem('astro_challenges_date');
  if (savedDate === today) {
    const savedData = localStorage.getItem('astro_challenges_data');
    if (savedData) selected = JSON.parse(savedData);

    const savedStates = localStorage.getItem('astro_challenges_state');
    if (savedStates) states = JSON.parse(savedStates);
  }

  if (selected.length !== 3) {
    selected = getRandomChallenges(3);
    states = [false, false, false];
    localStorage.setItem('astro_challenges_date', today);
    localStorage.setItem('astro_challenges_data', JSON.stringify(selected));
    localStorage.setItem('astro_challenges_state', JSON.stringify(states));
  }

  list.innerHTML = selected.map((challenge, index) => `
    <label class="challenge-item">
      <input type="checkbox" id="challenge-${index}" ${states[index] ? 'checked' : ''}>
      <span style="${lang === 'ml' ? 'font-family:\\\'Noto Sans Malayalam\\\', sans-serif;' : ''}">${challenge}</span>
    </label>
  `).join('');

  const checkboxes = document.querySelectorAll('.challenge-item input[type="checkbox"]');
  checkboxes.forEach(cb => cb.addEventListener('change', handleCheckboxChange));
}

function populateDashboardUI(dash) {
  document.getElementById('val-color').textContent = dash.lucky_color || '--';
  document.getElementById('val-number').textContent = dash.lucky_number || '--';
  document.getElementById('val-direction').textContent = dash.lucky_direction || '--';
  document.getElementById('val-time').textContent = dash.lucky_time || '--';

  document.getElementById('val-focus').textContent = dash.focus || '--';
  document.getElementById('val-reflection').textContent = dash.reflection || '--';
  document.getElementById('val-motivation').textContent = dash.motivation || '--';

  // Removed token display from UI as requested
}

async function fetchDashboard() {
  const lang = getSavedLang();
  if (!lang) return; // Wait for selection

  const loader = document.getElementById('dash-loader');
  const dataContainer = document.getElementById('dash-data');
  const today = getTodayDateString();
  const cacheKey = `astro_dashboard_data_${lang}`;
  const dateKey = `astro_dashboard_date_${lang}`;

  try {
    const savedDate = localStorage.getItem(dateKey);
    if (savedDate === today) {
      const savedData = localStorage.getItem(cacheKey);
      if (savedData) {
        const dash = JSON.parse(savedData);
        populateDashboardUI(dash);
        loader.style.display = 'none';
        dataContainer.style.display = 'block';
        return; // We have today's data cached!
      }
    }

    const res = await fetch(`${API_BASE}/daily-dashboard?lang=${lang}`);
    const data = await res.json();

    if (data.status === 'success' && data.dashboard) {
      const dash = data.dashboard;

      // Save for today (localized)
      localStorage.setItem(dateKey, today);
      localStorage.setItem(cacheKey, JSON.stringify(dash));

      populateDashboardUI(dash);
    } else {
      throw new Error("Invalid data format");
    }
  } catch (error) {
    console.error("Error fetching dashboard:", error);
    // Silent fail for UI, just shows --
  } finally {
    loader.style.display = 'none';
    dataContainer.style.display = 'block';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const lang = getSavedLang();
  if (!lang) {
    document.getElementById('langModal').style.display = 'flex';
  } else {
    applyTranslations();
    renderChallenges();
    fetchDashboard();
  }
});
