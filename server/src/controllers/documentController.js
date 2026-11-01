import fs from 'node:fs/promises';
import { repository } from '../services/repository.js';
import { handleUploadedFile, processDocument } from '../services/ingestion.js';
import { httpError } from '../utils/httpError.js';

async function ownedWorkspace(workspaceId, userId) {
  const workspace = await repository.getById('workspaces', workspaceId);
  if (!workspace || String(workspace.userId) !== String(userId)) throw httpError(404, 'Workspace not found');
  return workspace;
}
async function ownedDocument(id, userId) {
  const doc = await repository.getById('documents', id);
  if (!doc || String(doc.userId) !== String(userId)) throw httpError(404, 'Document not found');
  return doc;
}
export async function list(req, res) {
  await ownedWorkspace(req.params.workspaceId, req.user.id);
  res.json({ documents: await repository.getAll('documents', { userId: req.user.id, workspaceId: req.params.workspaceId }, { createdAt: -1 }) });
}
export async function upload(req, res) {
  await ownedWorkspace(req.params.workspaceId, req.user.id);
  if (!req.file) throw httpError(400, 'Choose a supported file to upload');
  const document = await handleUploadedFile(req.file, req.user.id, req.params.workspaceId);
  res.status(201).json({ document });
}
export async function get(req, res) { res.json({ document: await ownedDocument(req.params.id, req.user.id) }); }
export async function reprocess(req, res) { const doc = await ownedDocument(req.params.id, req.user.id); res.json({ document: await processDocument(doc) }); }
export async function remove(req, res) {
  const doc = await ownedDocument(req.params.id, req.user.id);
  await repository.deleteWhere('document_chunks', { userId: req.user.id, documentId: String(doc._id) });
  await repository.deleteById('documents', req.params.id);
  if (doc.filePath) await fs.unlink(doc.filePath).catch(() => {});
  res.json({ success: true });
}
