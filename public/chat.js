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
const isCreator = params.get('creator') === '1';

// Password is passed via sessionStorage (set by app.js) to keep it out of
// URLs, browser history and referer headers. Consume and clear immediately.
const roomPwd = sessionStorage.getItem('babelchat-room-pwd') || '';
sessionStorage.removeItem('babelchat-room-pwd');

if (!roomId || !myName || !myLang) window.location.href = '/';

// Clean URL (strip creator flag)
if (isCreator) {
  const cleanParams = new URLSearchParams({ room: roomId, name: myName, lang: myLang });
  history.replaceState(null, '', `chat.html?${cleanParams.toString()}`);
}

// ─── Apply UI language ──────────────────────────────────
const uiLang = localStorage.getItem('babelchat-ui-lang') || myLang;
I18n.applyLanguage(uiLang);

// ─── UI language switcher (in-chat) ─────────────────────
// Users used to be stuck with whatever language they picked on the landing
// page; if they wanted the UI in a different language they had to leave
// the room. This dropdown lets them switch in place.
(function initUiLangSwitcher() {
  const btn  = document.getElementById('btn-ui-lang');
  const menu = document.getElementById('ui-lang-menu');
  if (!btn || !menu) return;

  // Build menu items in the same order as the language code list.
  Object.entries(LANGUAGES).forEach(([code, info]) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'ui-lang-item';
    item.setAttribute('role', 'menuitem');
    item.dataset.code = code;
    item.innerHTML = `<span class="ui-lang-flag">${info.flag}</span><span class="ui-lang-name">${info.name}</span>`;
    item.addEventListener('click', () => {
      I18n.applyLanguage(code);
      markActive(code);
      closeMenu();
    });
    menu.appendChild(item);
  });

  function markActive(code) {
    menu.querySelectorAll('.ui-lang-item').forEach(el => {
      el.classList.toggle('active', el.dataset.code === code);
    });
  }
  markActive(I18n.getCurrentLang());

  function openMenu()  { menu.classList.remove('hidden'); btn.setAttribute('aria-expanded', 'true');  }
  function closeMenu() { menu.classList.add('hidden');    btn.setAttribute('aria-expanded', 'false'); }

  btn.addEventListener('click', e => {
    e.stopPropagation();
    menu.classList.contains('hidden') ? openMenu() : closeMenu();
  });

  // Click outside closes the menu.
  document.addEventListener('click', e => {
    if (!menu.contains(e.target) && e.target !== btn) closeMenu();
  });
  // Esc closes too.
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMenu();
  });
})();

// ─── iOS Safari: fix keyboard dismiss leaving input stuck ─
// visualViewport fires reliably when soft keyboard shows/hides;
// window.innerHeight / dvh don't always update on dismiss.
if (window.visualViewport) {
  const layout = document.querySelector('.chat-layout');
  const syncHeight = () => {
    layout.style.height = window.visualViewport.height + 'px';
    window.scrollTo(0, 0);
  };
  window.visualViewport.addEventListener('resize', syncHeight);
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
    btn.textContent = I18n.t('chat.copied');
    setTimeout(() => (btn.textContent = I18n.t('chat.copy_link_text')), 2000);
  });
});

// ─── Notification sound ─────────────────────────────────
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
    btnNotif.classList.add('notif-active');
  }
});

function sendNotification(from, text) {
  if (!notifEnabled || document.hasFocus()) return;
  try { new Notification(`${from} ${I18n.t('chat.in_babelchat')}`, { body: (text || '').substring(0, 100) }); } catch {}
}

// ─── Tab title notifications ────────────────────────────
let unreadCount = 0;
const baseTitle = document.title;
function updateTitle() {
  document.title = unreadCount > 0 ? `(${unreadCount}) ${baseTitle}` : baseTitle;
}
window.addEventListener('focus', () => { unreadCount = 0; updateTitle(); });

// ─── Socket.io ──────────────────────────────────────────
const socket = io({ reconnection: true, reconnectionDelay: 1000, reconnectionAttempts: 20 });
const connBar  = document.getElementById('connection-bar');
const connText = document.getElementById('connection-text');

function joinRoom() {
  socket.emit('join', { roomId, name: myName, language: myLang, password: roomPwd, isCreator });
}

socket.on('connect', () => { connBar.classList.add('hidden'); joinRoom(); });
socket.on('disconnect', () => {
  connText.textContent = I18n.t('chat.connection_lost');
  connBar.classList.remove('hidden');
  connBar.className = 'connection-bar disconnected';
});
socket.on('reconnect', () => { connBar.classList.add('hidden'); });

