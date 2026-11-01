import dns from 'node:dns/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { setServers } from 'node:dns';
import { env } from '../config/env.js';

const execFileAsync = promisify(execFile);
const srvProtocol = ['mongodb', '+srv:'].join('');
const mongoProtocol = ['mongodb:', '//'].join('');
const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('DNS lookup timed out')), ms));

async function nodeLookup(operation) {
  return Promise.race([operation, timeout(1800)]);
}

async function windowsDns(name, type) {
  if (!/^[a-z\d._-]+$/i.test(name)) throw new Error('Invalid DNS lookup name');
  const fields = type === 'SRV' ? 'NameTarget,Port,Priority,Weight' : 'Strings';
  const command = `Resolve-DnsName -Name '${name}' -Type ${type} -DnsOnly -ErrorAction Stop | Select-Object ${fields} | ConvertTo-Json -Compress`;
  const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { windowsHide: true, timeout: 8000, maxBuffer: 64 * 1024 });
  const parsed = JSON.parse(stdout.trim());
  return Array.isArray(parsed) ? parsed : [parsed];
}

async function resolveRecord(name, type) {
  try {
    const records = type === 'SRV' ? await nodeLookup(dns.resolveSrv(name)) : await nodeLookup(dns.resolveTxt(name));
    return records;
  } catch (error) {
    if (process.platform !== 'win32') throw error;
    return windowsDns(name, type);
  }
}

function formatSrvUri(originalUri, srvRecords, txtRecords) {
  const parsed = new URL(originalUri.replace(new RegExp(`^${srvProtocol}`, 'i'), 'https:'));
  const txtValue = (txtRecords || []).flatMap((record) => {
    if (typeof record === 'string') return [record];
    if (Array.isArray(record?.Strings)) return record.Strings;
    return typeof record?.Strings === 'string' ? [record.Strings] : [];
  }).join('');
  const txtOptions = new URLSearchParams(txtValue);
  const originalOptions = parsed.searchParams;
  for (const [key, value] of originalOptions) txtOptions.set(key, value);
  txtOptions.set('tls', txtOptions.get('tls') || 'true');
  const credentials = parsed.username ? `${parsed.username}${parsed.password ? `:${parsed.password}` : ''}@` : '';
  const hosts = srvRecords.map((record) => `${String(record.name || record.NameTarget).replace(/\.$/, '')}:${record.port || record.Port || 27017}`).join(',');
  if (!hosts) throw new Error('The Atlas SRV record did not return any MongoDB hosts');
  return `${mongoProtocol}${credentials}${hosts}${parsed.pathname === '/' ? '' : parsed.pathname}?${txtOptions.toString()}`;
}

export async function getMongoConnectionUri() {
  if (!env.mongoUri) return '';
  if (env.mongoDnsServers.length) setServers(env.mongoDnsServers);
  if (!env.mongoUri.toLowerCase().startsWith(`${srvProtocol}//`)) return env.mongoUri;

  const parsed = new URL(env.mongoUri.replace(new RegExp(`^${srvProtocol}`, 'i'), 'https:'));
  const srvName = `_mongodb._tcp.${parsed.hostname}`;
  try {
    const srvRecords = await resolveRecord(srvName, 'SRV');
    let txtRecords = [];
    try { txtRecords = await resolveRecord(parsed.hostname, 'TXT'); } catch { /* Atlas TXT settings are optional; explicit URI options remain */ }
    // When Node resolves both record types, let the driver apply SRV defaults itself.
    const srvResolvedByNode = typeof srvRecords?.[0]?.name === 'string';
    const txtResolvedByNode = !txtRecords.length || Array.isArray(txtRecords[0]);
    if (process.platform !== 'win32' || (srvResolvedByNode && txtResolvedByNode)) return env.mongoUri;
    return formatSrvUri(env.mongoUri, srvRecords, txtRecords);
  } catch (error) {
    if (process.platform !== 'win32') throw error;
    const srvRecords = await windowsDns(srvName, 'SRV');
    let txtRecords = [];
    try { txtRecords = await windowsDns(parsed.hostname, 'TXT'); } catch { /* Atlas TXT settings are optional; explicit URI options remain */ }
    return formatSrvUri(env.mongoUri, srvRecords, txtRecords);
  }
}
