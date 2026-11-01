import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as workflows from '../controllers/workflowController.js';

const router = Router();
router.get('/workspaces/:workspaceId/runs', requireAuth, asyncHandler(workflows.listRuns));
router.get('/runs/:id', requireAuth, asyncHandler(workflows.getRun));
router.post('/workspaces/:workspaceId/chat', requireAuth, asyncHandler(workflows.chat));
router.get('/workspaces/:workspaceId/chat', requireAuth, asyncHandler(workflows.listThreads));
router.get('/workspaces/:workspaceId/chat/:threadId/messages', requireAuth, asyncHandler(workflows.messages));
for (const type of ['summarize', 'compare', 'meeting_action_items', 'research_brief']) router.post(`/workspaces/:workspaceId/runs/${type.replaceAll('_', '-')}`, requireAuth, asyncHandler((req, res) => { req.params.type = type; return workflows.execute(req, res); }));
export default router;