socket.on('error-msg', ({ message, fatal }) => {
  if (fatal === false) {
    // Transient error (e.g. rate limit) — surface inline, keep the user in the room.
    addSystemMsg(message);
    return;
  }
  alert(message);
  window.location.href = `/?room=${encodeURIComponent(roomId)}`;
});

socket.on('joined', ({ hasPassword }) => {
  if (hasPassword) document.getElementById('room-lock').classList.remove('hidden');
});

socket.on('room-update', ({ type, name, users }) => {
  updateUserList(users);
  if (type === 'joined') {
    addSystemMsg(name === myName ? I18n.t('chat.you_joined') : I18n.t('chat.user_joined', { name }));
  } else if (type === 'left') {
    // Clear any stale "typing" state for the user who just left, otherwise
    // the indicator sticks around forever.
    if (typingUsers.delete(name)) renderTyping();
    addSystemMsg(I18n.t('chat.user_left', { name }));
  }
});

socket.on('message', (msg) => {
  console.log('[BabelChat] msg received:', msg.type, msg);
  removeWelcome();
  addMessage(msg);
  if (!msg.isOwn) {
    if (!document.hasFocus()) { unreadCount++; updateTitle(); }
    playNotifSound();
    sendNotification(msg.from, msg.text || I18n.t('chat.new_media'));
  }
});

// ─── Typing indicator ───────────────────────────────────
const typingUsers = new Set();
let typingTimer;

socket.on('typing', ({ name, isTyping }) => {
  if (isTyping) typingUsers.add(name); else typingUsers.delete(name);
  renderTyping();
});

function renderTyping() {
  const el = document.getElementById('typing-indicator');
  const names = Array.from(typingUsers);
  if (!names.length) { el.textContent = ''; return; }
  if (names.length === 1) {
    el.textContent = I18n.t('chat.typing_one', { name: names[0] });
  } else {
    el.textContent = I18n.t('chat.typing_many', {
      names: names.slice(0, -1).join(', '),
      last: names[names.length - 1],
    });
  }
}

// ─── Send text message ──────────────────────────────────
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

// ═══════════════════════════════════════════════════════
//  FILE UPLOAD
// ═══════════════════════════════════════════════════════
const fileInput = document.getElementById('file-input');
const btnAttach = document.getElementById('btn-attach');

btnAttach.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
  if (fileInput.files.length) uploadFile(fileInput.files[0]);
  fileInput.value = '';
});

async function uploadFile(file) {
  if (file.size > 10 * 1024 * 1024) {
    return addSystemMsg(I18n.t('chat.file_too_large'));
  }

  // Show uploading indicator
  const placeholderId = addUploadingPlaceholder(file);

  const form = new FormData();
  form.append('file', file);
  form.append('roomId', roomId);
  form.append('socketId', socket.id);

  try {
    const res = await fetch('/api/upload', { method: 'POST', body: form });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Upload failed');
    }
  } catch (err) {
    addSystemMsg(I18n.t('chat.upload_error', { error: err.message }));
  }

  // Remove uploading placeholder
  removePlaceholder(placeholderId);
}

function addUploadingPlaceholder(file) {
  const id = 'upload-' + Date.now();
  const area = document.getElementById('messages-area');
  const el = document.createElement('div');
  el.className = 'sys-msg uploading';
  el.id = id;
  const isAudio = file.type.startsWith('audio/');
  const label = isAudio
    ? I18n.t('chat.transcribing_audio')
    : I18n.t('chat.uploading_file', { filename: file.name });
  el.innerHTML = `<span class="upload-pill">${label}<span class="spinner"></span></span>`;
  area.appendChild(el);
  area.scrollTop = area.scrollHeight;
  return id;
}

function removePlaceholder(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// ─── Drag & drop ────────────────────────────────────────
const chatBody = document.querySelector('.chat-body');
const dropOverlay = document.getElementById('drop-overlay');
let dragCounter = 0;

chatBody.addEventListener('dragenter', e => {
  e.preventDefault();
  dragCounter++;
  dropOverlay.classList.remove('hidden');
});

chatBody.addEventListener('dragleave', e => {
  e.preventDefault();
  dragCounter--;
  if (dragCounter <= 0) { dropOverlay.classList.add('hidden'); dragCounter = 0; }
});

chatBody.addEventListener('dragover', e => e.preventDefault());

chatBody.addEventListener('drop', e => {
  e.preventDefault();
  dragCounter = 0;
  dropOverlay.classList.add('hidden');
  if (e.dataTransfer.files.length) uploadFile(e.dataTransfer.files[0]);
});

// ═══════════════════════════════════════════════════════
//  AUDIO RECORDING
// ═══════════════════════════════════════════════════════
const btnMic      = document.getElementById('btn-mic');
const recBar      = document.getElementById('recording-bar');
const recTimerEl  = document.getElementById('rec-timer');
const btnRecCancel = document.getElementById('btn-rec-cancel');

let mediaRecorder = null;
let audioChunks   = [];
let recInterval   = null;
let recStartTime  = 0;

btnMic.addEventListener('click', async () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    stopRecording(true); // send
  } else {
    await startRecording();
  }
});

