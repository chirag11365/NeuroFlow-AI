import { env } from '../config/env.js';

async function request(url, body, headers = {}, timeout = 45000) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body), signal: controller.signal });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`AI provider returned ${response.status}${detail ? `: ${detail.slice(0, 300)}` : ''}`);
    }
    return await response.json();
  } finally { clearTimeout(timer); }
}

async function geminiRequest(model, method, body, timeout = 60000) {
  if (!env.geminiApiKey) throw new Error('LLM_PROVIDER=gemini requires GEMINI_API_KEY');
  const safeModel = encodeURIComponent(model);
  return request(`https://generativelanguage.googleapis.com/v1beta/models/${safeModel}:${method}`, body, { 'x-goog-api-key': env.geminiApiKey }, timeout);
}

export async function generate(prompt, format) {
  if (env.llmProvider === 'gemini') {
    const result = await geminiRequest(env.geminiChatModel, 'generateContent', {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      ...(format === 'json' ? { generationConfig: { responseMimeType: 'application/json' } } : {})
    });
    return result.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '';
  }
  if (env.llmProvider !== 'ollama') throw new Error(`Unsupported LLM_PROVIDER: ${env.llmProvider}`);
  const result = await request(`${env.ollamaUrl}/api/generate`, { model: env.ollamaChatModel, prompt, stream: false, ...(format ? { format } : {}) });
  return result.response || '';
}

export async function embed(text) {
  if (env.llmProvider === 'gemini') {
    const result = await geminiRequest(env.geminiEmbedModel, 'embedContent', {
      content: { parts: [{ text }] },
      output_dimensionality: 768
    }, 30000);
    return result.embedding?.values || result.embeddings?.[0]?.values || [];
  }
  if (env.llmProvider !== 'ollama') throw new Error(`Unsupported LLM_PROVIDER: ${env.llmProvider}`);
  const result = await request(`${env.ollamaUrl}/api/embeddings`, { model: env.ollamaEmbedModel, prompt: text }, {}, 20000);
  return result.embedding || [];
}

export function getEmbeddingModelKey() {
  return env.llmProvider === 'gemini' ? `gemini:${env.geminiEmbedModel}:768` : `ollama:${env.ollamaEmbedModel}`;
}

export async function parseJson(prompt) {
  try { const raw = await generate(`${prompt}\nReturn only valid JSON.`, 'json'); return JSON.parse(raw); }
  catch { return null; }
}
