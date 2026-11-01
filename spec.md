**PROJECT NAME**

NeuroFlow AI - Agentic Document Intelligence Workspace


**PROJECT TYPE**

MERN + JavaScript + Agentic AI, workspace-based document intelligence system

**PRIMARY OBJECTIVE**

Build a MERN + JavaScript + Agentic AI application where a user can:

1. create workspaces
2. upload files into a workspace
3. process those files into searchable chunks
4. ask questions over uploaded documents
5. run AI workflows on those documents
6. view workflow outputs, citations, run history, and execution trace

IMPORTANT:
This is NOT a generic chatbot.

This IS:
- a workspace-based document intelligence system
- document ingestion + chunking + retrieval
- a 5-stage agentic pipeline
- grounded answers with citations
- free / local AI only
- offline / fallback capable


**IMPORTANT PROJECT STRUCTURE UPDATE**

THE PROJECT ROOT ALREADY CONTAINS:

- client/
- server/

DO NOT CREATE:
- frontend/
- backend/

USE THE EXISTING STRUCTURE ONLY.

**CORE CONSTRAINTS**

- Frontend inside client/ only
- Backend inside server/ only
- JavaScript only
- MERN stack
- Agentic AI workflow architecture
- free / local AI only
- no paid APIs required
- must work even if Ollama is unavailable
- must work even if MongoDB is unavailable
- must not rely on cloud vector DB
- must not rely on paid OCR
- must not use fake placeholder implementations

LOCAL / FREE AI RULE
--------------------
Use only local / free tools:
- Ollama
- chat model: llama3.1:8b
- embedding model: nomic-embed-text

OFFLINE / FALLBACK RULE
-----------------------
- If Ollama is down, workflows must still work with deterministic fallback logic.
- If MongoDB is not configured, the app must run using an in-memory repository.

**FINAL TECH STACK**

FRONTEND
---------
- React 18
- Vite
- TailwindCSS
- React Router
- TanStack React Query
- Zustand
- react-hook-form
- axios
- lucide-react

BACKEND
--------
- Node.js
- Express
- MongoDB + Mongoose
- multer
- pdf-parse
- mammoth
- csv-parse
- tesseract.js
- sharp
- bcryptjs
- jsonwebtoken
- dotenv
- node-cron

OPTIONAL QUEUE SUPPORT (only if configured)
-------------------------------------------
- BullMQ
- ioredis

AI STACK
---------
- Local Ollama inference
- chat model: llama3.1:8b
- embedding model: nomic-embed-text
- embeddings stored inside DocumentChunk.embedding (no separate vector DB)

====================================================================
RUNNING PORTS / RUNTIME DEFAULTS
====================================================================

Frontend (Vite): localhost:5173
Backend (Express): localhost:3001
MongoDB (optional): localhost:27017
Ollama (optional): localhost:11434

API base in client: VITE_API_BASE_URL or http://localhost:3001/api

====================================================================
FINAL PROJECT STRUCTURE
====================================================================

neuroflow-ai/
|
+-- client/
|   +-- src/
|       +-- api/
|       +-- components/
|       +-- pages/
|       +-- store/
|       +-- utils/
|       +-- main.jsx
|       +-- router.jsx
|       +-- index.css
|
+-- server/
|   +-- src/
|   |   +-- config/
|   |   +-- models/
|   |   +-- services/
|   |   +-- agents/
|   |   +-- controllers/
|   |   +-- routes/
|   |   +-- middleware/
|   |   +-- utils/
|   |   +-- jobs/
|   |   +-- data/
|   |   +-- app.js
|   |   +-- server.js
|   +-- scripts/
|   +-- uploads/
|   +-- logs/
|
+-- .env
+-- README.md

====================================================================
MANDATORY IMPLEMENTATION RULES
====================================================================

CLIENT FOLDER
--------------
The ENTIRE frontend MUST be implemented ONLY inside /client.
This includes pages, routes, UI components, workflow graph, Zustand store,
Tailwind setup, axios API calls, forms, auth UI, dashboard, workspace pages.

