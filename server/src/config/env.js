import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });

export const env = {
  port: Number(process.env.PORT || 3001),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI || '',
  mongoDnsServers: (process.env.MONGODB_DNS_SERVERS || '').split(',').map((value) => value.trim()).filter(Boolean),
  jwtSecret: process.env.JWT_SECRET || randomBytes(32).toString('hex'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  seedSampleData: process.env.SEED_SAMPLE_DATA !== 'false',
  ollamaUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  ollamaChatModel: process.env.OLLAMA_CHAT_MODEL || 'llama3.1:8b',
  ollamaEmbedModel: process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text',
  llmProvider: (process.env.LLM_PROVIDER || 'ollama').toLowerCase(),
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiChatModel: process.env.OPENAI_CHAT_MODEL || 'gpt-6-luna',
  openaiEmbedModel: process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small'
};
