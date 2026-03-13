const LANGUAGES = {
  pt: { name: 'Português',  flag: '🇧🇷' },
  en: { name: 'English',    flag: '🇺🇸' },
  es: { name: 'Español',    flag: '🇪🇸' },
  fr: { name: 'Français',   flag: '🇫🇷' },
  de: { name: 'Deutsch',    flag: '🇩🇪' },
  zh: { name: '中文',        flag: '🇨🇳' },
  ja: { name: '日本語',      flag: '🇯🇵' },
  ar: { name: 'العربية',    flag: '🇸🇦' },
  ru: { name: 'Русский',    flag: '🇷🇺' },
  hi: { name: 'हिन्दी',      flag: '🇮🇳' },
  ko: { name: '한국어',      flag: '🇰🇷' },
  it: { name: 'Italiano',   flag: '🇮🇹' },
  tr: { name: 'Türkçe',     flag: '🇹🇷' },
  pl: { name: 'Polski',     flag: '🇵🇱' },
  th: { name: 'ไทย',        flag: '🇹🇭' },
};

// ─── Read URL params ────────────────────────────────────
const params    = new URLSearchParams(window.location.search);
const roomId    = params.get('room');
const myName    = params.get('name');
const myLang    = params.get('lang');
const roomPwd   = params.get('pwd') || '';
const isCreator = params.get('creator') === '1';

if (!roomId || !myName || !myLang) window.location.href = '/';

// Clean URL (remove password from address bar)
if (roomPwd || isCreator) {
  const cleanParams = new URLSearchParams({ room: roomId, name: myName, lang: myLang });
  history.replaceState(null, '', `chat.html?${cleanParams.toString()}`);
}

// ─── Init header ────────────────────────────────────────
document.getElementById('room-id-display').textContent = roomId;
document.getElementById('my-name').textContent = myName;
document.getElementById('my-lang-flag').textContent = LANGUAGES[myLang]?.flag || '🌐';
document.title = `BabelChat · ${roomId}`;

// ─── Copy link ──────────────────────────────────────────
document.getElementById('btn-copy-link').addEventListener('click', () => {
  const url = `${window.location.origin}/?room=${encodeURIComponent(roomId)}`;
  navigator.clipboard.writeText(url).then(() => {
    const btn = document.getElementById('btn-copy-link');
    btn.textContent = '✓ Copiado!';
    setTimeout(() => (btn.textContent = '📋 Copiar link'), 2000);
  });
});

// ─── Notification sound (Web Audio API) ─────────────────
let audioCtx;
function playNotifSound() {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = 800;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  } catch {}
}

// ─── Browser notifications ──────────────────────────────
let notifEnabled = false;
const btnNotif = document.getElementById('btn-notif');

btnNotif.addEventListener('click', async () => {
  if (!('Notification' in window)) return;
  const perm = await Notification.requestPermission();
  if (perm === 'granted') {
    notifEnabled = true;
    btnNotif.textContent = '🔔';
    btnNotif.classList.add('notif-active');
  }
});

function sendNotification(from, text) {
  if (!notifEnabled || document.hasFocus()) return;
  try {
    new Notification(`${from} no BabelChat`, {
      body: text.substring(0, 100),
      icon: '/favicon.ico',
    });
  } catch {}
}

// ─── Tab title notifications ────────────────────────────
let unreadCount = 0;
const baseTitle = document.title;

function updateTitle() {
  document.title = unreadCount > 0 ? `(${unreadCount}) ${baseTitle}` : baseTitle;
}

window.addEventListener('focus', () => {
  unreadCount = 0;
  updateTitle();
});

// ─── Socket.io ──────────────────────────────────────────
const socket = io({ reconnection: true, reconnectionDelay: 1000, reconnectionAttempts: 20 });
const connBar  = document.getElementById('connection-bar');
const connText = document.getElementById('connection-text');

function joinRoom() {
  socket.emit('join', {
    roomId,
    name: myName,
    language: myLang,
    password: roomPwd,
    isCreator,
  });
}

socket.on('connect', () => {
  connBar.classList.add('hidden');
  joinRoom();
});

socket.on('disconnect', () => {
  connText.textContent = 'Conexão perdida... reconectando';
  connBar.classList.remove('hidden');
  connBar.className = 'connection-bar disconnected';
});

socket.on('reconnect', () => {
  connBar.classList.add('hidden');
});

socket.on('error-msg', ({ message }) => {
  alert(message);
  window.location.href = `/?room=${encodeURIComponent(roomId)}`;
});

socket.on('joined', ({ hasPassword }) => {
  if (hasPassword) document.getElementById('room-lock').classList.remove('hidden');
});

socket.on('room-update', ({ type, name, users }) => {
  updateUserList(users);
  if (type === 'joined') {
    addSystemMsg(name === myName ? 'Você entrou na sala 👋' : `${name} entrou`);
  } else if (type === 'left') {
    addSystemMsg(`${name} saiu`);
  }
});

