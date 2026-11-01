import mongoose from 'mongoose';

const schemas = {
  users: new mongoose.Schema({ name: String, email: { type: String, unique: true }, password: String, created_at: Date }, { strict: false }),
  workspaces: new mongoose.Schema({ userId: String, name: String, description: String, color: String }, { strict: false, timestamps: true }),
  documents: new mongoose.Schema({ userId: String, workspaceId: String, originalName: String, status: String }, { strict: false, timestamps: true }),
  document_chunks: new mongoose.Schema({ userId: String, workspaceId: String, documentId: String, chunkIndex: Number, text: String, embedding: [Number] }, { strict: false }),
  chat_threads: new mongoose.Schema({ userId: String, workspaceId: String, title: String }, { strict: false, timestamps: true }),
  chat_messages: new mongoose.Schema({ userId: String, workspaceId: String, threadId: String, role: String, content: String, citations: [mongoose.Schema.Types.Mixed] }, { strict: false, timestamps: true }),
  workflow_runs: new mongoose.Schema({ userId: String, workspaceId: String, type: String, status: String, title: String, input: mongoose.Schema.Types.Mixed, output: mongoose.Schema.Types.Mixed, citations: [mongoose.Schema.Types.Mixed], evaluation: mongoose.Schema.Types.Mixed, trace: [mongoose.Schema.Types.Mixed] }, { strict: false, timestamps: true })
};

export function getModel(collection) {
  const names = { users: 'User', workspaces: 'Workspace', documents: 'Document', document_chunks: 'DocumentChunk', chat_threads: 'ChatThread', chat_messages: 'ChatMessage', workflow_runs: 'WorkflowRun' };
  const modelName = names[collection] || collection;
  return mongoose.models[modelName] || mongoose.model(modelName, schemas[collection] || new mongoose.Schema({}, { strict: false, timestamps: true }), collection);
}
