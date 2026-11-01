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

async function openaiRequest(path, body, timeout = 60000) {
  if (!env.openaiApiKey) throw new Error('LLM_PROVIDER=openai requires OPENAI_API_KEY');
  return request(`https://api.openai.com/v1/${path}`, body, { Authorization: `Bearer ${env.openaiApiKey}` }, timeout);
}

export async function generate(prompt, format) {
  if (env.llmProvider === 'openai') {
    const result = await openaiRequest('chat/completions', {
      model: env.openaiChatModel,
      messages: [{ role: 'user', content: prompt }],
      ...(format === 'json' ? { response_format: { type: 'json_object' } } : {})
    });
    return result.choices?.[0]?.message?.content || '';
  }
  if (env.llmProvider !== 'ollama') throw new Error(`Unsupported LLM_PROVIDER: ${env.llmProvider}`);
  const result = await request(`${env.ollamaUrl}/api/generate`, { model: env.ollamaChatModel, prompt, stream: false, ...(format ? { format } : {}) });
  return result.response || '';
}

export async function embed(text) {
  if (env.llmProvider === 'openai') {
    const result = await openaiRequest('embeddings', { model: env.openaiEmbedModel, input: text }, 30000);
    return result.data?.[0]?.embedding;
  }
  if (env.llmProvider !== 'ollama') throw new Error(`Unsupported LLM_PROVIDER: ${env.llmProvider}`);
  const result = await request(`${env.ollamaUrl}/api/embeddings`, { model: env.ollamaEmbedModel, prompt: text }, {}, 20000);
  return result.embedding;
}

export function getEmbeddingModelKey() {
  return env.llmProvider === 'openai' ? `openai:${env.openaiEmbedModel}` : `ollama:${env.ollamaEmbedModel}`;
}

export async function parseJson(prompt) {
  try { const raw = await generate(`${prompt}\nReturn only valid JSON.`, 'json'); return JSON.parse(raw); }
  catch { return null; }
}
