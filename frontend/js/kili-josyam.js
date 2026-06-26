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
let scene, camera, renderer, parrot, mixer, clock;
let parrotRoot, headGroup, lowerBeakGroup, wingL, wingR;
let t = 0;
let animState = 0;
let stateTimer = 0;
const stateDurations = [1.5, 0.8, 0.9, 3.0, 1.2];

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

function createFeatherTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 512, 512);
  
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 500; i++) {
    let x = Math.random() * 512;
    let y = Math.random() * 512;
    let len = 15 + Math.random() * 25;
    let angle = Math.sin(y * 0.05) * 0.2 + Math.PI / 2;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 4);
  return texture;
}

function initThreeJS() {
  const container = document.getElementById('bird-area');
  if (container.children.length > 0) return; // already initialized

  scene = new THREE.Scene();
  // Background and fog removed as per request to preserve existing transparent integration

  camera = new THREE.PerspectiveCamera(40, (container.clientWidth || window.innerWidth) / (container.clientHeight || 450), 0.1, 100);
  camera.position.set(0, 0.6, 6.5); 
  camera.lookAt(0, -0.2, 0);       

  renderer = new THREE.WebGLRenderer({alpha: true, antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || 450);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);
  
  // ensure canvas gets proper layout
  setTimeout(() => {
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || 450);
  }, 100);

  // LIGHTS
  scene.add(new THREE.AmbientLight(0xfff5ea, 0.6));
  const sun = new THREE.DirectionalLight(0xfffdf6, 2.5);
  sun.position.set(5, 6, 4);
  sun.castShadow = true;
  scene.add(sun);

  const rim = new THREE.PointLight(0xffaa44, 2.5, 15);
  rim.position.set(-5, 5, -5);
  scene.add(rim);

  const fill = new THREE.DirectionalLight(0xfff0dd, 0.8);
  fill.position.set(-5, 0, 5);
  scene.add(fill);

  // PROCEDURAL FEATHER FINISH TEXTURE
  const featherMap = createFeatherTexture();

  // MATERIALS
  function cmat(hex, r=0.6, m=0.05, dynamicFeather=false){
    return new THREE.MeshStandardMaterial({
      color: hex, 
      roughness: r, 
      metalness: m,
      map: dynamicFeather ? featherMap : null
    });
  }

  const bodyMat   = cmat(0x00b050, 0.75, 0.02, true); 
  const headMat   = cmat(0xffcc00, 0.7, 0.02, true);  
  const bellyMat  = cmat(0xff9900, 0.7, 0.02, true);   
  const wingMat   = cmat(0x0080ff, 0.65, 0.02, true);  
  const beakMat   = cmat(0xff2222, 0.35, 0.05); 
  const eyeMat    = cmat(0x0c090a, 0.1, 0.0);  
  const eyeWMat   = cmat(0xfffbf2, 0.5, 0.0);  
  const clawMat   = cmat(0x9fa4a6, 0.6, 0.0);

  function mesh(geo, mat){
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true; 
    m.receiveShadow = true;
    return m;
  }

  function sph(rx, ry, rz){
    const geo = new THREE.SphereGeometry(1, 32, 24);
    geo.applyMatrix4(new THREE.Matrix4().makeScale(rx, ry, rz));
    return geo;
  }

  // PARROT ASSEMBLY
  parrotRoot = new THREE.Group();
  parrotRoot.position.set(0, -0.3, 0); 
  
  // Scale down slightly to fit the card area optimally
  parrotRoot.scale.set(1.5, 1.5, 1.5);
  parrotRoot.position.y -= 1.0;
  
  scene.add(parrotRoot);

  const body = mesh(sph(0.78, 1.05, 0.70), bodyMat);
  body.position.y = 0.2;
  parrotRoot.add(body);

  const belly = mesh(sph(0.64, 0.72, 0.48), bellyMat);
  belly.position.set(0, 0.05, 0.26);
  parrotRoot.add(belly);

  headGroup = new THREE.Group();
  headGroup.position.set(0, 1.15, 0.1);
  parrotRoot.add(headGroup);

  const head = mesh(sph(0.58, 0.58, 0.54), headMat);
  headGroup.add(head);

  function makeCuteEye(side){
    const eg = new THREE.Group();
    const eyeWhite = mesh(new THREE.SphereGeometry(0.09, 16, 12), eyeWMat);
    const pupil = mesh(new THREE.SphereGeometry(0.062, 16, 12), eyeMat);
    pupil.position.z = 0.042;
    pupil.scale.set(1, 1.05, 1); 
    const sheen1 = mesh(new THREE.SphereGeometry(0.02, 8, 8), cmat(0xffffff, 0.05, 0.9));
    sheen1.position.set(side * 0.018, 0.022, 0.09);
    const sheen2 = mesh(new THREE.SphereGeometry(0.01, 8, 8), cmat(0xffffff, 0.05, 0.9));
    sheen2.position.set(side * -0.022, -0.015, 0.09);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.094, 0.008, 8, 24), cmat(0xdad3c1, 0.7));
    eg.add(eyeWhite, pupil, sheen1, sheen2, ring);
    eg.position.set(side * 0.33, 0.14, 0.34);
    eg.rotation.y = side * 0.45; 
    return eg;
  }
  headGroup.add(makeCuteEye(1));
  headGroup.add(makeCuteEye(-1));

  const upperBeakGeo = new THREE.CylinderGeometry(0, 0.14, 0.38, 16);
  upperBeakGeo.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0.19, 0)); 
  const upperBeakMesh = mesh(upperBeakGeo, beakMat);
  upperBeakMesh.position.set(0, 0.02, 0.38);
  upperBeakMesh.rotation.x = Math.PI / 2 + 0.35; 
  headGroup.add(upperBeakMesh);

  lowerBeakGroup = new THREE.Group();
  lowerBeakGroup.position.set(0, -0.08, 0.38); 
  headGroup.add(lowerBeakGroup);

  const lowerBeakGeo = new THREE.CylinderGeometry(0, 0.11, 0.24, 16);
  lowerBeakGeo.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0.12, 0)); 
  lowerBeakGeo.applyMatrix4(new THREE.Matrix4().makeScale(1, 1, 0.6)); 
  const lowerBeakMesh = mesh(lowerBeakGeo, beakMat);
  lowerBeakMesh.rotation.x = Math.PI / 2 - 0.15; 
  lowerBeakGroup.add(lowerBeakMesh);

  function makeWing(side){
    const wg = new THREE.Group();
    wg.position.set(side * 0.74, 0.2, 0);
    const wingBase = mesh(sph(0.18, 0.65, 0.38), wingMat);
    wingBase.rotation.z = side * 0.15;
    wg.add(wingBase);
    return wg;
  }
  wingL = makeWing(1);
  wingR = makeWing(-1);
  parrotRoot.add(wingL, wingR);

  const tailFeathers = new THREE.Group();
  tailFeathers.position.set(0, -0.65, -0.45);
  tailFeathers.rotation.x = 0.45;
  parrotRoot.add(tailFeathers);

  const mainFeather = mesh(sph(0.14, 0.7, 0.05), wingMat);
  mainFeather.position.y = -0.4;
  tailFeathers.add(mainFeather);

  function makeFoot(side){
    const fg = new THREE.Group();
    const leg = mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.3, 8), clawMat);
    leg.position.y = -0.15;
    fg.add(leg);
    [0.6, -0.6, Math.PI].forEach(angle => {
      const claw = mesh(new THREE.CylinderGeometry(0.02, 0.012, 0.2, 6), clawMat);
      claw.rotation.x = Math.PI/2;
      claw.rotation.y = angle;
      claw.position.set(Math.sin(angle)*0.08, -0.3, Math.cos(angle)*0.08);
      fg.add(claw);
    });
    fg.position.set(side * 0.22, -0.62, 0.05);
    return fg;
  }
  parrotRoot.add(makeFoot(1), makeFoot(-1));

  clock = new THREE.Clock();
  
  window.addEventListener('resize', () => {
    if (!camera || !renderer) return;
    camera.aspect = (container.clientWidth || window.innerWidth) / (container.clientHeight || 450);
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || 450);
  });

  window.addEventListener('mousemove', (e) => {
    if(animState === 0 || animState === 3) {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, nx * 0.4, 0.05);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, 0.6 - (ny * 0.25), 0.05);
      camera.lookAt(0, -0.2, 0); 
    }
  });

  animateThreeJS();
}

