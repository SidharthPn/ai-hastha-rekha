document.addEventListener('DOMContentLoaded', () => {
    initDailyDashboard();
});

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8000'
  : 'https://ai-hastha-rekha.onrender.com';

async function initDailyDashboard() {
    const activeProfile = window.AstroProfiles ? window.AstroProfiles.getActiveProfile() : null;
    
    if (!activeProfile) {
        document.getElementById('loadingOverlay').style.display = 'none';
        document.getElementById('dashboardWarning').style.display = 'block';
        return;
    }

    // Update streak
    updateStreak();

    // Populate user info
    const currentLang = localStorage.getItem('astro_lang_preference') || 'en';
    const welcomeMsg = document.getElementById('welcomeMessage');
    welcomeMsg.innerText = currentLang === 'ml' 
        ? `സുപ്രഭാതം, ${activeProfile.name}.` 
        : `Good Morning, ${activeProfile.name}.`;

    document.getElementById('astroZodiac').innerText = activeProfile.zodiac || '-';

    // Fetch API Data
    await fetchDashboardData(activeProfile);

    // Calculate Panchangam
    calculatePanchangam();

    // Show Dashboard
    document.getElementById('loadingOverlay').style.display = 'none';
    const dashContent = document.getElementById('dashboardContent');
    dashContent.style.display = 'block';
    // tiny delay to allow display block to apply before opacity transition
    setTimeout(() => dashContent.style.opacity = '1', 50);
}

function updateStreak() {
    const today = new Date().toDateString();
    let streakData = JSON.parse(localStorage.getItem('jyotish_streak') || '{"count":0, "lastVisit":""}');

    if (streakData.lastVisit !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (streakData.lastVisit === yesterday.toDateString()) {
            streakData.count += 1;
        } else {
            // Missed a day or first time
            streakData.count = 1;
        }
        streakData.lastVisit = today;
        localStorage.setItem('jyotish_streak', JSON.stringify(streakData));
    }

    const currentLang = localStorage.getItem('astro_lang_preference') || 'en';
    const countLabel = currentLang === 'ml' ? 'ദിവസം' : 'Day Streak';
    document.getElementById('streakCount').innerText = `${streakData.count} ${countLabel}`;
}

async function fetchDashboardData(profile) {
    const lang = localStorage.getItem('astro_lang_preference') || 'en';
    const dob = profile.dob || ''; // YYYY-MM-DD
    
    try {
        const res = await fetch(`${API_BASE}/daily-dashboard?lang=${lang}&dob=${dob}`);
        const data = await res.json();

        if (data.status === 'success' && data.dashboard) {
            renderDashboard(data.dashboard);
        } else {
            console.error("Failed to load dashboard:", data);
            document.getElementById('loadingText').innerText = "Failed to align stars. Try again later.";
        }
    } catch (e) {
        console.error("API Error:", e);
        document.getElementById('loadingText').innerText = "Network Error.";
    }
}

function renderDashboard(dash) {
    // Energy Score
    document.getElementById('energyScoreVal').innerText = `${dash.energy_score || 0}%`;
    document.getElementById('energyDesc').innerText = dash.energy_explanation || '';
    
    // Stars
    let score = dash.energy_score || 0;
    let stars = '☆☆☆☆☆';
    if(score >= 90) stars = '⭐⭐⭐⭐⭐';
    else if(score >= 70) stars = '⭐⭐⭐⭐☆';
    else if(score >= 50) stars = '⭐⭐⭐☆☆';
    else if(score >= 30) stars = '⭐⭐☆☆☆';
    else stars = '⭐☆☆☆☆';
    document.getElementById('energyStars').innerText = stars;

    // Ratings
    if (dash.ratings) {
        setRating('Career', dash.ratings.career);
        setRating('Finance', dash.ratings.finance);
        setRating('Love', dash.ratings.love);
        setRating('Health', dash.ratings.health);
        setRating('Family', dash.ratings.family);
    }

    // Best Activities (Chips)
    const chipContainer = document.getElementById('bestActivitiesContainer');
    chipContainer.innerHTML = '';
    if (dash.best_activities) {
        dash.best_activities.forEach(act => {
            const span = document.createElement('span');
            span.className = 'astro-chip';
            span.innerHTML = `✨ ${act}`;
            chipContainer.appendChild(span);
        });
    }

    // Guru Insight
    document.getElementById('guruInsightText').innerText = dash.guru_insight || '-';

    // Do / Avoid Lists
    populateList('doList', dash.do_activities, '✓', '#4ade80');
    populateList('avoidList', dash.avoid_activities, '✕', '#f87171');

    // Focus / Reflection / Motivation
    document.getElementById('dailyFocus').innerText = dash.focus || '-';
    document.getElementById('dailyReflection').innerText = dash.reflection || '-';
    document.getElementById('dailyMotivation').innerText = `"${dash.motivation || '-'}"`;

    // Lucky Elements
    document.getElementById('luckyColor').innerText = dash.lucky_color || '-';
    document.getElementById('luckyNumber').innerText = dash.lucky_number || '-';
    document.getElementById('luckyDirection').innerText = dash.lucky_direction || '-';
    document.getElementById('luckyTime').innerText = dash.lucky_time || '-';

    // Spiritual
    document.getElementById('dailyMantra').innerText = dash.mantra || '-';
    document.getElementById('dailyAffirmation').innerText = dash.affirmation || '-';

    // Astrology Details
    document.getElementById('astroNakshatra').innerText = dash.nakshatra || '-';
    document.getElementById('astroMoon').innerText = dash.moon_phase || '-';
    document.getElementById('astroPlanet').innerText = dash.planetary_influence || '-';
}

