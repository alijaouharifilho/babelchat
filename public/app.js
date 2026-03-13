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
  btn.innerHTML = `<span class="flag">${lang.flag}</span><span class="code">${lang.code.toUpperCase()}</span>`;
  btn.addEventListener('click', () => {
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedLang = lang.code;
    validate();
  });
  grid.appendChild(btn);
});

// ─── Joining vs Creating mode ───────────────────────────
if (isJoining) {
  document.getElementById('room-banner').classList.remove('hidden');
  document.getElementById('room-banner-text').textContent = `Entrando na sala: ${roomFromUrl}`;
  document.getElementById('create-section').classList.add('hidden');
  btnEnter.textContent = 'Entrar na Sala →';

  // Check if room has password
  fetch(`/api/room/${encodeURIComponent(roomFromUrl)}`)
    .then(r => r.json())
    .then(info => {
      if (info.hasPassword) {
        roomHasPassword = true;
        document.getElementById('password-section').classList.remove('hidden');
      }
      if (info.exists && info.count > 0) {
        document.getElementById('room-banner-text').textContent =
          `Entrando na sala: ${roomFromUrl} (${info.count} pessoa${info.count !== 1 ? 's' : ''} online)`;
      }
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
    hint.textContent = 'Letras, números e hífens. Deixe vazio para gerar um aleatório.';
    hint.className = 'hint';
    return true;
  }
  if (/^[a-zA-Z0-9][a-zA-Z0-9\-]{0,28}[a-zA-Z0-9]?$/.test(val) && val.length >= 2) {
    hint.textContent = '✓ Nome válido';
    hint.className = 'hint hint-ok';
    return true;
  }
  hint.textContent = 'Use apenas letras, números e hífens (mín. 2 caracteres)';
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