btnRecCancel.addEventListener('click', () => stopRecording(false)); // discard

async function startRecording() {
  let stream = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream, { mimeType: getSupportedMimeType() });
    audioChunks = [];

    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };

    mediaRecorder.start(100); // collect data every 100ms for reliability
    recStartTime = Date.now();

    // UI
    btnMic.classList.add('recording');
    recBar.classList.remove('hidden');
    recTimerEl.textContent = '0:00';
    recInterval = setInterval(updateRecTimer, 1000);
  } catch (err) {
    // If getUserMedia succeeded but something after it threw (e.g. unsupported
    // mimeType on MediaRecorder), release the mic instead of leaking the
    // stream and leaving the browser recording indicator on.
    if (stream) stream.getTracks().forEach(t => t.stop());
    mediaRecorder = null;
    addSystemMsg(I18n.t('chat.mic_error'));
  }
}

function stopRecording(shouldSend) {
  if (!mediaRecorder) return;

  // Save references BEFORE clearing — stop() is async
  const recorder = mediaRecorder;
  const chunks = audioChunks;

  clearInterval(recInterval);
  btnMic.classList.remove('recording');
  recBar.classList.add('hidden');

  // Reset state immediately so user can start a new recording
  mediaRecorder = null;
  audioChunks = [];

  // onstop fires after all pending ondataavailable events
  recorder.onstop = () => {
    // Release microphone
    recorder.stream.getTracks().forEach(t => t.stop());

    if (shouldSend && chunks.length > 0) {
      const ext = recorder.mimeType.includes('webm') ? 'webm' : 'mp4';
      const blob = new Blob(chunks, { type: recorder.mimeType });
      const file = new File([blob], `audio.${ext}`, { type: recorder.mimeType });
      uploadFile(file);
    }
  };

  recorder.stop(); // triggers remaining ondataavailable, then onstop
}

