<div align="center">

# 🗼 BabelChat

**Chat em tempo real com tradução automática por IA**

Converse com qualquer pessoa, em qualquer idioma — sem barreiras, zero configuração.

[![Live Demo](https://img.shields.io/badge/▶%20Live%20Demo-babelchat.com.br-7c6aff?style=for-the-badge&logo=googlechrome&logoColor=white)](https://babelchat.com.br)
[![GitHub Stars](https://img.shields.io/github/stars/alijaouharifilho/babelchat?style=for-the-badge&color=ff6b9d&logo=github)](https://github.com/alijaouharifilho/babelchat/stargazers)
[![License](https://img.shields.io/badge/license-MIT-34d399?style=for-the-badge)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4.1%20Nano-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com)

![Demo do BabelChat](demo.gif)

</div>

---

## Como funciona

```
🇧🇷 João digita:   "Olá, tudo bem?"

         ↓  GPT-4.1 Nano traduz em tempo real

🇺🇸 Mary  vê:  "Hello, how are you?"
🇯🇵 Yuki  vê:  "こんにちは、元気ですか？"
🇸🇦 Ahmed vê:  "مرحباً، كيف حالك؟"
```

1. Entre numa sala e escolha seu idioma
2. Compartilhe o link com quem quiser
3. Conversem normalmente — cada um lê no seu idioma

---

## Screenshots

<p align="center">
  <img src="screenshot-landing.png" width="30%" alt="Landing page com i18n" />
  &nbsp;
  <img src="screenshot-room.png"    width="30%" alt="Criando uma sala" />
  &nbsp;
  <img src="screenshot-chat.png"    width="30%" alt="Chat com upload de arquivo" />
</p>

---

## Features

| | Recurso |
|---|---|
| 🌍 | **15 idiomas** — PT, EN, ES, FR, DE, ZH, JA, AR, RU, HI, KO, IT, TR, PL, TH |
| 🏳️ | **Interface traduzida** — toda a UI muda de idioma ao clicar na bandeira |
| 🖼️ | **Imagens, arquivos e áudio** — envie mídia diretamente no chat |
| 🎙️ | **Transcrição de áudio** — voz transcrita automaticamente via Whisper antes de traduzir |
| 🔒 | **Salas com senha** — proteja conversas privadas |
| ⚡ | **Cache de tradução** — LRU cache evita chamadas duplicadas à API |
| 🌐 | **Texto original** — clique em qualquer mensagem para ver o original |
| 🔔 | **Notificações** — som + browser notification fora da aba |
| 📱 | **Mobile-first** — funciona no iPhone/Android, input não some atrás do teclado |
| ♻️ | **Salas efêmeras** — somem automaticamente quando todos saem |
| 🔇 | **Zero persistência** — nada é salvo, nada é logado |

---

## Stack

| Camada | Tech |
|---|---|
| Backend | Node.js · Express · Socket.io |
| Tradução | OpenAI GPT-4.1 Nano |
| Transcrição | OpenAI Whisper |
| Frontend | Vanilla HTML · CSS · JS (sem frameworks) |
| Deploy | Docker · Traefik · Portainer |
| Banco de dados | Nenhum — tudo in-memory |

---

## Rodando localmente

```bash
# 1. Clone
git clone https://github.com/alijaouharifilho/babelchat.git
cd babelchat

# 2. Instale as dependências
npm install

# 3. Configure a chave da OpenAI
echo "OPENAI_API_KEY=sua-chave-aqui" > .env

# 4. Rode
npm start
# → http://localhost:3000
```

---

## Deploy com Docker

```bash
# Build
docker build -t babelchat .

# Run
docker run -d -p 3000:3000 -e OPENAI_API_KEY=sua-chave babelchat
```

Um `docker-compose.yml` pronto para **Portainer + Traefik** com HTTPS está incluído no repositório.

---

## Custo estimado

GPT-4.1 Nano custa **$0.10/1M tokens input** e **$0.40/1M tokens output**.

> Uma mensagem (~50 palavras) traduzida para 5 idiomas custa aproximadamente **$0.00015**.
> Isso dá ~**6.600 mensagens multi-idioma por dólar**.

---

## Estrutura

```
babelchat/
├── server.js          # Express + Socket.io + lógica das salas
├── translator.js      # OpenAI wrapper + LRU cache
├── docker-compose.yml # Stack de produção (Portainer + Traefik)
├── public/
│   ├── index.html     # Landing page
│   ├── chat.html      # Chat
│   ├── style.css      # Dark theme
│   ├── i18n.js        # Traduções da UI (15 idiomas × 62 chaves)
│   ├── app.js         # Lógica da landing + typewriter animation
│   └── chat.js        # Lógica do chat (Socket.io, upload, áudio)
└── package.json
```

---

## Roadmap

- [x] Tradução em tempo real (15 idiomas)
- [x] Interface multilíngue com i18n completo
- [x] Upload de imagens, arquivos e áudio com Whisper
- [x] Deploy público — [babelchat.com.br](https://babelchat.com.br)
- [x] Layout mobile responsivo (iOS Safari)
- [ ] Reações com emoji nas mensagens
- [ ] Salas permanentes com Redis
- [ ] PWA / instalável no celular
- [ ] Rate limiting por IP

---

<div align="center">

Feito com ☕ e IA.

[![Live Demo](https://img.shields.io/badge/▶%20Experimente%20agora-babelchat.com.br-7c6aff?style=for-the-badge&logo=googlechrome&logoColor=white)](https://babelchat.com.br)

</div>
