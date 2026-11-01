import { repository } from './repository.js';
import { embed } from './ollama.js';

const terms = (text) => String(text || '').toLowerCase().match(/[a-z0-9]{3,}/g) || [];
function cosine(a, b) { let dot = 0; let aa = 0; let bb = 0; for (let i = 0; i < Math.min(a.length, b.length); i += 1) { dot += a[i] * b[i]; aa += a[i] ** 2; bb += b[i] ** 2; } return dot / (Math.sqrt(aa * bb) || 1); }

export async function retrieve({ userId, workspaceId, query, documentIds = [], topK = 5 }) {
  const docs = await repository.getAll('documents', { userId, workspaceId, status: 'ready' });
  const eligible = documentIds.length ? docs.filter((doc) => documentIds.map(String).includes(String(doc._id))) : docs;
  if (!eligible.length) return [];
  const allowed = new Set(eligible.map((doc) => String(doc._id)));
  const chunks = await repository.getAll('document_chunks', { userId, workspaceId });
  const selected = chunks.filter((chunk) => allowed.has(String(chunk.documentId)));
  if (!selected.length) return [];
  let queryVector = null;
  if (selected.some((chunk) => chunk.embedding?.length)) try { queryVector = await embed(query); } catch { /* fallback to term overlap */ }
  const queryTerms = new Set(terms(query)); const docMap = new Map(eligible.map((doc) => [String(doc._id), doc]));
  return selected.map((chunk) => {
    const overlap = terms(chunk.text).filter((term) => queryTerms.has(term)).length / Math.max(queryTerms.size, 1);
    const similarity = queryVector && chunk.embedding?.length ? cosine(queryVector, chunk.embedding) : overlap;
    return { ...chunk, score: similarity, documentName: docMap.get(String(chunk.documentId))?.originalName || 'Document' };
  }).sort((a, b) => b.score - a.score).slice(0, topK).map((chunk) => ({ documentId: String(chunk.documentId), documentName: chunk.documentName, chunkId: String(chunk._id), chunkIndex: chunk.chunkIndex, snippet: chunk.text.slice(0, 500), text: chunk.text, score: Number(chunk.score.toFixed(4)) }));
}
