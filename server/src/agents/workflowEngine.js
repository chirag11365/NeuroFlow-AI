import { repository } from '../services/repository.js';
import { retrieve } from '../services/retrieval.js';
import { parseJson } from '../services/ollama.js';

const workflowTypes = new Set(['ask', 'summarize', 'compare', 'meeting_action_items', 'research_brief']);
const sentences = (text) => String(text || '').split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 28);
const contextText = (citations) => citations.map((c) => `[${c.documentName}, chunk ${c.chunkIndex + 1}] ${c.text}`).join('\n\n');

function fallbackOutput(type, input, citations) {
  const text = citations.map((c) => c.text).join('\n'); const keyPoints = [...new Set(sentences(text))].slice(0, 6);
  if (type === 'ask') return { answer: citations.length ? `Based on the uploaded documents: ${keyPoints.slice(0, 3).join(' ') || text.slice(0, 900)}` : 'I could not find relevant passages in the ready documents for this question.' };
  if (type === 'summarize') return { summary: keyPoints.slice(0, 4).join(' ') || text.slice(0, 1000) || 'No ready documents were available to summarize.', keyPoints: keyPoints.slice(0, 5) };
  if (type === 'compare') {
    const byDoc = new Map(); for (const citation of citations) { if (!byDoc.has(citation.documentId)) byDoc.set(citation.documentId, { documentId: citation.documentId, documentName: citation.documentName, text: [] }); byDoc.get(citation.documentId).text.push(citation.text); }
    const docs = [...byDoc.values()]; const words = (s) => new Set((s.toLowerCase().match(/[a-z]{4,}/g) || []).filter((w) => !['that','this','with','from','have','will','their','about','which'].includes(w)));
    const left = words(docs[0]?.text.join(' ') || ''); const right = words(docs[1]?.text.join(' ') || ''); const shared = [...left].filter((w) => right.has(w)).slice(0, 8);
    const uniqueA = [...left].filter((w) => !right.has(w)).slice(0, 5); const uniqueB = [...right].filter((w) => !left.has(w)).slice(0, 5);
    return { overview: `Compared ${docs.length} documents${docs.length ? `: ${docs.map((d) => d.documentName).join(' and ')}` : ''}. This fallback identifies shared and document-specific terms from the retrieved passages.`, similarities: shared.length ? [`Both documents discuss: ${shared.join(', ')}.`] : ['No clear shared themes were identified in the retrieved passages.'], differences: [uniqueA.length ? `${docs[0]?.documentName || 'First document'} emphasizes: ${uniqueA.join(', ')}.` : '', uniqueB.length ? `${docs[1]?.documentName || 'Second document'} emphasizes: ${uniqueB.join(', ')}.` : ''].filter(Boolean), documentTakeaways: docs.map((d) => ({ documentId: d.documentId, documentName: d.documentName, takeaway: sentences(d.text.join(' '))[0] || d.text.join(' ').slice(0, 240) })) };
  }
  if (type === 'meeting_action_items') {
    const lines = text.split(/[\n.!?]+/).map((s) => s.trim()).filter((s) => /\b(todo|action|follow up|send|review|prepare|schedule|complete|confirm|assign|deliver|create|update|contact|share|check|ensure|need to|should)\b/i.test(s));
    return { summary: keyPoints.slice(0, 3).join(' ') || text.slice(0, 500), actionItems: lines.slice(0, 12).map((task) => ({ task, owner: 'Unassigned', priority: 'Medium', dueNote: 'Not specified' })) };
  }
  return { title: input.topic || 'Research brief', executiveSummary: keyPoints.slice(0, 3).join(' ') || text.slice(0, 500) || 'No ready documents were available.', themes: (keyPoints.length ? keyPoints : ['No themes identified in the available documents.']).slice(0, 4).map((item, index) => ({ heading: `Theme ${index + 1}`, details: [item] })), conclusion: keyPoints.slice(-1)[0] || 'Review the cited source passages for the available evidence.' };
}

function outputSchema(type) {
  return {
    ask: '{"answer":"..."}', summarize: '{"summary":"...","keyPoints":["..."]}',
    compare: '{"overview":"...","similarities":["..."],"differences":["..."],"documentTakeaways":[{"documentId":"...","documentName":"...","takeaway":"..."}]}',
    meeting_action_items: '{"summary":"...","actionItems":[{"task":"...","owner":"...","priority":"...","dueNote":"..."}]}',
    research_brief: '{"title":"...","executiveSummary":"...","themes":[{"heading":"...","details":["..."]}],"conclusion":"..."}'
  }[type];
}

