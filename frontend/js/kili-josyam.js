let SYMBOLIC_CARDS = [];
let currentCircleCards = [];
let selectedDeity = null;
let selectedCircleIndex = 0;
let dobInput = "";
let readingPromise = null;

const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8000'
  : 'https://ai-hastha-rekha.onrender.com';

// Three.js variables
let scene, camera, renderer, parrot, clock;
let bodyGroup, neckGroup, headGroup, tailGroup, bodyMesh;

document.addEventListener('DOMContentLoaded', async () => {
  // Wake up backend to avoid cold start delays
  fetch(`${API_URL}/`).catch(() => {});

  // Fetch cards
  try {
    const res = await fetch("data/kili_cards.json");
    SYMBOLIC_CARDS = await res.json();
  } catch (e) {
    console.error("Failed to load cards", e);
  }

  const btnBegin = document.getElementById('btn-begin');
  const btnOpenCage = document.getElementById('btn-open-cage');
  const btnRestart = document.getElementById('btn-restart');

  btnBegin.addEventListener('click', () => {
    const profile = window.AstroProfiles ? window.AstroProfiles.getActiveProfile() : null;
    if (!profile) {
      if (window.AstroProfiles) window.AstroProfiles.showModal();
      return;
    }
    dobInput = profile.dob;
    switchScreen('screen1', 'screen2');
    initCards();
  });

  btnOpenCage.addEventListener('click', () => {
    btnOpenCage.style.display = 'none';
    startAnimationSequence();
  });

  btnRestart.addEventListener('click', () => {
    window.location.reload();
  });

  document.addEventListener('langChanged', () => {
    if (document.getElementById('screen2').classList.contains('active')) {
      initCards(); // Re-render the spinning cards with new language
    }
    if (document.getElementById('screen3').classList.contains('active') && selectedDeity) {
      displayResult();
      document.getElementById('loading-reading').style.display = 'flex';
      document.getElementById('reading-content').style.display = 'none';
      readingPromise = preloadReadingData();
      renderReadingFromPromise();
    }
    const ttsLabel = document.getElementById('ttsLabel');
    if (ttsLabel) {
      const lang = localStorage.getItem('astro_lang_preference') || 'en';
      ttsLabel.textContent = lang === 'en' ? '🔊 Hear the reading' : '🔊 വായന കേൾക്കാം';
      document.getElementById('ttsPlayBtn').textContent = lang === 'en' ? '▶ Speak' : '▶ കേൾക്കുക';
      stopTts();
    }
  });

  const dailyCardStr = sessionStorage.getItem("kili_daily_card");
  if (dailyCardStr && SYMBOLIC_CARDS.length > 0) {
    sessionStorage.removeItem("kili_daily_card");
    window.kiliDailyCard = JSON.parse(dailyCardStr);
    setTimeout(() => {
      const profile = window.AstroProfiles ? window.AstroProfiles.getActiveProfile() : null;
      if (profile) {
        dobInput = profile.dob;
        switchScreen('screen1', 'screen2');
        initCards(window.kiliDailyCard);
        setTimeout(() => {
          btnOpenCage.style.display = 'none';
          startAnimationSequence(window.kiliDailyCard);
        }, 1000);
      } else {
        if (window.AstroProfiles) window.AstroProfiles.showModal();
      }
    }, 500);
  }
});