SERVER FOLDER
--------------
The ENTIRE backend MUST be implemented ONLY inside /server.
This includes Express server, APIs, agents, pipeline, retrieval, ingestion,
MongoDB integration, Mongoose models, auth, file uploads, fallback logic, logging.

STRICT RULES
------------
1. NEVER create additional frontend/backend root folders.
2. ALWAYS use /client and /server.
3. ALL frontend code MUST remain inside /client.
4. ALL backend code MUST remain inside /server.
5. Resume / uploaded files MUST be stored inside /server/uploads.
6. Mongoose models MUST exist inside /server/src/models.
7. All data access MUST go through the shared repository abstraction.

====================================================================
HOW THE SYSTEM WORKS
====================================================================

USER FLOW
---------
1. User registers / logs in
2. User creates a workspace
3. User uploads files into the workspace
4. System ingests files into searchable chunks
5. User runs one of 5 workflows or chats over the workspace
6. User reviews outputs, citations, run history, and execution trace

AI FLOW
-------
File Upload
      |
Text Extraction (pdf-parse / mammoth / read / csv-parse / tesseract)
      |
Cleaning + Summary
      |
Chunking (~1200 chars, ~200 overlap, paragraph-aware)
      |
Embeddings (nomic-embed-text, stored in chunk)
      |
Planner -> Retriever -> Task -> Writer -> Evaluator
      |
WorkflowRun saved (output + citations + evaluation + trace)

====================================================================
DATA MODELS
====================================================================

users: id, name, email, password, created_at
workspaces: id, userId, name, description, color
documents: id, userId, workspaceId, originalName, storedName, mimeType,
           size, fileType, status, extractedText, summary, pageCount,
           metadata, processingError
  fileType: pdf | docx | txt | md | csv | image
  status: uploaded | processing | ready | failed
document_chunks: id, userId, workspaceId, documentId, chunkIndex, text,
                 tokenCountApprox, embedding, metadata
chat_threads: id, userId, workspaceId, title
chat_messages: id, userId, workspaceId, threadId, role, content, citations[]
workflow_runs: id, userId, workspaceId, type, status, title, input, output,
               citations[], evaluation, trace[]
  type: ask | summarize | compare | meeting_action_items | research_brief
  status: queued | running | completed | failed

====================================================================
STORAGE ARCHITECTURE
====================================================================

Use ONE repository interface for all data access.

Repository modes:
- Mongo mode: used when MONGODB_URI exists and connects
- Memory mode: used when MONGODB_URI is missing or Mongo connection fails

Repository operations (generic async):
getAll(collection, filter, sort)
getById(collection, id)
getOne(collection, filter)
create(collection, data)
updateById(collection, id, updates)
upsert(collection, filter, createData, updateData)
deleteById(collection, id)
deleteWhere(collection, filter)
count(collection, filter)

All controllers/services MUST use this repository layer.

====================================================================
CHUNKING + RETRIEVAL
====================================================================

CHUNKING
--------
- target size: ~1200 chars
- overlap: ~200 chars
- paragraph-aware where possible
- store: chunk index, text, token count approx, metadata

RETRIEVAL
---------
- load ready chunks for the workspace
- optionally restrict to selected document ids
- if embeddings exist: embed query, score similarity (cosine), take top chunks
- if embeddings do not exist: keyword overlap retrieval
- top K: 5
- return chunks with document id, document name, snippet, score

====================================================================
AI AGENT SYSTEM (5 STAGES)
====================================================================

PLANNER  - decide task + retrieval query + selected docs; produce plan object
RETRIEVER- fetch relevant chunks; optionally restrict to selected docs
TASK     - answer / summarize / compare / action items / research brief
WRITER   - convert raw task output into exact UI JSON shape
EVALUATOR- produce short evaluation note + confidence level

All stages call Ollama and MUST return safe fallback values on failure.

====================================================================
WORKFLOW ENGINE
====================================================================

Every workflow runs through the same pipeline:

Planner -> Retriever -> Task -> Writer -> Evaluator -> Save Run

Each run stores: input, output, citations, evaluation, trace, status.
Pipeline: create run queued -> running -> stages -> save citations ->
save trace -> completed or failed.

====================================================================
REQUIRED WORKFLOWS (5)
====================================================================

