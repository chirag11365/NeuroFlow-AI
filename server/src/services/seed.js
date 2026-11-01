import bcrypt from 'bcryptjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { repository } from './repository.js';

export async function seedDemoData(enabled) {
  const demoPassword = process.env.DEMO_USER_PASSWORD;
  if (!enabled || !demoPassword) return;
  let user = await repository.getOne('users', { email: 'demo@neuroflow.ai' });
  if (!user) user = await repository.create('users', { name: 'NeuroFlow Demo', email: 'demo@neuroflow.ai', password: await bcrypt.hash(demoPassword, 10), created_at: new Date() });
  let workspace = await repository.getOne('workspaces', { userId: String(user._id), name: 'Product Strategy' });
  if (!workspace) workspace = await repository.create('workspaces', { userId: String(user._id), name: 'Product Strategy', description: 'A demo space with sample product strategy notes and grounded workflow history.', color: '#6658d3' });
  const existing = await repository.getOne('documents', { userId: String(user._id), workspaceId: String(workspace._id), originalName: 'Product Strategy Notes.md' });
  if (existing) return;
  const sample = 'Product Strategy Notes\n\nThe product team will focus on improving onboarding completion. Recent interviews indicate that new users understand the core value but often pause when asked to connect their first data source.\n\nThe team agreed to simplify the setup checklist and add a short explanation beside each permission request. Research participants said that a visible progress indicator would make the process feel more manageable.\n\nNext steps: Maya will prepare revised onboarding copy by Friday. The design team should review the permission screens before the next planning session. Engineering will estimate the progress indicator work and share the estimate with the product lead.\n\nSuccess will be measured by setup completion rate, time to first successful connection, and support requests related to permissions. The team will compare these metrics for new cohorts after the changes are released.';
  const filePath = path.join(fileURLToPath(new URL('../../uploads/', import.meta.url)), String(user._id), String(workspace._id), 'Product Strategy Notes.md');
  await fs.mkdir(path.dirname(filePath), { recursive: true }); await fs.writeFile(filePath, sample, 'utf8');
  const doc = await repository.create('documents', { userId: String(user._id), workspaceId: String(workspace._id), originalName: 'Product Strategy Notes.md', storedName: 'Product Strategy Notes.md', filePath, mimeType: 'text/markdown', size: sample.length, fileType: 'md', status: 'ready', extractedText: sample, summary: 'The team is improving onboarding by simplifying setup, explaining permissions, and adding progress feedback. Success will be measured through completion, connection time, and support requests.', metadata: { keyPoints: ['Simplify the setup checklist and permission explanations.', 'Add visible progress feedback.', 'Measure setup completion, connection time, and permission support requests.'] } });
  await repository.create('document_chunks', { userId: String(user._id), workspaceId: String(workspace._id), documentId: String(doc._id), chunkIndex: 0, text: sample, tokenCountApprox: Math.ceil(sample.length / 4), embedding: [], metadata: {} });
  await repository.create('workflow_runs', { userId: String(user._id), workspaceId: String(workspace._id), type: 'summarize', status: 'completed', title: 'Onboarding improvement summary', input: { prompt: 'Summarize the strategy notes.' }, output: { summary: 'The team plans to improve onboarding by simplifying setup, clarifying permissions, and showing progress. It will track completion, connection time, and permission-related support requests.', keyPoints: ['Simplify onboarding setup.', 'Add progress feedback.', 'Measure user completion and support outcomes.'] }, citations: [{ documentId: String(doc._id), documentName: doc.originalName, chunkId: null, chunkIndex: 0, snippet: sample.slice(0, 300), score: 0 }], evaluation: { confidence: 0.75, note: 'Demo run seeded from the sample strategy notes.' }, trace: ['Planner', 'Retriever', 'Task', 'Writer', 'Evaluator'].map((stage) => ({ stage, status: 'completed', detail: 'Seeded demo workflow history.', timestamp: new Date().toISOString() })) });
}