function initThreeJS() {
  const container = document.getElementById('bird-area');
  if (container.children.length > 0) return; // already initialized

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(40, (container.clientWidth || window.innerWidth) / (container.clientHeight || 450), 0.1, 100);
  camera.position.set(0, 3.5, 6);
  camera.lookAt(0, 0.8, 0);

  renderer = new THREE.WebGLRenderer({alpha: true, antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || 450);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  
  setTimeout(() => {
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || 450);
  }, 100);

  const ambientLight = new THREE.AmbientLight(0xfff5ea, 0.4);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
  keyLight.position.set(4, 8, 4);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.bias = -0.001;
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x90b0ff, 0.6);
  rimLight.position.set(-4, 3, -4);
  scene.add(rimLight);

  parrot = new THREE.Group();
  
  const featherGreen = new THREE.MeshStandardMaterial({ color: 0x44aa22, roughness: 0.85, metalness: 0.0 });
  const wingGreen = new THREE.MeshStandardMaterial({ color: 0x338811, roughness: 0.8, metalness: 0.0 });
  const beakRed = new THREE.MeshStandardMaterial({ color: 0xcc1111, roughness: 0.3, metalness: 0.1 });
  const ringBlack = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.1, metalness: 0.9 });
  const clawMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.7 });

  bodyGroup = new THREE.Group();
  neckGroup = new THREE.Group();
  headGroup = new THREE.Group();

  const bodyGeo = new THREE.SphereGeometry(0.35, 32, 32);
  bodyGeo.scale(1, 1.4, 1.1);
  bodyMesh = new THREE.Mesh(bodyGeo, featherGreen);
  bodyMesh.position.y = 0.4;
  bodyMesh.castShadow = true;
  bodyGroup.add(bodyMesh);

  tailGroup = new THREE.Group();
  const tailGeo = new THREE.ConeGeometry(0.08, 1.2, 16);
  tailGeo.scale(1, 1, 0.3);
  const tail = new THREE.Mesh(tailGeo, wingGreen);
  tail.position.y = -0.5;
  tail.rotation.x = -Math.PI / 8;
  tail.castShadow = true;
  tailGroup.add(tail);
  tailGroup.position.set(0, 0.1, -0.2);
  bodyGroup.add(tailGroup);

  const wingGeo = new THREE.SphereGeometry(0.12, 16, 16);
  wingGeo.scale(0.5, 1.8, 1.8);
  
  const wingL = new THREE.Mesh(wingGeo, wingGreen);
  wingL.position.set(0.32, 0.4, 0.05);
  wingL.rotation.set(0.2, 0, -0.1);
  wingL.castShadow = true;

  const wingR = wingL.clone();
  wingR.position.x = -0.32;
  wingR.rotation.z = 0.1;
  bodyGroup.add(wingL, wingR);

  const legBoneGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8);
  const legBoneL = new THREE.Mesh(legBoneGeo, clawMat);
  legBoneL.position.set(0.15, -0.05, 0.1);
  legBoneL.rotation.x = Math.PI / 6;
  
  const legBoneR = legBoneL.clone();
  legBoneR.position.x = -0.15;
  bodyGroup.add(legBoneL, legBoneR);

  const neckGeo = new THREE.CylinderGeometry(0.22, 0.25, 0.15, 32);
  const neckMesh = new THREE.Mesh(neckGeo, featherGreen);
  const collarGeo = new THREE.CylinderGeometry(0.23, 0.24, 0.04, 32);
  const collarMesh = new THREE.Mesh(collarGeo, ringBlack);
  collarMesh.position.y = -0.03;
  neckGroup.add(neckMesh, collarMesh);
  neckGroup.position.set(0, 0.8, 0.1);
  bodyGroup.add(neckGroup);

  const headGeo = new THREE.SphereGeometry(0.23, 32, 32);
  headGeo.scale(1, 1.05, 1.1);
  const headMesh = new THREE.Mesh(headGeo, featherGreen);
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  const eyeGeo = new THREE.SphereGeometry(0.035, 16, 16);
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(0.15, 0.05, 0.16);
  const eyeR = eyeL.clone();
  eyeR.position.x = -0.15;
  headGroup.add(eyeL, eyeR);

  const beakUpperGeo = new THREE.ConeGeometry(0.09, 0.28, 16);
  beakUpperGeo.scale(1, 1, 1.3);
  const beakUpper = new THREE.Mesh(beakUpperGeo, beakRed);
  beakUpper.position.set(0, -0.02, 0.24);
  beakUpper.rotation.set(Math.PI / 2 + 0.3, 0, 0);
  beakUpper.castShadow = true;
  headGroup.add(beakUpper);

  headGroup.position.set(0, 0.1, 0);
  neckGroup.add(headGroup);

  parrot.add(bodyGroup);
  
  parrot.scale.set(1.3, 1.3, 1.3);
  parrot.position.set(0, 0.5, 1.2); 
  scene.add(parrot);

  if (typeof gsap !== 'undefined') {
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.5 });
    tl.to(parrot.position, { z: 0.1, y: 0, duration: 1.5, ease: "power1.inOut" })
      .to(bodyGroup.position, { y: 0.05, duration: 0.4, yoyo: true, repeat: 3 }, 0)
      .to(tailGroup.rotation, { x: -Math.PI / 6, duration: 0.7, yoyo: true, repeat: 1 }, 0)
      .to(headGroup.rotation, { y: 0.5, duration: 0.5, ease: "power2.out", delay: 0.2 })
      .to(headGroup.rotation, { y: -0.5, duration: 0.6, ease: "power2.out", delay: 0.3 })
      .to(headGroup.rotation, { y: 0, duration: 0.3 })
      .to(bodyGroup.position, { y: -0.12, duration: 0.35, ease: "back.in(1.4)" })
      .to(neckGroup.rotation, { x: 0.6, duration: 0.35, ease: "back.in(1.4)" }, "<")
      .to(headGroup.rotation, { x: 0.3, duration: 0.35, ease: "back.in(1.4)" }, "<")
      .to(bodyGroup.position, { y: 0.15, duration: 0.3, delay: 0.2, ease: "back.out(2)" })
      .to(neckGroup.rotation, { x: -0.2, duration: 0.3, ease: "back.out(2)" }, "<")
      .to(headGroup.rotation, { x: -0.1, duration: 0.3, ease: "back.out(2)" }, "<")
      .to(headGroup.rotation, { y: 0.2, duration: 0.4, yoyo: true, repeat: 3, delay: 0.5 })
      .to(parrot.position, { z: 1.2, y: 0.5, duration: 1.6, ease: "power1.inOut" })
      .to(bodyGroup.position, { y: 0, duration: 0.5 }, "<")
      .to(neckGroup.rotation, { x: 0, duration: 0.5 }, "<")
      .to(headGroup.rotation, { x: 0, y: 0, duration: 0.5 }, "<");
  }

  clock = new THREE.Clock();
  
  window.addEventListener('resize', () => {
    if (!camera || !renderer) return;
    camera.aspect = (container.clientWidth || window.innerWidth) / (container.clientHeight || 450);
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || 450);
  });

  window.addEventListener('mousemove', (e) => {
    const nx = (e.clientX / window.innerWidth - 0.5) * 2;
    const ny = (e.clientY / window.innerHeight - 0.5) * 2;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, nx * 0.4, 0.05);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 3.5 - (ny * 0.25), 0.05);
    camera.lookAt(0, 0.8, 0); 
  });

  animateThreeJS();
}