1. ASK WORKSPACE
   input: question, optional threadId
   output: { "answer": "..." }
   extra: create/reuse thread, save user + assistant messages,
          assistant message stores citations

2. SUMMARIZE WORKSPACE
   input: optional prompt
   output: { "summary": "...", "keyPoints": ["...", "..."] }

3. COMPARE DOCUMENTS
   input: documentIds[], optional prompt   (at least 2 docs)
   output: { "overview": "...", "similarities": ["..."],
             "differences": ["..."],
             "documentTakeaways": [{ "documentId": "", "documentName": "", "takeaway": "" }] }

4. MEETING NOTES -> ACTION ITEMS
   input: optional documentIds[], optional prompt
   output: { "summary": "...",
             "actionItems": [{ "task": "", "owner": "", "priority": "", "dueNote": "" }] }

5. RESEARCH BRIEF
   input: optional topic, optional prompt
   output: { "title": "", "executiveSummary": "",
             "themes": [{ "heading": "", "details": ["...", "..."] }],
             "conclusion": "" }

====================================================================
FALLBACK LOGIC WHEN OLLAMA IS UNAVAILABLE
====================================================================

- Ask: build grounded answer from top retrieved chunks
- Summary: top important sentences -> summary + key points
- Compare: chunk text + keyword overlap -> overview/similarities/differences/takeaways
- Action items: extract TODO / imperative / action-oriented lines
- Research brief: structured brief from chunk summaries grouped into themes

The app MUST NOT stop functioning just because Ollama is down.

====================================================================
DOCUMENT INGESTION
====================================================================

Supported: PDF, DOCX, TXT, MD, CSV, PNG/JPG/JPEG/WEBP

Upload flow:
save file on disk -> create Document (uploaded) -> set processing ->
extract text -> clean text -> if extraction fails or text too small -> failed ->
create short summary -> chunk text -> create embeddings if possible ->
save chunks -> mark ready

Extraction by type:
PDF -> pdf-parse
DOCX -> mammoth
TXT / MD -> direct read
CSV -> rows into readable text blocks
Image -> tesseract.js OCR (sharp pre-process if helpful)

File storage path: server/uploads/{userId}/{workspaceId}/

====================================================================
API ENDPOINTS
====================================================================

HEALTH
GET /api/health

AUTH
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me

WORKSPACES
GET    /api/workspaces
POST   /api/workspaces
GET    /api/workspaces/:id
PATCH  /api/workspaces/:id
DELETE /api/workspaces/:id

DOCUMENTS
GET    /api/workspaces/:workspaceId/documents
POST   /api/workspaces/:workspaceId/documents/upload
GET    /api/documents/:id
POST   /api/documents/:id/reprocess
DELETE /api/documents/:id

CHAT
GET  /api/workspaces/:workspaceId/chat
GET  /api/workspaces/:workspaceId/chat/:threadId/messages
POST /api/workspaces/:workspaceId/chat

RUNS / WORKFLOWS
GET  /api/workspaces/:workspaceId/runs
GET  /api/runs/:id
POST /api/workspaces/:workspaceId/runs/summarize
POST /api/workspaces/:workspaceId/runs/compare
POST /api/workspaces/:workspaceId/runs/meeting-action-items
POST /api/workspaces/:workspaceId/runs/research-brief

DASHBOARD
GET /api/dashboard

====================================================================
WORKFLOW GRAPH
====================================================================

Show 5 stages: Planner, Retriever, Task, Writer, Evaluator.

Activation rules:
- Planner active if workspace exists
- Retriever active if workspace has at least one ready document
- Task active if at least one workflow run exists
- Writer active if at least one completed run has output
- Evaluator active if at least one completed run has evaluation

Do NOT light up all nodes for an empty workspace.

====================================================================
FRONTEND PAGES
====================================================================

PUBLIC
/login
/register

PROTECTED
/                          (dashboard)
/workspaces                (workspaces list)
/workspaces/:workspaceId   (workspace details - most important page)
/runs/:runId               (run details)

WORKSPACE DETAILS PAGE MUST CONTAIN
- workspace header
- workspace stats
- upload section
- document list
- workflow actions section
- chat panel
- recent runs section
- citations in outputs where relevant