function updateRecTimer() {
  const secs = Math.floor((Date.now() - recStartTime) / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  recTimerEl.textContent = `${m}:${s.toString().padStart(2, '0')}`;
}

function getSupportedMimeType() {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
  for (const t of types) { if (MediaRecorder.isTypeSupported(t)) return t; }
  return 'audio/webm';
}

// ═══════════════════════════════════════════════════════
//  DOM RENDERING
// ═══════════════════════════════════════════════════════
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function removeWelcome() {
  const w = document.getElementById('welcome-msg');
  if (w) w.remove();
}

// "Near the bottom" = within 80px. Keeps auto-scroll working even if the
// user is a few pixels off, but stops hijacking their scroll when they're
// reading older messages.
function isNearBottom(area) {
  return area.scrollHeight - area.scrollTop - area.clientHeight < 80;
}

// ─── Jump-to-bottom pill ────────────────────────────────
const jumpBtn = document.getElementById('jump-to-bottom');
const jumpCountEl = document.getElementById('jump-count');
let jumpCount = 0;

function bumpJumpPill() {
  jumpCount++;
  jumpCountEl.textContent = jumpCount;
  jumpBtn.classList.remove('hidden');
}

function clearJumpPill() {
  jumpCount = 0;
  jumpBtn.classList.add('hidden');
}

jumpBtn.addEventListener('click', () => {
  const area = document.getElementById('messages-area');
  area.scrollTo({ top: area.scrollHeight, behavior: 'smooth' });
  clearJumpPill();
});

// If the user scrolls back to the bottom on their own, hide the pill.
document.getElementById('messages-area').addEventListener('scroll', () => {
  if (jumpCount > 0 && isNearBottom(document.getElementById('messages-area'))) {
    clearJumpPill();
  }
});

function addMessage(msg) {
  const { type, from, fromLanguage, text, original, isOwn, timestamp, imageUrl, audioUrl, fileUrl, fileName, fileSize } = msg;
  const area = document.getElementById('messages-area');
  const wasAtBottom = isNearBottom(area);
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

  // ─── IMAGE ────────────────────────────────────────
  if ((type === 'image' || (!type && imageUrl)) && imageUrl) {
    const imgWrap = document.createElement('div');
    imgWrap.className = 'msg-image-wrap';
    imgWrap.textContent = I18n.t('chat.loading_image');

    const img = document.createElement('img');
    img.className = 'msg-image';
    img.src = imageUrl;
    img.alt = I18n.t('chat.image_alt');
    img.onload = () => {
      imgWrap.textContent = '';
      imgWrap.appendChild(img);
      // Same rule: don't yank the user's scroll if they're reading older messages.
      if (isNearBottom(area) || isOwn) area.scrollTop = area.scrollHeight;
    };
    img.onerror = () => { imgWrap.textContent = I18n.t('chat.image_load_error'); };
    img.addEventListener('click', () => window.open(imageUrl, '_blank'));
    bubble.appendChild(imgWrap);
  }

  // ─── AUDIO (transcribed) ──────────────────────────
  if (type === 'audio') {
    const audioLabel = document.createElement('div');
    audioLabel.className = 'msg-audio-label';
    audioLabel.textContent = I18n.t('chat.voice_message');
    bubble.appendChild(audioLabel);

    if (text) {
      const msgText = document.createElement('div');
      msgText.className = 'msg-text';
      msgText.textContent = text;
      bubble.appendChild(msgText);
    }

    if (audioUrl) {
      const audio = document.createElement('audio');
      audio.className = 'msg-audio-player';
      audio.controls = true;
      audio.preload = 'metadata';
      audio.src = audioUrl;
      bubble.appendChild(audio);
    }
  }

  // ─── FILE ─────────────────────────────────────────
  if ((type === 'file' || (!type && fileUrl)) && fileUrl) {
    const card = document.createElement('a');
    card.className = 'msg-file-card';
    card.href = fileUrl;
    card.download = fileName || 'file';
    card.innerHTML = `
      <span class="file-icon">📄</span>
      <div class="file-info">
        <span class="file-name">${escapeHtml(fileName || I18n.t('chat.file_fallback_name'))}</span>
        <span class="file-size">${escapeHtml(fileSize || '')}</span>
      </div>
      <span class="file-download">⬇</span>
    `;
    bubble.appendChild(card);
  }

  // ─── TEXT ─────────────────────────────────────────
  if ((type === 'text' || !type) && text) {
    const msgText = document.createElement('div');
    msgText.className = 'msg-text';
    msgText.textContent = text;
    bubble.appendChild(msgText);
  }

  // ─── "Translated from" indicator ──────────────────
  if (original) {
    const orig = document.createElement('button');
    orig.type = 'button';
    orig.className = 'msg-original';
    orig.setAttribute('aria-expanded', 'false');

    const label = document.createElement('span');
    label.className = 'msg-original-label';
    label.textContent = I18n.t('chat.translated_from', { language: langName });
    orig.appendChild(label);

    // Visible chevron — rotates when expanded via CSS.
    const caret = document.createElement('span');
    caret.className = 'msg-original-caret';
    caret.textContent = '▾';
    caret.setAttribute('aria-hidden', 'true');
    orig.appendChild(caret);

    const origText = document.createElement('span');
    origText.className = 'msg-original-text';
    origText.textContent = original;
    orig.appendChild(origText);

    orig.addEventListener('click', () => {
      const expanded = orig.classList.toggle('expanded');
      orig.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    });
    bubble.appendChild(orig);
  }

  // Timestamp
  const time = document.createElement('div');
  time.className = 'msg-time';
  time.textContent = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  bubble.appendChild(time);

  if (!isOwn) row.appendChild(avatar);
  row.appendChild(bubble);
  group.appendChild(row);
  area.appendChild(group);

  // Only auto-scroll if the user was already at the bottom, OR they just
  // sent the message themselves (their own message should always appear).
  if (wasAtBottom || isOwn) {
    area.scrollTop = area.scrollHeight;
  } else if (!isOwn) {
    // User is reading older messages — bump the jump pill instead of
    // silently appending below the fold.
    bumpJumpPill();
  }
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
  const word = users.length !== 1 ? I18n.t('chat.persons') : I18n.t('chat.person');
  count.textContent = `${users.length} ${word}`;

  const langCount = {};
  users.forEach(u => { langCount[u.language] = (langCount[u.language] || 0) + 1; });
  document.getElementById('lang-stats').innerHTML = Object.entries(langCount)
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
      ${isMe ? `<span class="user-you">${I18n.t('chat.you_badge')}</span>` : ''}
    `;
    li.title = langInfo?.name || user.language;
    list.appendChild(li);
  });
}
