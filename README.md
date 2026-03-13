# 🗼 BabelChat

**Converse com qualquer pessoa, em qualquer idioma.**

Chat em tempo real onde cada mensagem é traduzida automaticamente para o idioma de cada participante usando IA. Sem barreiras.

---

## Como funciona

1. Você entra numa sala e escolhe seu idioma
2. Outra pessoa entra na mesma sala e escolhe o idioma dela
3. Vocês conversam normalmente — cada um lê tudo no seu próprio idioma
4. A tradução acontece em tempo real via GPT-4.1 Nano

```
🇧🇷 João: "Olá, tudo bem?"
         ↓ IA traduz automaticamente
🇺🇸 Mary vê: "Hello, how are you?"
🇯🇵 Yuki vê: "こんにちは、元気ですか？"
```

### Áudio traduzido

```
🇧🇷 João: 🎤 grava um áudio em português
         ↓ Whisper transcreve → GPT traduz
🇺🇸 Mary vê: "Hello, how are you?" + player de áudio original
🇯🇵 Yuki vê: "こんにちは、元気ですか？" + player de áudio original
```

## Features

- **15 idiomas** — PT, EN, ES, FR, DE, ZH, JA, AR, RU, HI, KO, IT, TR, PL, TH
- **Salas efêmeras** — somem quando todos saem (arquivos inclusos)
- **Nomes customizáveis** — crie salas como `viagem-europa` ou `team-standup`
- **Senha opcional** — proteja salas privadas
- **Tradução com cache** — LRU cache evita chamadas duplicadas à API
- **Indicador "traduzido de"** — clique para ver o texto original
- **Notificações** — som + browser notification quando a aba não está em foco
- **Reconexão automática** — banner de status se a conexão cair
- **Envio de imagens** — imagens inline no chat com preview
- **Envio de arquivos** — qualquer arquivo com card de download
- **Áudio transcrito** — grave áudio, Whisper transcreve, IA traduz, todos leem no seu idioma + player original
- **Drag & drop** — arraste arquivos direto na janela do chat
- **Zero persistência** — nada é salvo permanentemente

## Stack

| Camada | Tech |
|---|---|
| Backend | Node.js + Express + Socket.io + Multer |
| Tradução | OpenAI GPT-4.1 Nano |
| Transcrição | OpenAI Whisper |
| Frontend | Vanilla HTML/CSS/JS |
| Banco de dados | Nenhum (in-memory) |

## Setup

```bash
# Clone
git clone https://github.com/alijaouharifilho/babelchat.git
cd babelchat

# Instale as dependências
npm install

# Configure a chave da OpenAI
cp .env.example .env
# edite o .env com sua OPENAI_API_KEY

# Rode
npm start
```

Acesse `http://localhost:3000`

## Deploy com Docker

```bash
docker build -t babelchat .
docker run -d -p 3000:3000 --env-file .env babelchat
```

## Custo estimado

| Operação | Modelo | Custo |
|---|---|---|
| Tradução de texto | GPT-4.1 Nano | ~$0.00003 por mensagem |
| Transcrição de áudio | Whisper | $0.006 por minuto |

~**33.000 traduções de texto por dólar**.
Um áudio de 30s custa **$0.003**.

## Estrutura

```
babelchat/
├── server.js          # Express + Socket.io + uploads + broadcast
├── translator.js      # Tradução (Nano) + Transcrição (Whisper) + Cache LRU
├── public/
│   ├── index.html     # Landing page
│   ├── chat.html      # Chat (com media controls)
│   ├── style.css      # Dark theme + glassmorphism
│   ├── app.js         # Lógica da landing
│   └── chat.js        # Chat + upload + gravação de áudio
├── uploads/           # Arquivos temporários (limpos ao fechar sala)
├── Dockerfile
├── .env.example
└── package.json
```

## Roadmap

- [ ] Reações com emoji nas mensagens
- [ ] Preview de links (Open Graph)
- [ ] Salas permanentes (Redis)
- [ ] Deploy público com domínio
- [ ] PWA para mobile
- [ ] Rate limiting por IP
- [ ] Tradução de texto em imagens (OCR)

---

Feito com ☕ e IA.