function easeInOutQuad(x) {
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

function animateThreeJS() {
  requestAnimationFrame(animateThreeJS);
  const delta = clock.getDelta();
  t += delta;
  stateTimer += delta;

  if (stateTimer >= stateDurations[animState]) {
    stateTimer = 0;
    animState = (animState + 1) % stateDurations.length;
  }

  const progress = Math.min(stateTimer / stateDurations[animState], 1);
  const ep = easeInOutQuad(progress);

  let wingTwitch = Math.sin(t * 12) * 0.02;
  wingL.rotation.z = 0.15 + wingTwitch;
  wingR.rotation.z = -0.15 - wingTwitch;

  switch(animState) {
    case 0: // INSPECT
      parrotRoot.position.set(0, -0.3 + Math.sin(t * 2) * 0.015, 0);
      parrotRoot.rotation.set(0, Math.sin(t * 1.5) * 0.03, 0);
      headGroup.rotation.x = ep * 0.45;
      lowerBeakGroup.rotation.x = 0; 
      break;

    case 1: // DIP DOWN TO GRAB
      let dip = ep;
      parrotRoot.position.set(0, -0.3 - (dip * 1.6), dip * 0.25);
      parrotRoot.rotation.x = dip * 0.5;
      headGroup.rotation.x = 0.45 + (dip * 0.2);
      lowerBeakGroup.rotation.x = Math.sin(dip * Math.PI) * 0.35; 
      break;

    case 2: // LIFTING UP
      let lift = ep;
      parrotRoot.position.set(0, -1.9 + (lift * 1.6), 0.25 * (1 - lift));
      parrotRoot.rotation.x = 0.5 * (1 - lift);
      headGroup.rotation.x = (0.45 + 0.2) * (1 - lift) - (lift * 0.15);
      lowerBeakGroup.rotation.x = 0.35 * (1 - lift) - 0.05; 
      break;

    case 3: // PROUD PRESENTATION
      parrotRoot.position.set(0, -0.3 + Math.sin(t * 2.5) * 0.02, 0);
      parrotRoot.rotation.set(Math.sin(t * 1.2) * 0.02, 0.25 * Math.sin(t * 0.8), 0);
      headGroup.rotation.set(-0.15 + Math.sin(t * 3.5) * 0.04, Math.sin(t * 2) * 0.05, 0);
      lowerBeakGroup.rotation.x = -0.05; 
      break;

    case 4: // RESET BACK TO IDLE
      let resetFactor = ep;
      headGroup.rotation.y *= (1 - resetFactor);
      headGroup.rotation.x = -0.15 + (resetFactor * 0.6);
      if(resetFactor > 0.7) {
        lowerBeakGroup.rotation.x = (1 - resetFactor) * -0.1; 
      }
      break;
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
  } else if (selectedDeity.rarity === 'Silver') {
    rarityBanner.style.color = '#000';
    rarityBanner.style.background = 'linear-gradient(90deg, #ecf0f1, #bdc3c7)';
    rarityBanner.style.boxShadow = '0 0 15px rgba(236, 240, 241, 0.4)';
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
    } else {
      document.getElementById('read-insights').textContent = window.translations && window.translations[lang] ? window.translations[lang].kili_error1 : "The parrot is resting. Please try again.";
    }
  } catch (error) {
    document.getElementById('loading-reading').style.display = 'none';
    document.getElementById('reading-content').style.display = 'block';
    document.getElementById('read-insights').textContent = window.translations && window.translations[lang] ? window.translations[lang].kili_error2 : "Connection lost to the cosmic realm.";
  }
}
