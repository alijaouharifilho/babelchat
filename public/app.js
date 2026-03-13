const LANGUAGES = [
  { code: 'pt', name: 'Português',  flag: '🇧🇷' },
  { code: 'en', name: 'English',    flag: '🇺🇸' },
  { code: 'es', name: 'Español',    flag: '🇪🇸' },
  { code: 'fr', name: 'Français',   flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch',    flag: '🇩🇪' },
  { code: 'zh', name: '中文',        flag: '🇨🇳' },
  { code: 'ja', name: '日本語',      flag: '🇯🇵' },
  { code: 'ar', name: 'العربية',    flag: '🇸🇦' },
  { code: 'ru', name: 'Русский',    flag: '🇷🇺' },
  { code: 'hi', name: 'हिन्दी',      flag: '🇮🇳' },
  { code: 'ko', name: '한국어',      flag: '🇰🇷' },
  { code: 'it', name: 'Italiano',   flag: '🇮🇹' },
  { code: 'tr', name: 'Türkçe',     flag: '🇹🇷' },
  { code: 'pl', name: 'Polski',     flag: '🇵🇱' },
  { code: 'th', name: 'ไทย',        flag: '🇹🇭' },
];

const params      = new URLSearchParams(window.location.search);
const roomFromUrl  = params.get('room');

let selectedLang   = null;
let isJoining      = !!roomFromUrl; // joining vs creating
let roomHasPassword = false;

const nameInput     = document.getElementById('name-input');
const roomInput     = document.getElementById('room-input');
const passwordInput = document.getElementById('password-input');
const joinPwdInput  = document.getElementById('join-password-input');
const btnEnter      = document.getElementById('btn-enter');
const errorBanner   = document.getElementById('error-banner');
const errorText     = document.getElementById('error-text');

// ─── Build language grid ────────────────────────────────
const grid = document.getElementById('lang-grid');
LANGUAGES.forEach(lang => {
  const btn = document.createElement('button');
  btn.className = 'lang-btn';
  btn.title = lang.name;
  btn.innerHTML = `<span class="flag">${lang.flag}</span><span class="lang-name">${lang.name}</span>`;
  btn.addEventListener('click', () => {
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedLang = lang.code;
    validate();

    // Translate UI to selected language
    I18n.applyLanguage(lang.code);
    if (isJoining) {
      btnEnter.textContent = I18n.t('landing.join_room_button');
      updateRoomBanner();
    }
  });
  grid.appendChild(btn);
});

// ─── Joining vs Creating mode ───────────────────────────
let roomInfo = null; // cached room info for re-rendering on language change

function updateRoomBanner() {
  if (!isJoining) return;
  if (roomInfo && roomInfo.exists && roomInfo.count > 0) {
    const peopleWord = roomInfo.count !== 1 ? I18n.t('landing.persons') : I18n.t('landing.person');
    document.getElementById('room-banner-text').textContent =
      I18n.t('landing.joining_room_count', { room: roomFromUrl, count: roomInfo.count, people: peopleWord });
  } else {
    document.getElementById('room-banner-text').textContent =
      I18n.t('landing.joining_room', { room: roomFromUrl });
  }
}

if (isJoining) {
  document.getElementById('room-banner').classList.remove('hidden');
  document.getElementById('room-banner-text').textContent = I18n.t('landing.joining_room', { room: roomFromUrl });
  document.getElementById('create-section').classList.add('hidden');
  btnEnter.textContent = I18n.t('landing.join_room_button');

  // Check if room has password
  fetch(`/api/room/${encodeURIComponent(roomFromUrl)}`)
    .then(r => r.json())
    .then(info => {
      roomInfo = info;
      if (info.hasPassword) {
        roomHasPassword = true;
        document.getElementById('password-section').classList.remove('hidden');
      }
      updateRoomBanner();
    })
    .catch(() => {});
}

// ─── Validation ─────────────────────────────────────────
nameInput.addEventListener('input', validate);
roomInput.addEventListener('input', () => {
  validateRoomSlug();
  validate();
});

function validate() {
  const hasName = nameInput.value.trim().length > 0;
  const hasLang = !!selectedLang;
  btnEnter.disabled = !hasName || !hasLang;
}

function validateRoomSlug() {
  const val = roomInput.value.trim();
  const hint = document.getElementById('room-hint');
  if (!val) {
    hint.textContent = I18n.t('landing.room_hint');
    hint.className = 'hint';
    return true;
  }
  if (/^[a-zA-Z0-9][a-zA-Z0-9\-]{0,28}[a-zA-Z0-9]?$/.test(val) && val.length >= 2) {
    hint.textContent = I18n.t('landing.room_hint_valid');
    hint.className = 'hint hint-ok';
    return true;
  }
  hint.textContent = I18n.t('landing.room_hint_invalid');
  hint.className = 'hint hint-error';
  return false;
}

function showError(msg) {
  errorText.textContent = msg;
  errorBanner.classList.remove('hidden');
  setTimeout(() => errorBanner.classList.add('hidden'), 4000);
}

function generateSlug() {
  return Math.random().toString(36).substring(2, 8);
}

// ─── Enter button ───────────────────────────────────────
btnEnter.addEventListener('click', () => {
  const name = nameInput.value.trim();
  if (!name || !selectedLang) return;

  if (isJoining) {
    // Joining existing room
    const password = roomHasPassword ? joinPwdInput.value : '';
    goToChat(roomFromUrl, name, selectedLang, password, false);
  } else {
    // Creating new room
    if (!validateRoomSlug()) return;
    const room = roomInput.value.trim() || generateSlug();
    const password = passwordInput.value;
    goToChat(room, name, selectedLang, password, true);
  }
});

function goToChat(room, name, lang, password, isCreator) {
  const params = new URLSearchParams({
    room,
    name,
    lang,
    ...(password && { pwd: password }),
    ...(isCreator && { creator: '1' }),
  });
  window.location.href = `chat.html?${params.toString()}`;
}

// Enter key submits
nameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !btnEnter.disabled) btnEnter.click();
});
joinPwdInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !btnEnter.disabled) btnEnter.click();
});

