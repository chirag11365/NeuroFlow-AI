import { env } from '../config/env.js';

async function request(path, body, timeout = 45000) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(`${env.ollamaUrl}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal });
    if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
    return await response.json();
  } finally { clearTimeout(timer); }
}
export async function generate(prompt, format) {
  const result = await request('/api/generate', { model: env.ollamaChatModel, prompt, stream: false, ...(format ? { format } : {}) });
  return result.response || '';
}
export async function embed(text) {
  const result = await request('/api/embeddings', { model: env.ollamaEmbedModel, prompt: text }, 20000);
  return result.embedding;
}
export async function parseJson(prompt) {
  try { const raw = await generate(`${prompt}\nReturn only valid JSON.`, 'json'); return JSON.parse(raw); }
  catch { return null; }
}