====================================================================
API CLIENT + STATE
====================================================================

- one axios instance: base URL from env, bearer token injection, logout on 401
- Zustand auth store: token, user; actions setSession, logout (persisted)
- React Query shared keys: auth user, dashboard, workspaces, workspace details,
  workspace documents, workspace chat, workspace runs, run details
- invalidate queries after create/update/delete/upload/workflow actions

====================================================================
SECURITY REQUIREMENTS
====================================================================

- JWT auth, bearer token verification
- bcryptjs password hashing
- email unique, password min length 6, invalid login returns 401
- multer file validation (type + 10MB limit)
- every resource user-scoped, no cross-user data leakage
- errors returned as { "message": "..." }

====================================================================
ERROR HANDLING RULES
====================================================================

- centralized error middleware
- async route wrapper
- httpError(status, message) helper
- handle: invalid login, invalid token, unsupported file type, upload too large,
  missing workspace/document/run, unauthorized access, failed document processing

====================================================================
SEED / DEMO MODE
====================================================================

Demo user:
email: demo@neuroflow.ai
password: [configure demo password via DEMO_USER_PASSWORD]

Provide demo workspaces, demo documents, and demo runs.
- memory mode: seed demo user, optionally sample workspaces/docs if configured
- mongo mode: seed demo data if configured

====================================================================
ENV CONFIG
====================================================================

PORT
CLIENT_URL
MONGODB_URI
JWT_SECRET
JWT_EXPIRES_IN
OLLAMA_BASE_URL
OLLAMA_CHAT_MODEL
OLLAMA_EMBED_MODEL
UPSTASH_REDIS_URL
SEED_SAMPLE_DATA

If Mongo connection fails, fall back to memory mode instead of crashing.

====================================================================
IMPLEMENTATION RULES FOR CODEX
====================================================================

1. USE JavaScript ONLY. DO NOT use TypeScript anywhere.
2. USE Express backend ONLY.
3. USE MongoDB + Mongoose, with in-memory fallback.
4. NEVER create NestJS structure or Prisma schema.
5. USE modular Express architecture.
6. ALL frontend code MUST remain inside /client.
7. ALL backend code MUST remain inside /server.
8. ALL data access MUST go through the repository abstraction.
9. Embeddings stored in DocumentChunk.embedding; NO separate vector DB.
10. Background queues/cron are OPTIONAL; core must work without them.
11. Keep workflow outputs structured to the defined JSON shapes.
12. Do not block the whole app if one document fails.
13. Keep controllers thin; logic lives in services and agents.
14. App MUST work without Ollama (deterministic fallback).
15. App MUST work without MongoDB (memory mode).
16. Every protected resource MUST be user-scoped.
17. Uploads MUST automatically trigger ingestion.
18. ALL agent outputs MUST be JSON serializable.
19. ALL workflow runs MUST be trackable (status + trace).

====================================================================
SUCCESS CRITERIA / ACCEPTANCE
====================================================================

PROJECT IS SUCCESSFUL IF:
- user can register, login, stay authenticated
- user can create/list/update/delete workspaces
- user can upload supported files into a workspace
- uploaded files are processed into extracted text + chunks
- documents can be reprocessed and deleted
- ask workflow works and stores chat messages with citations
- summarize workflow works
- compare workflow works for 2+ docs
- meeting action items workflow works
- research brief workflow works
- each workflow creates a WorkflowRun
- run details page shows input, output, citations, evaluation, trace
- dashboard shows counts and recent activity
- workflow graph reflects actual workspace state
- app still works when Ollama is unavailable
- app still works when MongoDB is unavailable

====================================================================
FINAL END-TO-END FLOW
====================================================================

Register / Login
      |
Create Workspace
      |
Upload File
      |
Ingestion (extract -> clean -> summary -> chunk -> embed -> ready)
      |
Run Workflow (ask / summarize / compare / action items / research brief)
      |
Planner -> Retriever -> Task -> Writer -> Evaluator
      |
WorkflowRun saved (output + citations + evaluation + trace)
      |
View on dashboard, run history, run details, workflow graph

====================================================================
END OF FINAL IMPLEMENTATION SPEC
====================================================================