// ─── Typewriter Animation ───────────────────────────────
(function initTypewriter() {
  const textEl = document.getElementById('typewriter-text');
  if (!textEl) return;

  const LANG_CODES = ['pt','en','es','fr','de','zh','ja','ar','ru','hi','ko','it','tr','pl','th'];
  const phrases = LANG_CODES.map(code => I18n.translations[code]['landing.subtitle']);

  const ERASE_SPEED = 25;
  const TYPE_SPEED = 50;
  const PAUSE_AFTER_TYPE = 2000;
  const PAUSE_AFTER_ERASE = 300;

  let phraseIndex = 0;
  let charIndex = phrases[0].length;
  let isErasing = false;
  let lastTime = 0;
  let pauseUntil = performance.now() + PAUSE_AFTER_TYPE;

  function tick(now) {
    if (now < pauseUntil) {
      requestAnimationFrame(tick);
      return;
    }

    const speed = isErasing ? ERASE_SPEED : TYPE_SPEED;
    if (now - lastTime < speed) {
      requestAnimationFrame(tick);
      return;
    }
    lastTime = now;

    const currentPhrase = phrases[phraseIndex];

    if (isErasing) {
      charIndex--;
      textEl.textContent = currentPhrase.substring(0, charIndex);
      if (charIndex <= 0) {
        isErasing = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        charIndex = 0;
        pauseUntil = now + PAUSE_AFTER_ERASE;
      }
    } else {
      const targetPhrase = phrases[phraseIndex];
      charIndex++;
      textEl.textContent = targetPhrase.substring(0, charIndex);
      if (charIndex >= targetPhrase.length) {
        isErasing = true;
        pauseUntil = now + PAUSE_AFTER_TYPE;
      }
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
})();
