import { repository } from '../services/repository.js';
import { httpError } from '../utils/httpError.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const uploadRoot = fileURLToPath(new URL('../../uploads/', import.meta.url));

export async function listWorkspaces(req, res) { res.json({ workspaces: await repository.getAll('workspaces', { userId: req.user.id }, { updatedAt: -1 }) }); }
export async function createWorkspace(req, res) {
  const name = String(req.body.name || '').trim();
  if (!name) throw httpError(400, 'Workspace name is required');
  const workspace = await repository.create('workspaces', { userId: req.user.id, name, description: String(req.body.description || ''), color: req.body.color || '#6658d3' });
  res.status(201).json({ workspace });
}
export async function getWorkspace(req, res) {
  const workspace = await repository.getById('workspaces', req.params.id);
  if (!workspace || String(workspace.userId) !== req.user.id) throw httpError(404, 'Workspace not found');
  res.json({ workspace });
}
export async function updateWorkspace(req, res) {
  const current = await repository.getById('workspaces', req.params.id);
  if (!current || String(current.userId) !== req.user.id) throw httpError(404, 'Workspace not found');
  const updates = {};
  for (const key of ['name', 'description', 'color']) if (req.body[key] !== undefined) updates[key] = String(req.body[key]).trim();
  if (updates.name === '') throw httpError(400, 'Workspace name cannot be empty');
  res.json({ workspace: await repository.updateById('workspaces', req.params.id, updates) });
}
export async function deleteWorkspace(req, res) {
  const current = await repository.getById('workspaces', req.params.id);
  if (!current || String(current.userId) !== req.user.id) throw httpError(404, 'Workspace not found');
  await Promise.all(['workspaces', 'documents', 'document_chunks', 'chat_threads', 'chat_messages', 'workflow_runs'].map((collection) => collection === 'workspaces' ? repository.deleteById(collection, req.params.id) : repository.deleteWhere(collection, { workspaceId: req.params.id, userId: req.user.id })));
  await fs.rm(path.join(uploadRoot, req.user.id, String(current._id)), { recursive: true, force: true });
  res.json({ success: true });
}

export async function dashboard(req, res) {
  const [workspaces, documents, runs, recentRuns] = await Promise.all([
    repository.getAll('workspaces', { userId: req.user.id }), repository.getAll('documents', { userId: req.user.id }),
    repository.count('workflow_runs', { userId: req.user.id }), repository.getAll('workflow_runs', { userId: req.user.id }, { createdAt: -1 })
  ]);
  res.json({ stats: { workspaceCount: workspaces.length, documentCount: documents.length, runCount: runs, readyDocumentCount: documents.filter((doc) => doc.status === 'ready').length }, workspaces, recentRuns: recentRuns.slice(0, 6) });
}
