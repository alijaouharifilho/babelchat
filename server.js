require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const { translate, transcribe, detectLanguage, LANG_NAMES } = require('./translator');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  pingTimeout: 30000,
  pingInterval: 10000,
  maxHttpBufferSize: 1e7,
});

// ─── Uploads directory ─────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const UPLOADS_TMP = path.join(UPLOADS_DIR, '_tmp');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);
if (!fs.existsSync(UPLOADS_TMP)) fs.mkdirSync(UPLOADS_TMP);

// ─── Multer config ─────────────────────────────────────
// NOTE: Save to _tmp first because multer's destination callback
// runs BEFORE req.body is populated with text fields from FormData.
// We move the file to the correct room directory in the route handler.
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_TMP);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Move file from _tmp to the correct room directory
function moveToRoomDir(file, roomId) {
  const roomDir = path.join(UPLOADS_DIR, roomId);
  if (!fs.existsSync(roomDir)) fs.mkdirSync(roomDir, { recursive: true });
  const newPath = path.join(roomDir, file.filename);
  fs.renameSync(file.path, newPath);
  return newPath;
}

app.use(express.static('public'));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.json());

// ─── Room storage ──────────────────────────────────────
const rooms = new Map();

// ─── Helpers ───────────────────────────────────────────
function getFileType(mimetype) {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('audio/')) return 'audio';
  return 'file';
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function translateForRoom(room, text, senderLang) {
  const langs = new Set();
  room.users.forEach(u => langs.add(u.language));

  const cache = new Map([[senderLang, text]]);

  await Promise.all(
    Array.from(langs)
      .filter(lang => lang !== senderLang)
      .map(async lang => {
        cache.set(lang, await translate(text, senderLang, lang));
      })
  );

  return cache;
}

function broadcastMessage(roomId, room, msgBase, translations, senderSid, senderLang) {
  const timestamp = Date.now();
  const msgId = uuidv4();

  room.users.forEach((user, sid) => {
    const translatedText = translations
      ? (translations.get(user.language) || msgBase.text)
      : msgBase.text;
    const isTranslated = translations && user.language !== senderLang;

    io.to(sid).emit('message', {
      ...msgBase,
      id: msgId,
      text: translatedText,
      original: isTranslated ? (translations.get(senderLang) || msgBase.text) : null,
      isOwn: sid === senderSid,
      timestamp,
    });
  });
}

function cleanupRoomFiles(roomId) {
  const roomDir = path.join(UPLOADS_DIR, roomId);
  if (fs.existsSync(roomDir)) {
    fs.rmSync(roomDir, { recursive: true, force: true });
    console.log(`[${roomId}] Arquivos removidos.`);
  }
}

// ─── API: check room ───────────────────────────────────
app.get('/api/room/:id', (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) return res.json({ exists: false, hasPassword: false, count: 0 });
  res.json({ exists: true, hasPassword: !!room.password, count: room.users.size });
});

