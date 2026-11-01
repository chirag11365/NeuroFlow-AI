import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import * as auth from '../controllers/authController.js';
import * as workspaces from '../controllers/workspaceController.js';
import { repository } from '../services/repository.js';

const router = Router();
router.get('/health', (_req, res) => res.json({ status: 'ok', repository: repository.mode }));
router.post('/auth/register', asyncHandler(auth.register));
router.post('/auth/login', asyncHandler(auth.login));
router.get('/auth/me', requireAuth, asyncHandler(auth.me));
router.get('/workspaces', requireAuth, asyncHandler(workspaces.listWorkspaces));
router.post('/workspaces', requireAuth, asyncHandler(workspaces.createWorkspace));
router.get('/workspaces/:id', requireAuth, asyncHandler(workspaces.getWorkspace));
router.patch('/workspaces/:id', requireAuth, asyncHandler(workspaces.updateWorkspace));
router.delete('/workspaces/:id', requireAuth, asyncHandler(workspaces.deleteWorkspace));
router.get('/dashboard', requireAuth, asyncHandler(workspaces.dashboard));
export default router;
