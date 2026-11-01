import { repository } from '../services/repository.js';
import { runWorkflow } from '../agents/workflowEngine.js';
import { httpError } from '../utils/httpError.js';

export async function listRuns(req, res) { res.json({ runs: await repository.getAll('workflow_runs', { userId: req.user.id, workspaceId: req.params.workspaceId }, { createdAt: -1 }) }); }
export async function getRun(req, res) {
  const run = await repository.getById('workflow_runs', req.params.id);
  if (!run || String(run.userId) !== String(req.user.id)) throw httpError(404, 'Run not found');
  res.json({ run });
}
export async function execute(req, res) {
  const type = req.params.type;
  if (type === 'compare' && (!Array.isArray(req.body.documentIds) || req.body.documentIds.length < 2)) throw httpError(400, 'Select at least two documents to compare');
  const { run } = await runWorkflow({ userId: req.user.id, workspaceId: req.params.workspaceId, type, input: req.body, threadId: req.body.threadId });
  res.status(201).json({ run });
}
export async function chat(req, res) {
  const question = String(req.body.question || '').trim(); if (!question) throw httpError(400, 'Question is required');
  const workspace = await repository.getById('workspaces', req.params.workspaceId);
  if (!workspace || String(workspace.userId) !== String(req.user.id)) throw httpError(404, 'Workspace not found');
  let thread = req.body.threadId ? await repository.getById('chat_threads', req.body.threadId) : null;
  if (thread && (String(thread.userId) !== String(req.user.id) || String(thread.workspaceId) !== String(workspace._id))) throw httpError(404, 'Chat thread not found');
  if (!thread) thread = await repository.create('chat_threads', { userId: req.user.id, workspaceId: String(workspace._id), title: question.slice(0, 72) });
  const userMessage = await repository.create('chat_messages', { userId: req.user.id, workspaceId: String(workspace._id), threadId: String(thread._id), role: 'user', content: question, citations: [] });
  const { run, citations } = await runWorkflow({ userId: req.user.id, workspaceId: String(workspace._id), type: 'ask', input: { question }, threadId: String(thread._id) });
  const assistantMessage = await repository.create('chat_messages', { userId: req.user.id, workspaceId: String(workspace._id), threadId: String(thread._id), role: 'assistant', content: run.output.answer, citations: run.citations });
  res.status(201).json({ thread, userMessage, assistantMessage, run, citations: run.citations });
}
export async function listThreads(req, res) {
  const workspace = await repository.getById('workspaces', req.params.workspaceId);
  if (!workspace || String(workspace.userId) !== String(req.user.id)) throw httpError(404, 'Workspace not found');
  res.json({ threads: await repository.getAll('chat_threads', { userId: req.user.id, workspaceId: req.params.workspaceId }, { updatedAt: -1 }) });
}
export async function messages(req, res) {
  const thread = await repository.getById('chat_threads', req.params.threadId);
  if (!thread || String(thread.userId) !== String(req.user.id) || String(thread.workspaceId) !== String(req.params.workspaceId)) throw httpError(404, 'Chat thread not found');
  res.json({ messages: await repository.getAll('chat_messages', { userId: req.user.id, threadId: req.params.threadId }, { createdAt: 1 }) });
}
