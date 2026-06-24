const ZODIAC = [
  { name:"Aries", ml_name:"മേടം", glyph:"♈", start:{m:3,d:21}, end:{m:4,d:19}, element:"Fire", ml_element:"അഗ്നി", mode:"Cardinal", ml_mode:"ചരം", planet:"Mars", ml_planet:"ചൊവ്വ", mood:"Bold", ml_mood:"ധീരം", number:9, color:{name:"Vermilion", hex:"#C1502E"}, ml_color_name:"ചെമപ്പ്", match:"Sagittarius", ml_match:"ധനു",
    reading:"A small disagreement clears the air rather than starting a storm. Move first on the plan you've been circling \u2014 momentum favours whoever commits today.",
    ml_reading:"ഒരു ചെറിയ അഭിപ്രായവ്യത്യാസം പ്രശ്നങ്ങൾ പരിഹരിക്കും. മുന്നോട്ട് പോവുക." },
  { name:"Taurus", ml_name:"ഇടവം", glyph:"♉", start:{m:4,d:20}, end:{m:5,d:20}, element:"Earth", ml_element:"ഭൂമി", mode:"Fixed", ml_mode:"സ്ഥിരം", planet:"Venus", ml_planet:"ശുക്രൻ", mood:"Grounded", ml_mood:"ശാന്തം", number:6, color:{name:"Moss", hex:"#6E7E5E"}, ml_color_name:"പച്ച", match:"Capricorn", ml_match:"മകരം",
    reading:"Patience pays a quiet dividend by evening. Resist the urge to over-explain \u2014 let the work speak for itself.",
    ml_reading:"ക്ഷമയ്ക്ക് നല്ല ഫലം ലഭിക്കും. നിങ്ങളുടെ പ്രവൃത്തികൾ സ്വയം സംസാരിക്കട്ടെ." },
  { name:"Gemini", ml_name:"മിഥുനം", glyph:"♊", start:{m:5,d:21}, end:{m:6,d:20}, element:"Air", ml_element:"വായു", mode:"Mutable", ml_mode:"ഉഭയം", planet:"Mercury", ml_planet:"ബുധൻ", mood:"Curious", ml_mood:"ജിജ്ഞാസ", number:14, color:{name:"Citrine", hex:"#D8B144"}, ml_color_name:"മഞ്ഞ", match:"Aquarius", ml_match:"കുംഭം",
    reading:"Two conversations converge on the same idea \u2014 pay attention to the overlap. A short message reopens a door you thought was closed.",
    ml_reading:"സംഭാഷണങ്ങൾ പുതിയ ആശയങ്ങളിലേക്ക് നയിക്കും. പഴയ ബന്ധങ്ങൾ പുതുക്കാൻ അവസരം ലഭിക്കും." },
  { name:"Cancer", ml_name:"കർക്കടകം", glyph:"♋", start:{m:6,d:21}, end:{m:7,d:22}, element:"Water", ml_element:"ജലം", mode:"Cardinal", ml_mode:"ചരം", planet:"Moon", ml_planet:"ചന്ദ്രൻ", mood:"Tender", ml_mood:"സ്നേഹം", number:2, color:{name:"Pearl", hex:"#DCD6C8"}, ml_color_name:"മുത്ത്", match:"Pisces", ml_match:"മീനം",
    reading:"Home matters more than the calendar suggests. Tend to one small repair \u2014 literal or emotional \u2014 before it becomes a larger one.",
    ml_reading:"കുടുംബ കാര്യങ്ങൾക്ക് പ്രാധാന്യം നൽകുക. ചെറിയ പ്രശ്നങ്ങൾ വലുതാകുന്നതിന് മുമ്പ് പരിഹരിക്കുക." },
  { name:"Leo", ml_name:"ചിങ്ങം", glyph:"♌", start:{m:7,d:23}, end:{m:8,d:22}, element:"Fire", ml_element:"അഗ്നി", mode:"Fixed", ml_mode:"സ്ഥിരം", planet:"Sun", ml_planet:"സൂര്യൻ", mood:"Radiant", ml_mood:"തേജസ്സ്", number:19, color:{name:"Amber", hex:"#C7973E"}, ml_color_name:"സ്വർണ്ണം", match:"Aries", ml_match:"മേടം",
    reading:"Recognition arrives sideways, through someone else's praise of your work rather than your own announcement. Share the credit and it returns doubled.",
    ml_reading:"നിങ്ങളുടെ പ്രവൃത്തികൾക്ക് അപ്രതീക്ഷിതമായി അംഗീകാരം ലഭിക്കും. മറ്റുള്ളവരെ സഹായിക്കുക." },
  { name:"Virgo", ml_name:"കന്നി", glyph:"♍", start:{m:8,d:23}, end:{m:9,d:22}, element:"Earth", ml_element:"ഭൂമി", mode:"Mutable", ml_mode:"ഉഭയം", planet:"Mercury", ml_planet:"ബുധൻ", mood:"Precise", ml_mood:"കൃത്യത", number:23, color:{name:"Sage", hex:"#8A9A7E"}, ml_color_name:"തവിട്ട്", match:"Taurus", ml_match:"ഇടവം",
    reading:"A detail you almost skipped turns out to be the whole point. Trust the edit over the first draft.",
    ml_reading:"ചെറിയ കാര്യങ്ങൾ ശ്രദ്ധിക്കുന്നത് വലിയ മാറ്റങ്ങൾ ഉണ്ടാക്കും. നിങ്ങളുടെ തീരുമാനങ്ങളിൽ വിശ്വസിക്കുക." },
  { name:"Libra", ml_name:"തുലാം", glyph:"♎", start:{m:9,d:23}, end:{m:10,d:22}, element:"Air", ml_element:"വായു", mode:"Cardinal", ml_mode:"ചരം", planet:"Venus", ml_planet:"ശുക്രൻ", mood:"Diplomatic", ml_mood:"നയതന്ത്രം", number:11, color:{name:"Dusty rose", hex:"#C79A93"}, ml_color_name:"പിങ്ക്", match:"Gemini", ml_match:"മിഥുനം",
    reading:"Balance doesn't mean splitting evenly today \u2014 it means choosing, then making peace with the choice. Someone close appreciates more than they say.",
    ml_reading:"ജീവിതത്തിൽ സന്തുലിതാവസ്ഥ നിലനിർത്തുക. എടുത്ത തീരുമാനങ്ങളിൽ ഉറച്ചുനിൽക്കുക." },
  { name:"Scorpio", ml_name:"വൃശ്ചികം", glyph:"♏", start:{m:10,d:23}, end:{m:11,d:21}, element:"Water", ml_element:"ജലം", mode:"Fixed", ml_mode:"സ്ഥിരം", planet:"Pluto", ml_planet:"ചൊവ്വ", mood:"Intense", ml_mood:"തീവ്രം", number:8, color:{name:"Garnet", hex:"#7C2F2F"}, ml_color_name:"കറുപ്പ്", match:"Cancer", ml_match:"കർക്കടകം",
    reading:"An old thread resurfaces, asking to be either finished or finally cut. Either choice frees up more energy than you expect.",
    ml_reading:"പഴയ പ്രശ്നങ്ങൾക്ക് പരിഹാരം കണ്ടെത്തും. ഇത് നിങ്ങൾക്ക് പുതിയ ഊർജ്ജം നൽകും." },
  { name:"Sagittarius", ml_name:"ധനു", glyph:"♐", start:{m:11,d:22}, end:{m:12,d:21}, element:"Fire", ml_element:"അഗ്നി", mode:"Mutable", ml_mode:"ഉഭയം", planet:"Jupiter", ml_planet:"വ്യാഴം", mood:"Restless", ml_mood:"ഊർജ്ജസ്വലം", number:27, color:{name:"Cobalt", hex:"#3E5C76"}, ml_color_name:"നീല", match:"Leo", ml_match:"ചിങ്ങം",
    reading:"The bigger picture looks different once you walk closer to it. A short, unplanned detour teaches more than the itinerary would have.",
    ml_reading:"പുതിയ കാഴ്ചപ്പാടുകൾ നിങ്ങൾക്ക് ഗുണം ചെയ്യും. ആസൂത്രണം ചെയ്യാത്ത യാത്രകൾ പുതിയ അറിവ് നൽകും." },
  { name:"Capricorn", ml_name:"മകരം", glyph:"♑", start:{m:12,d:22}, end:{m:1,d:19}, element:"Earth", ml_element:"ഭൂമി", mode:"Cardinal", ml_mode:"ചരം", planet:"Saturn", ml_planet:"ശനി", mood:"Resolute", ml_mood:"ദൃഢനിശ്ചയം", number:4, color:{name:"Slate", hex:"#5B6470"}, ml_color_name:"ചാരനിറം", match:"Taurus", ml_match:"ഇടവം",
    reading:"Structure feels heavier than usual \u2014 that's a sign to simplify, not to push harder. One fewer commitment this week makes room for the one that matters.",
    ml_reading:"ജീവിതം കൂടുതൽ ലളിതമാക്കാൻ ശ്രമിക്കുക. അമിതഭാരം ഒഴിവാക്കുക." },
  { name:"Aquarius", ml_name:"കുംഭം", glyph:"♒", start:{m:1,d:20}, end:{m:2,d:18}, element:"Air", ml_element:"വായു", mode:"Fixed", ml_mode:"സ്ഥിരം", planet:"Uranus", ml_planet:"ശനി", mood:"Inventive", ml_mood:"കണ്ടുപിടുത്തം", number:17, color:{name:"Teal", hex:"#4E7C7A"}, ml_color_name:"നീല", match:"Gemini", ml_match:"മിഥുനം",
    reading:"An idea you floated casually gets taken seriously by someone you didn't expect. Let more than one mind develop it.",
    ml_reading:"നിങ്ങളുടെ പുതിയ ആശയങ്ങൾക്ക് വലിയ പിന്തുണ ലഭിക്കും. മറ്റുള്ളവരുമായി സഹകരിച്ച് പ്രവർത്തിക്കുക." },
  { name:"Pisces", ml_name:"മീനം", glyph:"♓", start:{m:2,d:19}, end:{m:3,d:20}, element:"Water", ml_element:"ജലം", mode:"Mutable", ml_mode:"ഉഭയം", planet:"Neptune", ml_planet:"വ്യാഴം", mood:"Dreamy", ml_mood:"സ്വപ്നം", number:12, color:{name:"Lilac", hex:"#9B8EBD"}, ml_color_name:"ലിലാക്ക്", match:"Cancer", ml_match:"കർക്കടകം",
    reading:"A feeling you couldn't name yesterday becomes clear through a conversation, a song, or a dream. Write it down before it drifts.",
    ml_reading:"അപ്രതീക്ഷിത മാർഗ്ഗങ്ങളിലൂടെ മനസ്സിന് വ്യക്തത ലഭിക്കും. നിങ്ങളുടെ ചിന്തകൾ എഴുതിവെയ്ക്കുക." }
];