async function generateOutput(type, input, citations, fallback) {
  if (!citations.length) return fallback;
  const ask = type === 'ask' ? input.question : type === 'summarize' ? input.prompt || 'Summarize the workspace documents.' : type === 'compare' ? input.prompt || 'Compare these documents.' : type === 'meeting_action_items' ? input.prompt || 'Extract meeting action items.' : `Prepare a research brief about ${input.topic || input.prompt || 'the source documents'}.`;
  const parsed = await parseJson(`You are an evidence-grounded document assistant. Use only the source passages below. Do not invent facts. Return the requested JSON shape exactly.\nTask: ${ask}\nRequired shape: ${outputSchema(type)}\nSources:\n${contextText(citations)}`);
  if (!parsed || typeof parsed !== 'object') return fallback;
  if (type === 'ask' && typeof parsed.answer === 'string') return { answer: parsed.answer };
  if (type === 'summarize' && typeof parsed.summary === 'string' && Array.isArray(parsed.keyPoints)) return { summary: parsed.summary, keyPoints: parsed.keyPoints.map(String) };
  if (type === 'compare' && typeof parsed.overview === 'string') return { overview: parsed.overview, similarities: Array.isArray(parsed.similarities) ? parsed.similarities.map(String) : [], differences: Array.isArray(parsed.differences) ? parsed.differences.map(String) : [], documentTakeaways: Array.isArray(parsed.documentTakeaways) ? parsed.documentTakeaways : [] };
  if (type === 'meeting_action_items' && typeof parsed.summary === 'string') return { summary: parsed.summary, actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems.map((item) => ({ task: String(item.task || ''), owner: String(item.owner || 'Unassigned'), priority: String(item.priority || 'Medium'), dueNote: String(item.dueNote || 'Not specified') })) : [] };
  if (type === 'research_brief' && typeof parsed.title === 'string') return { title: parsed.title, executiveSummary: String(parsed.executiveSummary || ''), themes: Array.isArray(parsed.themes) ? parsed.themes : [], conclusion: String(parsed.conclusion || '') };
  return fallback;
}

export async function runWorkflow({ userId, workspaceId, type, input = {}, threadId }) {
  if (!workflowTypes.has(type)) throw Object.assign(new Error('Unsupported workflow type'), { status: 400 });
  const workspace = await repository.getById('workspaces', workspaceId);
  if (!workspace || String(workspace.userId) !== String(userId)) throw Object.assign(new Error('Workspace not found'), { status: 404 });
  if (type === 'compare') {
    const readyDocs = await repository.getAll('documents', { userId, workspaceId, status: 'ready' });
    const selectedReady = readyDocs.filter((doc) => (input.documentIds || []).map(String).includes(String(doc._id)));
    if (selectedReady.length < 2) throw Object.assign(new Error('Select at least two ready documents to compare'), { status: 400 });
  }
  const run = await repository.create('workflow_runs', { userId, workspaceId, type, status: 'queued', title: input.question || input.topic || type.replaceAll('_', ' '), input, output: null, citations: [], evaluation: null, trace: [] });
  const trace = [];
  const stage = async (name, detail, status = 'completed') => { trace.push({ stage: name, status, detail, timestamp: new Date().toISOString() }); await repository.updateById('workflow_runs', run._id, { trace: [...trace] }); };
  try {
    await repository.updateById('workflow_runs', run._id, { status: 'running' });
    const plannerFallback = { task: type, retrievalQuery: type === 'ask' ? input.question : input.topic || input.prompt || type.replaceAll('_', ' '), documentIds: input.documentIds || [] };
    const proposedPlan = await parseJson(`Create a concise retrieval plan for a document workflow. Return JSON with task, retrievalQuery, and documentIds. Only use supplied document IDs.\nType: ${type}\nInput: ${JSON.stringify(input)}\nAvailable document IDs: ${JSON.stringify(input.documentIds || [])}`);
    const plan = proposedPlan && typeof proposedPlan.retrievalQuery === 'string' ? { ...plannerFallback, ...proposedPlan, documentIds: input.documentIds || [] } : plannerFallback;
    await stage('Planner', `Plan: ${plan.task || type}; retrieval query: ${plan.retrievalQuery || '(workspace overview)'}.`);
    await stage('Retriever', 'Searching ready document chunks with embedding similarity and keyword fallback.');
    let citations;
    if (type === 'compare') {
      const perDocument = await Promise.all(plan.documentIds.map((id) => retrieve({ userId, workspaceId, query: plan.retrievalQuery, documentIds: [id], topK: 3 })));
      citations = perDocument.flat().slice(0, 10);
    } else citations = await retrieve({ userId, workspaceId, query: plan.retrievalQuery, documentIds: plan.documentIds, topK: 5 });
    await stage('Task', `Analyzed ${citations.length} retrieved source passages.`);
    const fallback = fallbackOutput(type, input, citations);
    const output = await generateOutput(type, input, citations, fallback);
    await stage('Writer', 'Structured the result to match the workflow response shape.');
    const confidence = citations.length ? Math.min(0.95, 0.45 + citations.reduce((sum, c) => sum + c.score, 0) / citations.length * 0.5) : 0.2;
    const evaluation = { confidence: Number(confidence.toFixed(2)), note: citations.length ? `Answer uses ${citations.length} retrieved passage(s). Review the citations to verify the supporting context.` : 'No ready source passages matched this request; the response uses the deterministic empty-context fallback.' };
    await stage('Evaluator', evaluation.note);
    const complete = await repository.updateById('workflow_runs', run._id, { status: 'completed', output, citations: citations.map(({ text, ...citation }) => citation), evaluation, trace });
    return { run: complete, citations };
  } catch (error) {
    trace.push({ stage: 'Pipeline', status: 'failed', detail: error.message, timestamp: new Date().toISOString() });
    await repository.updateById('workflow_runs', run._id, { status: 'failed', trace });
    throw error;
  }
}
