const AstroProfiles = (function() {
  const STORAGE_KEY_PROFILES = 'astro_profiles';
  const STORAGE_KEY_ACTIVE = 'astro_active_profile_id';

  // Default profiles if none exist
  function initProfiles() {
    if (!localStorage.getItem(STORAGE_KEY_PROFILES)) {
      localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify([]));
    }
  }

  function getProfiles() {
    initProfiles();
    return JSON.parse(localStorage.getItem(STORAGE_KEY_PROFILES));
  }

  function getActiveProfile() {
    const profiles = getProfiles();
    const activeId = localStorage.getItem(STORAGE_KEY_ACTIVE);
    return profiles.find(p => p.id === activeId) || null;
  }

  function setActiveProfile(id) {
    localStorage.setItem(STORAGE_KEY_ACTIVE, id);
    document.dispatchEvent(new CustomEvent('profileChanged', { detail: getActiveProfile() }));
    renderProfileBar();
  }

  function addProfile(profile) {
    const profiles = getProfiles();
    profile.id = 'prof_' + Date.now();
    profiles.push(profile);
    localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles));
    return profile;
  }

  // --- UI Injections ---

  function injectProfileBar() {
    let bar = document.getElementById('globalProfileBar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'globalProfileBar';
      bar.className = 'profile-bar';
      
      // Insert right after <nav> if it exists, otherwise top of body
      const nav = document.querySelector('nav');
      if (nav) {
        nav.insertAdjacentElement('afterend', bar);
      } else {
        document.body.prepend(bar);
      }
    }
    renderProfileBar();
  }

  function renderProfileBar() {
    const bar = document.getElementById('globalProfileBar');
    if (!bar) return;

    const active = getActiveProfile();
    if (active) {
      bar.innerHTML = `
        <div class="profile-info">
          <span>Reading for:</span>
          <span class="profile-name">${active.name} (${active.relation})</span>
          <span>| DOB: ${active.dob}</span>
        </div>
        <button class="profile-btn" onclick="AstroProfiles.showModal()">Change Person</button>
      `;
      bar.style.display = 'flex';
    } else {
      bar.style.display = 'none'; // Hide if no profile selected
    }
  }

  function injectModal() {
    if (document.getElementById('profileModalOverlay')) return;

    const modalHTML = `
      <div id="profileModalOverlay" class="profile-modal-overlay">
        <div class="profile-modal-content">
          <button class="profile-modal-close" onclick="AstroProfiles.hideModal()">✕</button>
          
          <div id="profileListView">
            <h3 data-i18n="who_reading">Who is this reading for?</h3>
            <div class="profile-list" id="profileListContainer"></div>
            <button class="add-profile-btn" onclick="AstroProfiles.showAddForm()">+ Add New Person</button>
          </div>

          <form id="profileAddView" class="profile-form">
            <h3>Add New Person</h3>
            <div class="profile-form-group">
              <label>Name</label>
              <input type="text" id="profName" required placeholder="e.g. Rahul">
            </div>
            <div class="profile-form-group">
              <label>Relation</label>
              <select id="profRelation" required>
                <option value="Myself">Myself</option>
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Spouse">Spouse</option>
                <option value="Friend">Friend</option>
                <option value="Relative">Relative</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div class="profile-form-group">
              <label>Date of Birth</label>
              <input type="date" id="profDob" required>
            </div>
            <div class="profile-form-group">
              <label>Time of Birth (Optional)</label>
              <input type="time" id="profTime">
            </div>
            <div class="profile-form-actions">
              <button type="button" class="btn-secondary" onclick="AstroProfiles.showListView()">Cancel</button>
              <button type="submit" class="btn-primary">Save Profile</button>
            </div>
          </form>

        </div>
      </div>
    `;
    
    const div = document.createElement('div');
    div.innerHTML = modalHTML;
    document.body.appendChild(div.firstElementChild);

    document.getElementById('profileAddView').addEventListener('submit', (e) => {
      e.preventDefault();
      const newProfile = {
        name: document.getElementById('profName').value,
        relation: document.getElementById('profRelation').value,
        dob: document.getElementById('profDob').value,
        time: document.getElementById('profTime').value
      };
      const saved = addProfile(newProfile);
      setActiveProfile(saved.id);
      hideModal();
    });
  }

  function renderProfileList() {
    const container = document.getElementById('profileListContainer');
    if (!container) return;
    
    const profiles = getProfiles();
    const activeId = localStorage.getItem(STORAGE_KEY_ACTIVE);

    if (profiles.length === 0) {
      container.innerHTML = '<p style="text-align:center; color: var(--ink-soft); font-size: 14px;">No profiles found. Add a person to continue.</p>';
      return;
    }

    container.innerHTML = profiles.map(p => `
      <div class="profile-item ${p.id === activeId ? 'active' : ''}" onclick="AstroProfiles.selectAndClose('${p.id}')">
        <div class="profile-item-details">
          <div class="profile-item-name">${p.name} <span style="font-weight:normal; font-size:14px; opacity:0.8;">(${p.relation})</span></div>
          <div class="profile-item-meta">DOB: ${p.dob}</div>
        </div>
        ${p.id === activeId ? '<span style="color:var(--gold-deep);">✓</span>' : ''}
      </div>
    `).join('');
  }

  function showModal() {
    injectModal();
    showListView();
    renderProfileList();
    document.getElementById('profileModalOverlay').classList.add('active');
  }

  function hideModal() {
    const overlay = document.getElementById('profileModalOverlay');
    if (overlay) overlay.classList.remove('active');
  }

  function showListView() {
    document.getElementById('profileListView').style.display = 'block';
    document.getElementById('profileAddView').classList.remove('active');
  }

  function showAddForm() {
    document.getElementById('profileListView').style.display = 'none';
    document.getElementById('profileAddView').classList.add('active');
    document.getElementById('profileAddView').reset();
  }

  function selectAndClose(id) {
    setActiveProfile(id);
    hideModal();
  }

  // Auto-inject on load
  document.addEventListener('DOMContentLoaded', () => {
    injectProfileBar();
    injectModal();
  });

  return {
    getProfiles,
    getActiveProfile,
    setActiveProfile,
    addProfile,
    showModal,
    hideModal,
    showListView,
    showAddForm,
    selectAndClose,
    injectProfileBar
  };
})();

window.AstroProfiles = AstroProfiles;