function setRating(id, val) {
    const valEl = document.getElementById(`val${id}`);
    const barEl = document.getElementById(`bar${id}`);
    if (valEl && barEl) {
        valEl.innerText = `${val}/10`;
        // timeout to allow CSS transition to happen after display block
        setTimeout(() => {
            barEl.style.width = `${val * 10}%`;
        }, 100);
    }
}

function populateList(id, items, icon, color) {
    const list = document.getElementById(id);
    list.innerHTML = '';
    if (items && items.length > 0) {
        items.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `<span style="color:${color}; font-weight:bold;">${icon}</span> ${item}`;
            list.appendChild(li);
        });
    } else {
        list.innerHTML = `<li>-</li>`;
    }
}

function calculatePanchangam() {
    // Very simplified Panchangam math based on standard weekday assignments
    // Assuming standard 6:00 AM sunrise to 6:00 PM sunset interval (1.5h slots)
    const day = new Date().getDay(); // 0 = Sun, 1 = Mon...
    
    const rahuSlots = [
        "04:30 PM - 06:00 PM", // Sun
        "07:30 AM - 09:00 AM", // Mon
        "03:00 PM - 04:30 PM", // Tue
        "12:00 PM - 01:30 PM", // Wed
        "01:30 PM - 03:00 PM", // Thu
        "10:30 AM - 12:00 PM", // Fri
        "09:00 AM - 10:30 AM"  // Sat
    ];

    const yamaSlots = [
        "12:00 PM - 01:30 PM", // Sun
        "10:30 AM - 12:00 PM", // Mon
        "09:00 AM - 10:30 AM", // Tue
        "07:30 AM - 09:00 AM", // Wed
        "06:00 AM - 07:30 AM", // Thu
        "03:00 PM - 04:30 PM", // Fri
        "01:30 PM - 03:00 PM"  // Sat
    ];

    const gulikaSlots = [
        "03:00 PM - 04:30 PM", // Sun
        "01:30 PM - 03:00 PM", // Mon
        "12:00 PM - 01:30 PM", // Tue
        "10:30 AM - 12:00 PM", // Wed
        "09:00 AM - 10:30 AM", // Thu
        "07:30 AM - 09:00 AM", // Fri
        "06:00 AM - 07:30 AM"  // Sat
    ];

    document.getElementById('panchRahu').innerText = rahuSlots[day];
    document.getElementById('panchYama').innerText = yamaSlots[day];
    document.getElementById('panchGulika').innerText = gulikaSlots[day];
    document.getElementById('panchAbhijit').innerText = "11:45 AM - 12:30 PM"; // Standard approximate
}

function askGuruAboutToday() {
    const focus = document.getElementById('dailyFocus').innerText;
    const score = document.getElementById('energyScoreVal').innerText;
    const context = `Context: Today's energy score is ${score}. Focus is: ${focus}.`;
    sessionStorage.setItem('guru_dashboard_context', context);
    window.location.href = 'guru.html';
}

// Ensure the langToggler updates dashboard if clicked
const dashLangToggle = document.getElementById('langToggler');
if (dashLangToggle) {
    const originalClick = dashLangToggle.onclick;
    dashLangToggle.addEventListener('click', () => {
        // give i18n a moment to switch window.currentLang
        setTimeout(() => {
            document.getElementById('dashboardContent').style.opacity = '0.3';
            initDailyDashboard();
        }, 100);
    });
}