// ─── API: file upload ──────────────────────────────────
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const { roomId, userName, userLang } = req.body;
    const file = req.file;

    if (!file || !roomId || !userName || !userLang)
      return res.status(400).json({ error: 'Missing data' });

    const room = rooms.get(roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    // Move file from _tmp to the correct room directory
    const newPath = moveToRoomDir(file, roomId);
    file.path = newPath;

    // Find sender socket
    let senderSid = null;
    room.users.forEach((u, sid) => {
      if (u.name === userName && u.language === userLang) senderSid = sid;
    });

    const type = getFileType(file.mimetype);
    const fileUrl = `/uploads/${roomId}/${file.filename}`;

    console.log(`[${roomId}] ${userName} enviou ${type}: ${file.originalname} (${formatBytes(file.size)}) senderSid=${senderSid ? 'found' : 'NOT FOUND'}`);
    console.log(`[${roomId}] File saved: ${fileUrl}`);

    // ─── AUDIO → Transcribe → Translate → Broadcast ──
    if (type === 'audio') {
      const transcript = await transcribe(file.path);
      if (!transcript) return res.status(500).json({ error: 'Transcription failed' });

      console.log(`[${roomId}] Transcrição: "${transcript}"`);

      const detectedLang = await detectLanguage(transcript) || userLang;
      const translations = await translateForRoom(room, transcript, detectedLang);

      broadcastMessage(roomId, room, {
        type: 'audio',
        from: userName,
        fromLanguage: userLang,
        text: transcript,
        audioUrl: fileUrl,
      }, translations, senderSid, detectedLang);

      return res.json({ ok: true, type: 'audio', transcript });
    }

    // ─── IMAGE → Broadcast inline ────────────────────
    if (type === 'image') {
      broadcastMessage(roomId, room, {
        type: 'image',
        from: userName,
        fromLanguage: userLang,
        text: null,
        imageUrl: fileUrl,
      }, null, senderSid, userLang);

      return res.json({ ok: true, type: 'image', url: fileUrl });
    }

    // ─── FILE → Broadcast download card ──────────────
    broadcastMessage(roomId, room, {
      type: 'file',
      from: userName,
      fromLanguage: userLang,
      text: null,
      fileUrl,
      fileName: file.originalname,
      fileSize: formatBytes(file.size),
    }, null, senderSid, userLang);

    return res.json({ ok: true, type: 'file', url: fileUrl });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// ─── Socket.io ─────────────────────────────────────────
io.on('connection', (socket) => {
  let currentRoom = null;
  let currentUser = null;

  socket.on('join', ({ roomId, name, language, password, isCreator }) => {
    if (!roomId || !name || !language) return;
    if (!LANG_NAMES[language]) return socket.emit('error-msg', { message: 'Idioma inválido.' });

    const safeName = name.trim().substring(0, 30);
    const safeRoom = roomId.trim().substring(0, 30);

    if (!rooms.has(safeRoom)) {
      rooms.set(safeRoom, {
        users: new Map(),
        password: (isCreator && password) ? password : null,
        createdAt: Date.now(),
      });
      console.log(`[${safeRoom}] Sala criada${(isCreator && password) ? ' (com senha)' : ''}`);
    }

    const room = rooms.get(safeRoom);

    if (room.password && room.password !== password)
      return socket.emit('error-msg', { message: 'Senha incorreta.' });

    const nameExists = Array.from(room.users.values()).some(
      u => u.name.toLowerCase() === safeName.toLowerCase()
    );
    if (nameExists)
      return socket.emit('error-msg', { message: 'Esse nome já está em uso nesta sala.' });

    currentRoom = safeRoom;
    currentUser = { name: safeName, language };
    room.users.set(socket.id, { name: safeName, language });
    socket.join(safeRoom);

    socket.emit('joined', { roomId: safeRoom, hasPassword: !!room.password, users: Array.from(room.users.values()) });
    io.to(safeRoom).emit('room-update', { type: 'joined', name: safeName, language, users: Array.from(room.users.values()) });

    console.log(`[${safeRoom}] ${safeName} (${language}) entrou — ${room.users.size} na sala`);
  });

  socket.on('message', async ({ text }) => {
    if (!currentRoom || !currentUser || !text?.trim()) return;

    const room = rooms.get(currentRoom);
    if (!room) return;

    const trimmed = text.trim().substring(0, 2000);
    const translations = await translateForRoom(room, trimmed, currentUser.language);

    broadcastMessage(currentRoom, room, {
      type: 'text',
      from: currentUser.name,
      fromLanguage: currentUser.language,
      text: trimmed,
    }, translations, socket.id, currentUser.language);
  });

  socket.on('typing', ({ isTyping }) => {
    if (!currentRoom || !currentUser) return;
    socket.to(currentRoom).emit('typing', { name: currentUser.name, isTyping });
  });

  socket.on('disconnect', () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    room.users.delete(socket.id);

    if (room.users.size === 0) {
      rooms.delete(currentRoom);
      cleanupRoomFiles(currentRoom);
      console.log(`[${currentRoom}] Sala encerrada.`);
    } else {
      io.to(currentRoom).emit('room-update', { type: 'left', name: currentUser?.name, users: Array.from(room.users.values()) });
      console.log(`[${currentRoom}] ${currentUser?.name} saiu — ${room.users.size} na sala`);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🗼 BabelChat rodando em http://localhost:${PORT}`);
});
