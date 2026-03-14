const OpenAI = require('openai');
const fs = require('fs');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const LANG_NAMES = {
  pt: 'Portuguese',
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  zh: 'Chinese (Simplified)',
  ja: 'Japanese',
  ar: 'Arabic',
  ru: 'Russian',
  hi: 'Hindi',
  ko: 'Korean',
  it: 'Italian',
  tr: 'Turkish',
  pl: 'Polish',
  th: 'Thai',
};

// ─── LRU Translation Cache ─────────────────────────────
const CACHE_MAX = 2000;
const CACHE_TTL = 30 * 60 * 1000; // 30 min
const cache = new Map();

function cacheKey(text, from, to) {
  return `${from}:${to}:${text}`;
}

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null; }
  cache.delete(key);
  cache.set(key, entry);
  return entry.val;
}

function cacheSet(key, val) {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
  cache.set(key, { val, ts: Date.now() });
}

// ─── Translate ──────────────────────────────────────────
async function translate(text, fromLang, toLang) {
  if (fromLang === toLang || !text?.trim()) return text;

  const key = cacheKey(text.trim(), fromLang, toLang);
  const cached = cacheGet(key);
  if (cached) return cached;

  const from = LANG_NAMES[fromLang] || fromLang;
  const to = LANG_NAMES[toLang] || toLang;

  try {
    const res = await client.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        {
          role: 'system',
          content: `Translate from ${from} to ${to}. Return only the translated text, preserving the original tone, style and emojis. No explanations or extra text.`,
        },
        { role: 'user', content: text.trim() },
      ],
      max_tokens: 1000,
      temperature: 0.2,
    });

    const translated = res.choices[0].message.content.trim();
    cacheSet(key, translated);
    return translated;
  } catch (err) {
    console.error(`Erro de tradução (${fromLang}→${toLang}):`, err.message);
    return text;
  }
}

// ─── Transcribe audio (Whisper) ─────────────────────────
async function transcribe(filePath) {
  try {
    const res = await client.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-1',
      response_format: 'json',
    });
    return res.text || null;
  } catch (err) {
    console.error('Erro de transcrição:', err.message);
    return null;
  }
}

// ─── Detect language from text (best effort) ────────────
async function detectLanguage(text) {
  try {
    const res = await client.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        {
          role: 'system',
          content: 'Detect the language of the text. Reply with ONLY the ISO 639-1 code (e.g. pt, en, es, fr, de, zh, ja, ar, ru, hi, ko, it, tr, pl, th). Nothing else.',
        },
        { role: 'user', content: text },
      ],
      max_tokens: 5,
      temperature: 0,
    });
    const code = res.choices[0].message.content.trim().toLowerCase();
    return LANG_NAMES[code] ? code : null;
  } catch {
    return null;
  }
}

module.exports = { translate, transcribe, detectLanguage, LANG_NAMES };