socket.on('message', (msg) => {
  removeWelcome();
  addMessage(msg);

  if (!msg.isOwn) {
    if (!document.hasFocus()) {
      unreadCount++;
      updateTitle();
    }
    playNotifSound();
    sendNotification(msg.from, msg.text);
  }
});

// ─── Typing indicator ───────────────────────────────────
const typingUsers = new Set();
let typingTimer;

socket.on('typing', ({ name, isTyping }) => {
  if (isTyping) typingUsers.add(name);
  else typingUsers.delete(name);
  renderTyping();
});

function renderTyping() {
  const el = document.getElementById('typing-indicator');
  const names = Array.from(typingUsers);
  if (!names.length) { el.textContent = ''; return; }
  if (names.length === 1) el.textContent = `${names[0]} está digitando...`;
  else el.textContent = `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]} estão digitando...`;
}

// ─── Send message ────────────────────────────────────────
const msgInput = document.getElementById('message-input');
const btnSend  = document.getElementById('btn-send');

function sendMessage() {
  const text = msgInput.value.trim();
  if (!text) return;
  socket.emit('message', { text });
  msgInput.value = '';
  clearTimeout(typingTimer);
  socket.emit('typing', { isTyping: false });
}

btnSend.addEventListener('click', sendMessage);
msgInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

msgInput.addEventListener('input', () => {
  if (msgInput.value.trim()) {
    socket.emit('typing', { isTyping: true });
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => socket.emit('typing', { isTyping: false }), 2000);
  } else {
    clearTimeout(typingTimer);
    socket.emit('typing', { isTyping: false });
  }
});

// ─── DOM helpers ─────────────────────────────────────────
function removeWelcome() {
  const w = document.getElementById('welcome-msg');
  if (w) w.remove();
}

function addMessage({ from, fromLanguage, text, original, isOwn, timestamp }) {
  const area = document.getElementById('messages-area');
  const langInfo = LANGUAGES[fromLanguage];
  const flag = langInfo?.flag || '🌐';
  const langName = langInfo?.name || fromLanguage;

  const group = document.createElement('div');
  group.className = 'msg-group';

  const row = document.createElement('div');
  row.className = `msg-row${isOwn ? ' own' : ''}`;

  // Avatar
  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.textContent = flag;
  avatar.title = langName;

  // Bubble
  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';

  if (!isOwn) {
    const sender = document.createElement('div');
    sender.className = 'msg-sender';
    sender.textContent = `${flag} ${from}`;
    bubble.appendChild(sender);
  }

  const msgText = document.createElement('div');
  msgText.className = 'msg-text';
  msgText.textContent = text;
  bubble.appendChild(msgText);

  // Translated from indicator
  if (original) {
    const orig = document.createElement('div');
    orig.className = 'msg-original';

    const label = document.createElement('span');
    label.className = 'msg-original-label';
    label.textContent = `traduzido do ${langName}`;
    orig.appendChild(label);

    const origText = document.createElement('span');
    origText.className = 'msg-original-text';
    origText.textContent = original;
    orig.appendChild(origText);

    // Click to expand/collapse original
    orig.addEventListener('click', () => orig.classList.toggle('expanded'));

    bubble.appendChild(orig);
  }

  const time = document.createElement('div');
  time.className = 'msg-time';
  time.textContent = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  bubble.appendChild(time);

  if (!isOwn) row.appendChild(avatar);
  row.appendChild(bubble);
  group.appendChild(row);
  area.appendChild(group);

  area.scrollTop = area.scrollHeight;
}

function addSystemMsg(text) {
  const area = document.getElementById('messages-area');
  const el = document.createElement('div');
  el.className = 'sys-msg';
  el.innerHTML = `<span>${text}</span>`;
  area.appendChild(el);
  area.scrollTop = area.scrollHeight;
}

function updateUserList(users) {
  const list  = document.getElementById('user-list');
  const count = document.getElementById('user-count');
  count.textContent = `${users.length} pessoa${users.length !== 1 ? 's' : ''}`;

  // Language stats
  const langCount = {};
  users.forEach(u => { langCount[u.language] = (langCount[u.language] || 0) + 1; });
  const statsEl = document.getElementById('lang-stats');
  statsEl.innerHTML = Object.entries(langCount)
    .map(([lang, n]) => `<span class="lang-stat">${LANGUAGES[lang]?.flag || '🌐'} ${n}</span>`)
    .join('');

  list.innerHTML = '';
  users.forEach(user => {
    const isMe = user.name === myName && user.language === myLang;
    const li = document.createElement('li');
    li.className = `user-item${isMe ? ' is-me' : ''}`;
    const langInfo = LANGUAGES[user.language];
    li.innerHTML = `
      <span class="user-flag">${langInfo?.flag || '🌐'}</span>
      <span class="user-name">${user.name}</span>
      ${isMe ? '<span class="user-you">você</span>' : ''}
    `;
    li.title = langInfo?.name || user.language;
    list.appendChild(li);
  });
}
