require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const { translate, LANG_NAMES } = require('./translator');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  pingTimeout: 30000,
  pingInterval: 10000,
});

app.use(express.static('public'));
app.use(express.json());

// ─── Room storage ──────────────────────────────────────
// rooms: Map<roomId, { users: Map<socketId, user>, password?, createdAt }>
const rooms = new Map();

// ─── Validate room slug ────────────────────────────────
function isValidSlug(slug) {
  return /^[a-zA-Z0-9][a-zA-Z0-9\-]{1,28}[a-zA-Z0-9]$/.test(slug);
}

// ─── API: check room ───────────────────────────────────
app.get('/api/room/:id', (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room) return res.json({ exists: false, hasPassword: false, count: 0 });
  res.json({
    exists: true,
    hasPassword: !!room.password,
    count: room.users.size,
    languages: [...new Set(Array.from(room.users.values()).map(u => u.language))],
  });
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

    // ─── Room creation ─────────────────────────────
    if (!rooms.has(safeRoom)) {
      if (isCreator) {
        rooms.set(safeRoom, {
          users: new Map(),
          password: password || null,
          createdAt: Date.now(),
        });
        console.log(`[${safeRoom}] Sala criada${password ? ' (com senha)' : ''}`);
      } else {
        // Joining a room that doesn't exist yet — auto-create without password
        rooms.set(safeRoom, {
          users: new Map(),
          password: null,
          createdAt: Date.now(),
        });
      }
    }

    const room = rooms.get(safeRoom);

    // ─── Password check ────────────────────────────
    if (room.password && room.password !== password) {
      return socket.emit('error-msg', { message: 'Senha incorreta.' });
    }

    // ─── Check duplicate name ──────────────────────
    const nameExists = Array.from(room.users.values()).some(
      u => u.name.toLowerCase() === safeName.toLowerCase()
    );
    if (nameExists) {
      return socket.emit('error-msg', { message: 'Esse nome já está em uso nesta sala.' });
    }

    currentRoom = safeRoom;
    currentUser = { name: safeName, language };

    room.users.set(socket.id, { name: safeName, language });
    socket.join(safeRoom);

    // Send room info to the joiner
    socket.emit('joined', {
      roomId: safeRoom,
      hasPassword: !!room.password,
      users: Array.from(room.users.values()),
    });

    // Notify room
    io.to(safeRoom).emit('room-update', {
      type: 'joined',
      name: safeName,
      language,
      users: Array.from(room.users.values()),
    });

    console.log(`[${safeRoom}] ${safeName} (${language}) entrou — ${room.users.size} na sala`);
  });

  socket.on('message', async ({ text }) => {
    if (!currentRoom || !currentUser || !text?.trim()) return;

    const room = rooms.get(currentRoom);
    if (!room) return;

    const trimmed = text.trim().substring(0, 2000);

    // Collect unique target languages
    const langGroups = new Map();
    room.users.forEach((user, sid) => {
      if (!langGroups.has(user.language)) langGroups.set(user.language, []);
      langGroups.get(user.language).push(sid);
    });

    // Translation cache for this message
    const cache = new Map([[currentUser.language, trimmed]]);

    // Translate to all unique languages in parallel
    await Promise.all(
      Array.from(langGroups.keys())
        .filter((lang) => lang !== currentUser.language)
        .map(async (lang) => {
          const translated = await translate(trimmed, currentUser.language, lang);
          cache.set(lang, translated);
        })
    );

    // Deliver to each user
    const timestamp = Date.now();
    const msgId = uuidv4();

    room.users.forEach((user, sid) => {
      const translatedText = cache.get(user.language) || trimmed;
      const isTranslated = user.language !== currentUser.language;

      io.to(sid).emit('message', {
        id: msgId,
        from: currentUser.name,
        fromLanguage: currentUser.language,
        text: translatedText,
        original: isTranslated ? trimmed : null,
        isOwn: sid === socket.id,
        timestamp,
      });
    });
  });

  socket.on('typing', ({ isTyping }) => {
    if (!currentRoom || !currentUser) return;
    socket.to(currentRoom).emit('typing', {
      name: currentUser.name,
      isTyping,
    });
  });

  socket.on('disconnect', () => {
    if (!currentRoom) return;

    const room = rooms.get(currentRoom);
    if (!room) return;

    room.users.delete(socket.id);

    if (room.users.size === 0) {
      rooms.delete(currentRoom);
      console.log(`[${currentRoom}] Sala encerrada.`);
    } else {
      io.to(currentRoom).emit('room-update', {
        type: 'left',
        name: currentUser?.name,
        users: Array.from(room.users.values()),
      });
      console.log(`[${currentRoom}] ${currentUser?.name} saiu — ${room.users.size} na sala`);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🗼 BabelChat rodando em http://localhost:${PORT}`);
});