function animateThreeJS() {
  requestAnimationFrame(animateThreeJS);
  
  if (clock && typeof gsap !== 'undefined') {
    const time = clock.getElapsedTime();
    if(gsap.isTweening(bodyGroup) === false) {
        bodyMesh.rotation.z = Math.sin(time * 2) * 0.015;
        tailGroup.rotation.z = Math.cos(time * 1.5) * 0.02;
    }
  }

  renderer.render(scene, camera);
}

function switchScreen(hideId, showId) {
  document.getElementById(hideId).classList.remove('active');
  document.getElementById(showId).classList.add('active');
}

function shuffle(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

function drawCardByWeight() {
  let totalWeight = SYMBOLIC_CARDS.reduce((sum, card) => sum + card.weight, 0);
  let rand = Math.random() * totalWeight;
  for (let card of SYMBOLIC_CARDS) {
    if (rand < card.weight) return card;
    rand -= card.weight;
  }
  return SYMBOLIC_CARDS[0];
}

function initCards(overrideCard = null) {
  const container = document.getElementById('cards-container');
  container.innerHTML = '';

  const radius = window.innerWidth < 600 ? 120 : 200;
  const lang = localStorage.getItem('astro_lang_preference') || 'en';

  if (overrideCard) {
    selectedDeity = overrideCard;
  } else {
    selectedDeity = drawCardByWeight();
  }

  let others = SYMBOLIC_CARDS.filter(c => c.id !== selectedDeity.id);
  others = shuffle(others).slice(0, 11);

  currentCircleCards = [selectedDeity, ...others];
  currentCircleCards = shuffle(currentCircleCards);

  selectedCircleIndex = currentCircleCards.findIndex(c => c.id === selectedDeity.id);

  currentCircleCards.forEach((deity, index) => {
    const card = document.createElement('div');
    card.className = 'deity-card';
    card.id = `card-${index}`;

    const totalAngle = Math.PI;
    const step = totalAngle / (currentCircleCards.length - 1);
    const angle = Math.PI - (index * step);

    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * (radius * 0.5) + 50;

    card.style.left = `calc(50% + ${x}px - 30px)`;
    card.style.bottom = `${y}px`;
    card.style.transform = `rotate(${90 - (angle * 180 / Math.PI)}deg)`;

    card.innerHTML = `
      <div class="card-inner">
        <div class="card-back"></div>
        <div class="card-front" style="background-image: url('assets/images/card.png'); background-blend-mode: overlay; background-color: rgba(0,0,0,0.7);">
          <div style="font-size: 2rem;">${deity.icon}</div>
          <div style="font-size: 0.6rem; font-weight: bold; color: #d4af37; margin-top: 5px; text-align: center;">${lang === 'ml' && deity.ml_name ? deity.ml_name : deity.name}</div>
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

function calculateAge(dobString) {
  const diff = Date.now() - new Date(dobString).getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

function startAnimationSequence(dailyCardOverride = null) {
  const cards = document.querySelectorAll('.deity-card');
  const audioBell = document.getElementById('audio-bell');
  const birdArea = document.getElementById('bird-area');
  const cageDisplay = document.getElementById('cage-display');
  const doorDisplay = document.getElementById('door-display');

  if (dailyCardOverride) {
    selectedDeity = dailyCardOverride;
  }

  const targetCard = document.getElementById(`card-${selectedCircleIndex}`);

  // PRELOAD API READING NOW (saves 5.5 seconds + hides latency)
  readingPromise = preloadReadingData();

  // Hide cage, show glowing door
  cageDisplay.style.display = 'none';
  doorDisplay.style.display = 'flex';

  // Wait 1 second for glowing door, then show 3D parrot
  setTimeout(() => {
    doorDisplay.style.display = 'none';
    birdArea.style.display = 'block';
    initThreeJS();
  }, 1000);

  // Wait 1.5 seconds, then show cards
  setTimeout(() => cards.forEach(c => c.classList.add('appear')), 1500);

  // Cards softly glow
  setTimeout(() => cards.forEach(c => c.classList.add('glow')), 2000);

  // Selected card rises
  setTimeout(() => targetCard.classList.add('selected'), 2500);

  // All other cards dim
  setTimeout(() => {
    cards.forEach(c => {
      if (c.id !== `card-${selectedCircleIndex}`) c.classList.add('dimmed');
    });
  }, 2800);

  // Golden particle effect and Temple bell sound
  setTimeout(() => {
    createParticles(targetCard);
    try { audioBell.play(); } catch (e) { console.log("Audio blocked"); }
  }, 3200);

  // Card moves to center
  setTimeout(() => targetCard.classList.add('center-stage'), 4000);

  // 3D Flip animation
  setTimeout(() => targetCard.classList.add('flipped'), 4500);

  // Reveal reading screen
  setTimeout(() => {
    switchScreen('screen2', 'screen3');
    displayResult();
    renderReadingFromPromise();
  }, 5500);
}

function createParticles(element) {
  const rect = element.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = `${centerX}px`;
    p.style.top = `${centerY}px`;

    const angle = Math.random() * Math.PI * 2;
    const distance = 50 + Math.random() * 100;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;

    p.style.setProperty('--tx', `${tx}px`);
    p.style.setProperty('--ty', `${ty}px`);
    p.style.animation = `particleExplode 1s cubic-bezier(0.1, 0.8, 0.3, 1) forwards`;

    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1000);
  }
}

function displayResult() {
  const lang = localStorage.getItem('astro_lang_preference') || 'en';
  const nameToDisplay = lang === 'ml' && selectedDeity.malayalam && selectedDeity.malayalam.name ? selectedDeity.malayalam.name : selectedDeity.name;
  const themeToDisplay = lang === 'ml' && selectedDeity.malayalam && selectedDeity.malayalam.theme ? selectedDeity.malayalam.theme : selectedDeity.theme;

  document.getElementById('result-name').textContent = nameToDisplay;
  document.getElementById('result-theme').textContent = lang === 'ml' ? `വിഷയം: ${themeToDisplay}` : `Theme: ${themeToDisplay}`;
  
  document.getElementById('result-icon').style.display = 'none';
  document.getElementById('result-card-visual').style.display = 'block';
  
  // Set frame
  const rarityLower = selectedDeity.rarity.toLowerCase();
  document.getElementById('card-frame-overlay').src = `assets/images/${rarityLower}.jpg`;

  // Set inner image
  let folder = '4';
  if(selectedDeity.rarity === 'Mythic') folder = '1';
  else if(selectedDeity.rarity === 'Golden') folder = '2';
  else if(selectedDeity.rarity === 'Silver') folder = '3';
  
  const fileName = selectedDeity.name.replace(/^The\s+/, '') + '.jpg';
  document.getElementById('card-base-img').src = `assets/images/${folder}/${fileName}`;

  const rarityBanner = document.getElementById('result-rarity-banner');
  const visualCard = document.getElementById('result-card-visual');
  visualCard.classList.remove('mythic-card-animation');
  visualCard.classList.remove('golden-card-animation');
  visualCard.classList.remove('silver-card-animation');

  const rarityText = lang === 'ml' ? (
    selectedDeity.rarity === 'Mythic' ? 'അപൂർവ്വ' :
      selectedDeity.rarity === 'Golden' ? 'സ്വർണ്ണ' :
        selectedDeity.rarity === 'Silver' ? 'വെള്ളി' : 'സാധാരണ'
  ) : selectedDeity.rarity.toUpperCase();

  const foundText = lang === 'ml' ? 'കാർഡ് ലഭിച്ചു' : 'CARD FOUND';
  rarityBanner.textContent = `${selectedDeity.icon} ${rarityText} ${foundText}`;

  if (selectedDeity.rarity === 'Mythic') {
    rarityBanner.style.color = '#fff';
    rarityBanner.style.background = 'linear-gradient(90deg, #9b59b6, #8e44ad)';
    rarityBanner.style.boxShadow = '0 0 20px rgba(155, 89, 182, 0.5)';
    visualCard.classList.add('mythic-card-animation');
  } else if (selectedDeity.rarity === 'Golden') {
    rarityBanner.style.color = '#000';
    rarityBanner.style.background = 'linear-gradient(90deg, #f1c40f, #f39c12)';
    rarityBanner.style.boxShadow = '0 0 20px rgba(241, 196, 15, 0.5)';
    visualCard.classList.add('golden-card-animation');
  } else if (selectedDeity.rarity === 'Silver') {
    rarityBanner.style.color = '#000';
    rarityBanner.style.background = 'linear-gradient(90deg, #ecf0f1, #bdc3c7)';
    rarityBanner.style.boxShadow = '0 0 15px rgba(236, 240, 241, 0.4)';
    visualCard.classList.add('silver-card-animation');
  } else {
    rarityBanner.style.color = '#fff';
    rarityBanner.style.background = 'linear-gradient(90deg, #34495e, #2c3e50)';
    rarityBanner.style.boxShadow = 'none';
  }
}

function formatText(text) {
  if (!text) return "";
  return text.replace(/\n/g, '<br>');
}

async function preloadReadingData() {
  const age = calculateAge(dobInput);
  const lang = localStorage.getItem('astro_lang_preference') || 'en';
  const profile = window.AstroProfiles ? window.AstroProfiles.getActiveProfile() : {};
  
  try {
    const response = await fetch(`${API_URL}/kili-reading`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dob: dobInput,
        age: age,
        name: profile.name || 'User',
        relation: profile.relation || 'Myself',
        lang: lang,
        card_data: selectedDeity
      })
    });
    return await response.json();
  } catch (error) {
    return { status: 'error' };
  }
}

async function renderReadingFromPromise() {
  const lang = localStorage.getItem('astro_lang_preference') || 'en';
  try {
    const data = await readingPromise;

    document.getElementById('loading-reading').style.display = 'none';
    document.getElementById('reading-content').style.display = 'block';

    if (data.status === 'success') {
      const reading = data.reading;
      document.getElementById('read-meaning').innerHTML = formatText(lang === 'ml' && reading.card_data.malayalam && reading.card_data.malayalam.meaning ? reading.card_data.malayalam.meaning : reading.card_data.meaning);
      document.getElementById('read-wisdom-sanskrit').textContent = reading.card_data.wisdom_sanskrit;
      document.getElementById('read-wisdom-english').textContent = `"${lang === 'ml' && reading.card_data.wisdom_malayalam ? reading.card_data.wisdom_malayalam : reading.card_data.wisdom_english}"`;
      document.getElementById('read-guidance').innerHTML = formatText(lang === 'ml' && reading.card_data.malayalam && reading.card_data.malayalam.guidance ? reading.card_data.malayalam.guidance : reading.card_data.guidance);
      document.getElementById('read-reflection').innerHTML = formatText(lang === 'ml' && reading.card_data.malayalam && reading.card_data.malayalam.reflection ? reading.card_data.malayalam.reflection : reading.card_data.reflection);
      document.getElementById('read-insights').innerHTML = formatText(reading.insights);
      if (data.tokens_used) {
        document.getElementById('kili-tokens').innerHTML = ``;
      }
      const ttsLabel = document.getElementById('ttsLabel');
      if (ttsLabel) {
        ttsLabel.textContent = lang === 'en' ? '🔊 Hear the reading' : '🔊 വായന കേൾക്കാം';
        document.getElementById('ttsPlayBtn').textContent = lang === 'en' ? '▶ Speak' : '▶ കേൾക്കുക';
      }
    } else {
      document.getElementById('read-insights').textContent = window.translations && window.translations[lang] ? window.translations[lang].kili_error1 : "The parrot is resting. Please try again.";
    }
  } catch (error) {
    document.getElementById('loading-reading').style.display = 'none';
    document.getElementById('reading-content').style.display = 'block';
    document.getElementById('read-insights').textContent = window.translations && window.translations[lang] ? window.translations[lang].kili_error2 : "Connection lost to the cosmic realm.";
  }
}

// ── TTS ────────────────────────────────────────────────────────
let ttsChunks = [], ttsIdx = 0, ttsPaused = false, ttsAudio = null, nextTtsAudio = null, ttsActive = false;

function getReadingText() {
  let text = "";
  const name = document.getElementById('result-name') ? document.getElementById('result-name').innerText : "";
  const theme = document.getElementById('result-theme') ? document.getElementById('result-theme').innerText : "";
  const meaning = document.getElementById('read-meaning') ? document.getElementById('read-meaning').innerText : "";
  const sanskrit = document.getElementById('read-wisdom-sanskrit') ? document.getElementById('read-wisdom-sanskrit').innerText : "";
  const wisdom = document.getElementById('read-wisdom-english') ? document.getElementById('read-wisdom-english').innerText : "";
  const guidance = document.getElementById('read-guidance') ? document.getElementById('read-guidance').innerText : "";
  const reflection = document.getElementById('read-reflection') ? document.getElementById('read-reflection').innerText : "";
  const insights = document.getElementById('read-insights') ? document.getElementById('read-insights').innerText : "";
  
  if (name) text += name + ". ";
  if (theme) text += theme + ". ";
  if (meaning) text += meaning + " ";
  if (insights) text += insights + " ";
  if (sanskrit) text += sanskrit + " ";
  if (wisdom) text += wisdom + " ";
  if (guidance) text += guidance + " ";
  if (reflection) text += reflection + " ";
  return text;
}

function cleanForTts(t) {
  return t.replace(/#{1,4}/g, '').replace(/\*+/g, '').replace(/═+/g, '').replace(/━+/g, '').replace(/\s+/g, ' ').trim();
}

function handleTtsPlay() {
  stopTts();
  const text = cleanForTts(getReadingText());
  const currentLang = localStorage.getItem('astro_lang_preference') || 'en';
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
  const ttsWaves = document.getElementById('ttsWaves');
  if (ttsWaves) ttsWaves.classList.remove('active');
  const ttsPauseBtn = document.getElementById('ttsPauseBtn');
  if (ttsPauseBtn) ttsPauseBtn.disabled = true;
  const ttsPlayBtn = document.getElementById('ttsPlayBtn');
  if (ttsPlayBtn) ttsPlayBtn.disabled = false;
}

function setTtsPlaying(on) {
  const ttsWaves = document.getElementById('ttsWaves');
  if (ttsWaves) ttsWaves.classList.toggle('active', on);
  const ttsPauseBtn = document.getElementById('ttsPauseBtn');
  if (ttsPauseBtn) ttsPauseBtn.disabled = !on;
  const ttsPlayBtn = document.getElementById('ttsPlayBtn');
  if (ttsPlayBtn) ttsPlayBtn.disabled = on;
}

function startGoogleTts(text, lang) {
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
  utter.rate = 0.76;
  utter.pitch = 0.65;

  const voices = speechSynthesis.getVoices();

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

if (window.speechSynthesis) speechSynthesis.onvoiceschanged = () => { };

