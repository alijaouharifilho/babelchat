<div align="center">

# 🗼 BabelChat

**Real-time chat with automatic AI translation**

Talk to anyone, in any language — no barriers, zero configuration.

[![Live Demo](https://img.shields.io/badge/▶%20Live%20Demo-babelchat.com.br-7c6aff?style=for-the-badge&logo=googlechrome&logoColor=white)](https://babelchat.com.br)
[![GitHub Stars](https://img.shields.io/github/stars/alijaouharifilho/babelchat?style=for-the-badge&color=ff6b9d&logo=github)](https://github.com/alijaouharifilho/babelchat/stargazers)
[![License](https://img.shields.io/badge/license-MIT-34d399?style=for-the-badge)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4.1%20Nano-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com)

![BabelChat Demo](demo.gif)

</div>

---

## How it works

```
🇧🇷 João types:   "Olá, tudo bem?"

         ↓  GPT-4.1 Nano translates in real time

🇺🇸 Mary  sees:  "Hello, how are you?"
🇯🇵 Yuki  sees:  "こんにちは、元気ですか？"
🇸🇦 Ahmed sees:  "مرحباً، كيف حالك؟"
```

1. Join a room and pick your language
2. Share the link with whoever you want
3. Chat normally — everyone reads in their own language

---

## Screenshots

<p align="center">
  <img src="screenshot-landing.png" width="30%" alt="Landing page with i18n" />
  &nbsp;
  <img src="screenshot-room.png"    width="30%" alt="Creating a room" />
  &nbsp;
  <img src="screenshot-chat.png"    width="30%" alt="Chat with file upload" />
</p>

---

## Features

| | Feature |
|---|---|
| 🌍 | **15 languages** — PT, EN, ES, FR, DE, ZH, JA, AR, RU, HI, KO, IT, TR, PL, TH |
| 🏳️ | **Translated UI** — the entire interface switches language when you click a flag |
| 🖼️ | **Images, files & audio** — send media directly in the chat |
| 🎙️ | **Audio transcription** — voice automatically transcribed via Whisper before translating |
| 🔒 | **Password-protected rooms** — keep private conversations private |
| ⚡ | **Translation cache** — LRU cache avoids duplicate API calls |
| 🌐 | **Original text** — click any message to see the original |
| 🔔 | **Notifications** — sound + browser notification when the tab is in the background |
| 📱 | **Mobile-first** — works on iPhone/Android, input doesn't hide behind the keyboard |
| ♻️ | **Ephemeral rooms** — automatically deleted when everyone leaves |
| 🔇 | **Zero persistence** — nothing is saved, nothing is logged |

---

## Stack

| Layer | Tech |
|---|---|
| Backend | Node.js · Express · Socket.io |
| Translation | OpenAI GPT-4.1 Nano |
| Transcription | OpenAI Whisper |
| Frontend | Vanilla HTML · CSS · JS (no frameworks) |
| Deploy | Docker · Traefik · Portainer |
| Database | None — everything in-memory |

---

## Running locally

```bash
# 1. Clone
git clone https://github.com/alijaouharifilho/babelchat.git
cd babelchat

# 2. Install dependencies
npm install

# 3. Set your OpenAI key
echo "OPENAI_API_KEY=your-key-here" > .env

# 4. Run
npm start
# → http://localhost:3000
```

---

## Deploy with Docker

```bash
# Build
docker build -t babelchat .

# Run
docker run -d -p 3000:3000 -e OPENAI_API_KEY=your-key babelchat
```

A `docker-compose.yml` ready for **Portainer + Traefik** with HTTPS is included in the repository.

---

## Estimated cost

GPT-4.1 Nano costs **$0.10/1M input tokens** and **$0.40/1M output tokens**.

> A message (~50 words) translated into 5 languages costs approximately **$0.00015**.
> That's ~**6,600 multi-language messages per dollar**.

---

## Project structure

```
babelchat/
├── server.js          # Express + Socket.io + room logic
├── translator.js      # OpenAI wrapper + LRU cache
├── docker-compose.yml # Production stack (Portainer + Traefik)
├── public/
│   ├── index.html     # Landing page
│   ├── chat.html      # Chat
│   ├── style.css      # Dark theme
│   ├── i18n.js        # UI translations (15 languages × 62 keys)
│   ├── app.js         # Landing logic + typewriter animation
│   └── chat.js        # Chat logic (Socket.io, upload, audio)
└── package.json
```

---

## Roadmap

- [x] Real-time translation (15 languages)
- [x] Multilingual UI with full i18n
- [x] Image, file and audio upload with Whisper
- [x] Public deployment — [babelchat.com.br](https://babelchat.com.br)
- [x] Responsive mobile layout (iOS Safari)
- [ ] Emoji reactions on messages
- [ ] Persistent rooms with Redis
- [ ] PWA / installable on mobile
- [ ] Rate limiting per IP

---

<div align="center">

Made with ☕ and AI.

[![Live Demo](https://img.shields.io/badge/▶%20Try%20it%20now-babelchat.com.br-7c6aff?style=for-the-badge&logo=googlechrome&logoColor=white)](https://babelchat.com.br)

</div>