document.addEventListener('DOMContentLoaded', () => {
  const CX = 320, CY = 320;
  const RING_R = 300;
  const MED_R = 245;
  const MED_RADIUS = 27;

  const svg = document.getElementById('wheel');
  if(!svg) return;
  const SVGNS = "http://www.w3.org/2000/svg";

  function el(tag, attrs, parent){
    const node = document.createElementNS(SVGNS, tag);
    for(const k in attrs) node.setAttribute(k, attrs[k]);
    if(parent) parent.appendChild(node);
    return node;
  }

  function pointOn(r, angleDeg){
    const rad = (angleDeg - 90) * Math.PI / 180;
    return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
  }

  // Outer ring
  el('circle', { class:'ring', cx:CX, cy:CY, r:RING_R }, svg);

  // Ticks: 72 ticks every 5deg, major every 30deg (12 of them)
  for(let i=0;i<72;i++){
    const angle = i * 5;
    const major = (i % 6 === 0);
    const rInner = major ? 278 : 290;
    const p1 = pointOn(rInner, angle);
    const p2 = pointOn(RING_R, angle);
    el('line', {
      class: 'tick ' + (major ? 'major' : 'minor'),
      x1:p1.x, y1:p1.y, x2:p2.x, y2:p2.y
    }, svg);
  }

  // Medallions
  let selected = 0;
  ZODIAC.forEach((sign, i) => {
    const angle = i * 30;
    const p = pointOn(MED_R, angle);
    const g = el('g', {
      class:'medallion', tabindex:'0', role:'button',
      'aria-label': sign.name + ', ' + monthDay(sign.start) + ' to ' + monthDay(sign.end),
      'data-index': i
    }, svg);
    el('circle', { cx:p.x, cy:p.y, r:MED_RADIUS }, g);
    const t = el('text', { x:p.x, y:p.y }, g);
    t.textContent = sign.glyph;

    g.addEventListener('click', () => select(i));
    g.addEventListener('keydown', (e) => {
      if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); select(i); }
    });
  });

  // Pointer (rotates to selected medallion)
  const pointer = el('g', { class:'pointer' }, svg);
  el('path', { d:'M 312 8 L 328 8 L 320 24 Z' }, pointer);

  // Hub
  const hub = el('g', { class:'hub' }, svg);
  el('circle', { cx:CX, cy:CY, r:130 }, hub);
  const hubGlyph = el('text', { class:'glyph', x:CX, y:CY-18 }, hub);
  const hubName = el('text', { class:'name', x:CX, y:CY+48 }, hub);

  function monthDay(d){
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[d.m-1] + ' ' + d.d;
  }

  function select(i){
    selected = i;
    const sign = ZODIAC[i];
    const lang = localStorage.getItem('astro_lang_preference') || 'en';

    document.querySelectorAll('.medallion').forEach((m,idx) => {
      m.classList.toggle('selected', idx === i);
    });

    pointer.style.transform = 'rotate(' + (i*30) + 'deg)';

    hubGlyph.textContent = sign.glyph;
    hubName.textContent = lang === 'ml' ? sign.ml_name : sign.name;

    const reading = document.getElementById('reading');
    reading.classList.add('fade');
    setTimeout(() => {
      document.getElementById('signName').textContent = lang === 'ml' ? sign.ml_name : sign.name;
      document.getElementById('signDates').textContent = monthDay(sign.start) + ' – ' + monthDay(sign.end);
      document.getElementById('signReading').textContent = '\u201C' + (lang === 'ml' ? sign.ml_reading : sign.reading) + '\u201D';
      document.getElementById('signElement').textContent = lang === 'ml' ? sign.ml_element : sign.element;
      
      const pMode = document.getElementById('signMode');
      if (pMode) pMode.textContent = lang === 'ml' ? sign.ml_mode : sign.mode;
      
      document.getElementById('signPlanet').textContent = lang === 'ml' ? sign.ml_planet : sign.planet;
      
      const pMood = document.getElementById('signMood');
      if (pMood) pMood.textContent = lang === 'ml' ? sign.ml_mood : sign.mood;
      
      document.getElementById('signNumber').textContent = sign.number;
      document.getElementById('signColorName').textContent = lang === 'ml' ? sign.ml_color_name : sign.color.name;
      document.getElementById('signSwatch').style.background = sign.color.hex;
      
      const pMatch = document.getElementById('signMatch');
      if (pMatch) pMatch.textContent = lang === 'ml' ? sign.ml_match : sign.match;
      
      const ageRow = document.getElementById('ageRow');
      if (ageRow) ageRow.style.display = 'none';
      
      const remedyBox = document.getElementById('remedyBox');
      if (remedyBox) remedyBox.style.display = 'none';
      
      reading.classList.remove('fade');
    }, 200);
  }

  window.currentTimeframe = 'daily';

  // Timeframe selector
  document.querySelectorAll('.tf-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      window.currentTimeframe = e.target.getAttribute('data-tf');
      if (window.AstroProfiles && window.AstroProfiles.getActiveProfile()) {
         window.fetchHoroscope();
      }
    });
  });

  // Bind fetchHoroscope globally so the button can call it
  window.fetchHoroscope = async function() {
    const profile = window.AstroProfiles ? window.AstroProfiles.getActiveProfile() : null;
    if(!profile) {
      if (window.AstroProfiles) window.AstroProfiles.showModal();
      return;
    }

    const dob = profile.dob;
    const lang = localStorage.getItem('astro_lang_preference') || 'en';
    const tf = window.currentTimeframe || 'daily';
    const loading = document.getElementById('loading-reading');
    const readingEl = document.getElementById('reading');
    
    loading.style.display = 'block';
    readingEl.classList.add('fade');

    try {
      const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:8000'
        : 'https://ai-hastha-rekha.onrender.com';
      const res = await fetch(`${API_URL}/horoscope/${tf}?dob=${dob}&lang=${lang}&relation=${profile.relation}&name=${profile.name}`);
      if(!res.ok) throw new Error("Failed to fetch horoscope");
      const data = await res.json();
      
      // Find zodiac index to spin wheel
      const idx = ZODIAC.findIndex(z => z.name.toLowerCase() === data.zodiac.toLowerCase());
      if(idx !== -1) {
        // Only spin the wheel visually without triggering the default select text overwrite
        selected = idx;
        document.querySelectorAll('.medallion').forEach((m, i) => m.classList.toggle('selected', i === idx));
        pointer.style.transform = 'rotate(' + (idx*30) + 'deg)';
        hubGlyph.textContent = ZODIAC[idx].glyph;
        hubName.textContent = lang === 'ml' ? data.zodiac_ml : data.zodiac;
      }

      // Update UI with real API data
      setTimeout(() => {
        document.getElementById('signName').textContent = lang === 'ml' ? data.zodiac_ml : data.zodiac;
        document.getElementById('signDates').textContent = dob; // Show DOB instead of generic dates
        
        // Add profile awareness to reading text if we want to visually show it
        const relationLabel = profile.relation === 'Myself' ? '' : `(${profile.name}'s Reading) <br><br>`;
        document.getElementById('signReading').innerHTML = relationLabel + '\u201C' + data.summary + '\u201D';
        
        document.getElementById('signElement').textContent = data.element;
        document.getElementById('signPlanet').textContent = data.planet;
        document.getElementById('signNumber').textContent = data.lucky_number;
        document.getElementById('signColorName').textContent = data.lucky_color;
        
        const ageEl = document.getElementById('signAge');
        if(ageEl) {
          ageEl.textContent = data.age;
          const ageRow = document.getElementById('ageRow');
          if(ageRow) ageRow.style.display = 'block';
        }

        const remedyEl = document.getElementById('signRemedy');
        const remedyBox = document.getElementById('remedyBox');
        if (remedyEl && remedyBox) {
            if (data.remedy) {
                remedyEl.textContent = data.remedy;
                remedyBox.style.display = 'block';
            } else {
                remedyBox.style.display = 'none';
            }
        }

        readingEl.classList.remove('fade');
        loading.style.display = 'none';
      }, 300);

    } catch (e) {
      console.error(e);
      alert("Error fetching horoscope. Please try again.");
      loading.style.display = 'none';
      readingEl.classList.remove('fade');
    }
  };

  // Date + default sign based on today
  const now = new Date();
  const weekdays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('dateLine').textContent =
    weekdays[now.getDay()] + ' \u00B7 ' + now.getDate() + ' ' + months[now.getMonth()] + ' ' + now.getFullYear();

  const m = now.getMonth()+1, d = now.getDate();
  let todayIndex = ZODIAC.findIndex(s => {
    if(s.start.m === s.end.m) return m === s.start.m && d >= s.start.d && d <= s.end.d;
    if(s.start.m <= s.end.m) return (m===s.start.m && d>=s.start.d) || (m===s.end.m && d<=s.end.d) || (m>s.start.m && m<s.end.m);
    // wrap (Capricorn)
    return (m===s.start.m && d>=s.start.d) || (m===s.end.m && d<=s.end.d);
  });
  if(todayIndex === -1) todayIndex = 0;

  select(todayIndex);

  // Listen for language changes to update UI instantly
  document.addEventListener('langChanged', (e) => {
    select(selected);
    if (window.AstroProfiles && window.AstroProfiles.getActiveProfile()) {
      window.fetchHoroscope();
    }
  });

  document.addEventListener('profileChanged', (e) => {
    if (e.detail) {
      window.fetchHoroscope();
    }
  });

  // Auto-fetch if profile exists on load
  setTimeout(() => {
    if (window.AstroProfiles && window.AstroProfiles.getActiveProfile()) {
      window.fetchHoroscope();
    } else if (window.AstroProfiles) {
      window.AstroProfiles.showModal();
    }
  }, 100);
});
