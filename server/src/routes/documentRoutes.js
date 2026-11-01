import { Router } from 'express';
import multer from 'multer';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { httpError } from '../utils/httpError.js';
import { repository } from '../services/repository.js';
import { supportedExtensions } from '../services/ingestion.js';
import * as documents from '../controllers/documentController.js';

const router = Router(); const uploadRoot = fileURLToPath(new URL('../../uploads/', import.meta.url));
const storage = multer.diskStorage({ destination: async (req, _file, callback) => { try { const dir = path.resolve(uploadRoot, req.user.id, req.params.workspaceId); if (!dir.startsWith(`${path.resolve(uploadRoot)}${path.sep}`)) return callback(httpError(400, 'Invalid workspace path')); await fs.mkdir(dir, { recursive: true }); callback(null, dir); } catch (error) { callback(error); } }, filename: (_req, file, callback) => callback(null, `${Date.now()}-${randomUUID()}${path.extname(file.originalname).toLowerCase()}`) });
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter: (_req, file, callback) => supportedExtensions.includes(path.extname(file.originalname).toLowerCase()) ? callback(null, true) : callback(httpError(415, 'Unsupported file type')) });
const validateUploadTarget = asyncHandler(async (req, _res, next) => {
  if (!/^(?:[a-f\d]{24}|[a-f\d-]{36})$/i.test(req.params.workspaceId)) throw httpError(404, 'Workspace not found');
  const workspace = await repository.getById('workspaces', req.params.workspaceId);
  if (!workspace || String(workspace.userId) !== String(req.user.id)) throw httpError(404, 'Workspace not found');
  next();
});
router.get('/workspaces/:workspaceId/documents', requireAuth, asyncHandler(documents.list));
router.post('/workspaces/:workspaceId/documents/upload', requireAuth, validateUploadTarget, (req, res, next) => upload.single('file')(req, res, (error) => { if (error?.code === 'LIMIT_FILE_SIZE') return next(httpError(413, 'Upload exceeds the 10 MB limit')); next(error); }), asyncHandler(documents.upload));
router.get('/documents/:id', requireAuth, asyncHandler(documents.get));
router.post('/documents/:id/reprocess', requireAuth, asyncHandler(documents.reprocess));
router.delete('/documents/:id', requireAuth, asyncHandler(documents.remove));
export default router;
