import fs from 'node:fs/promises';
import path from 'node:path';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';
import { parse } from 'csv-parse/sync';
import { repository } from './repository.js';
import { embed } from './ollama.js';

const MIME_BY_EXT = { '.pdf': 'application/pdf', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.txt': 'text/plain', '.md': 'text/markdown', '.csv': 'text/csv', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
export const supportedExtensions = Object.keys(MIME_BY_EXT);
export function cleanText(text) { return String(text || '').replace(/\r/g, '').replace(/[\t ]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim(); }

async function extractText(filePath, ext) {
  if (ext === '.pdf') return (await pdf(await fs.readFile(filePath))).text;
  if (ext === '.docx') return (await mammoth.extractRawText({ path: filePath })).value;
  if (ext === '.txt' || ext === '.md') return fs.readFile(filePath, 'utf8');
  if (ext === '.csv') {
    const records = parse(await fs.readFile(filePath), { columns: true, skip_empty_lines: true, relax_column_count: true });
    return records.map((row, index) => `Row ${index + 1}: ${Object.entries(row).map(([key, value]) => `${key}: ${value}`).join('; ')}`).join('\n');
  }
  if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
    const { createWorker } = await import('tesseract.js'); const worker = await createWorker('eng');
    try { return (await worker.recognize(filePath)).data.text; } finally { await worker.terminate(); }
  }
  throw new Error('Unsupported file type');
}

export function chunkText(input, target = 1200, overlap = 200) {
  const paragraphs = cleanText(input).split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  const chunks = []; let current = '';
  for (const paragraph of paragraphs) {
    if (paragraph.length > target) {
      if (current) { chunks.push(current); current = ''; }
      let start = 0; while (start < paragraph.length) { chunks.push(paragraph.slice(start, start + target)); start += target - overlap; }
    } else if (!current) current = paragraph;
    else if ((current + '\n\n' + paragraph).length <= target) current += '\n\n' + paragraph;
    else { chunks.push(current); current = `${current.slice(-overlap)}\n\n${paragraph}`; }
  }
  if (current) chunks.push(current);
  return chunks.map((text) => text.trim()).filter(Boolean);
}

function fallbackSummary(text) {
  const sentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 35);
  const keyPoints = [...new Set(sentences)].slice(0, 5);
  return { summary: keyPoints.slice(0, 3).join(' ') || text.slice(0, 600), keyPoints };
}

export async function processDocument(document) {
  await repository.updateById('documents', document._id, { status: 'processing', processingError: '' });
  try {
    const ext = path.extname(document.originalName).toLowerCase();
    const extractedText = cleanText(await extractText(document.filePath, ext));
    if (extractedText.length < 20) throw new Error('The file did not contain enough readable text');
    const chunks = chunkText(extractedText);
    const summary = fallbackSummary(extractedText);
    await repository.deleteWhere('document_chunks', { userId: document.userId, documentId: String(document._id) });
    for (let index = 0; index < chunks.length; index += 1) {
      let vector = null; try { vector = await embed(chunks[index]); } catch { /* keyword retrieval remains available */ }
      await repository.create('document_chunks', { userId: document.userId, workspaceId: String(document.workspaceId), documentId: String(document._id), chunkIndex: index, text: chunks[index], tokenCountApprox: Math.ceil(chunks[index].length / 4), embedding: vector || [], metadata: {} });
    }
    return repository.updateById('documents', document._id, { extractedText, summary: summary.summary, metadata: { keyPoints: summary.keyPoints }, status: 'ready', processingError: '', pageCount: null });
  } catch (error) {
    return repository.updateById('documents', document._id, { status: 'failed', processingError: error.message });
  }
}

export async function handleUploadedFile(file, userId, workspaceId) {
  const ext = path.extname(file.originalname).toLowerCase();
  const document = await repository.create('documents', { userId, workspaceId, originalName: file.originalname, storedName: path.basename(file.path), filePath: file.path, mimeType: MIME_BY_EXT[ext], size: file.size, fileType: ext.slice(1) === 'jpeg' ? 'image' : (['png', 'jpg', 'webp'].includes(ext.slice(1)) ? 'image' : ext.slice(1)), status: 'uploaded', extractedText: '', summary: '', metadata: {} });
  return processDocument(document);
}
