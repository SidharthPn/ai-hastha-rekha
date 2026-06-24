let SYMBOLIC_CARDS = [];
let currentCircleCards = [];
let selectedDeity = null;
let selectedCircleIndex = 0;
let dobInput = "";

// Three.js variables
let scene, camera, renderer, parrot, mixer, clock;

document.addEventListener('DOMContentLoaded', async () => {
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
      fetchReading(); // Re-fetch the reading in the new language
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

  camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(0, 0, 10); // Moved camera back to prevent clipping

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
  directionalLight.position.set(5, 10, 7);
  scene.add(directionalLight);
  clock = new THREE.Clock();

  const loader = new THREE.GLTFLoader();
  loader.load('assets/images/love_birds_parrot/scene.gltf', (gltf) => {
    parrot = gltf.scene;

    // Remove any shiny materials or emissive glows to keep it natural
    parrot.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.roughness = 1.0; // fully matte
        child.material.metalness = 0.0; // no metallic reflections
        if (child.material.emissive) {
          child.material.emissive.setHex(0x000000); // disable glowing parts
        }
      }
    });

    // Calculate initial bounding box for maxDim
    const box = new THREE.Box3().setFromObject(parrot);
    const maxDim = Math.max(box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z);
    window.parrotMaxDim = maxDim; // save for resize event
    const targetSize = window.innerWidth <= 600 ? 8.0 : 12.0; // doubled since camera is twice as far
    parrot.scale.setScalar(targetSize / maxDim);

    // Re-center AFTER scaling
    const scaledBox = new THREE.Box3().setFromObject(parrot);
    const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
    parrot.position.x -= scaledCenter.x;
    parrot.position.y -= scaledCenter.y;
    parrot.position.z -= scaledCenter.z;

    parrot.position.y -= 1.0; // move down slightly for visual balance

    scene.add(parrot);

    if (gltf.animations && gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(parrot);
      gltf.animations.forEach((clip) => {
        mixer.clipAction(clip).play();
      });
    }
  }, undefined, (error) => {
    console.error("Error loading parrot:", error);
  });

  window.addEventListener('resize', () => {
    if (!camera || !renderer) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);

    // dynamically adjust scale if window crosses breakpoint
    if (parrot && window.parrotMaxDim) {
      const targetSize = window.innerWidth <= 600 ? 8.0 : 12.0;
      parrot.scale.setScalar(targetSize / window.parrotMaxDim);

      // Re-center after resize scaling
      const scaledBox = new THREE.Box3().setFromObject(parrot);
      const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
      parrot.position.x -= scaledCenter.x;
      parrot.position.y -= scaledCenter.y;
      parrot.position.z -= scaledCenter.z;
      parrot.position.y -= 1.0;
    }
  });

  animateThreeJS();
}

function animateThreeJS() {
  requestAnimationFrame(animateThreeJS);
  if (mixer) mixer.update(clock.getDelta());
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
    fetchReading();
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

async function fetchReading() {
  const age = calculateAge(dobInput);
  const lang = localStorage.getItem('astro_lang_preference') || 'en';

  const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : 'https://ai-hastha-rekha.onrender.com';

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

    const data = await response.json();

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
