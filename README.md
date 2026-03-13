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

## Features

- **15 idiomas** — PT, EN, ES, FR, DE, ZH, JA, AR, RU, HI, KO, IT, TR, PL, TH
- **Salas efêmeras** — somem quando todos saem
- **Nomes customizáveis** — crie salas como `viagem-europa` ou `team-standup`
- **Senha opcional** — proteja salas privadas
- **Tradução com cache** — LRU cache evita chamadas duplicadas à API
- **Indicador "traduzido de"** — clique para ver o texto original
- **Notificações** — som + browser notification quando a aba não está em foco
- **Reconexão automática** — banner de status se a conexão cair
- **Zero persistência** — nada é salvo, nada é logado

## Stack

| Camada | Tech |
|---|---|
| Backend | Node.js + Express + Socket.io |
| Tradução | OpenAI GPT-4.1 Nano |
| Frontend | Vanilla HTML/CSS/JS |
| Banco de dados | Nenhum (in-memory) |

## Setup

```bash
# Clone
git clone https://github.com/alifilhomormaii/babelchat.git
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

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
docker build -t babelchat .
docker run -d -p 3000:3000 --env-file .env babelchat
```

## Custo estimado

GPT-4.1 Nano custa **$0.10/1M tokens input** e **$0.40/1M tokens output**.

Uma mensagem de chat (~50 palavras) traduzida custa ~**$0.00003**.
Isso dá ~**33.000 traduções por dólar**.

## Estrutura

```
babelchat/
├── server.js          # Express + Socket.io + lógica das salas
├── translator.js      # OpenAI wrapper + LRU cache
├── public/
│   ├── index.html     # Landing page
│   ├── chat.html      # Chat
│   ├── style.css      # Dark theme
│   ├── app.js         # Lógica da landing
│   └── chat.js        # Lógica do chat
├── .env.example
└── package.json
```

## Roadmap

- [ ] Reações com emoji nas mensagens
- [ ] Suporte a imagens/links com preview
- [ ] Salas permanentes (Redis)
- [ ] Deploy público com domínio
- [ ] PWA para mobile
- [ ] Rate limiting por IP

---

Feito com ☕ e IA.
