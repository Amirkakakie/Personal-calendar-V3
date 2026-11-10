import crypto from 'node:crypto';
import type { Prisma } from '@prisma/client';

const ARCHIVE_FORMAT='chronos-encrypted-json-v1';
const TOKEN_PREFIX='chronos-token:v1:';

function encryptionKey(): Buffer {
  const configured=process.env.CHRONOS_DATA_ENCRYPTION_KEY;
  if(!configured) throw new Error('CHRONOS_DATA_ENCRYPTION_KEY is required to encrypt or decrypt Chronos archives and Google tokens.');
  let key:Buffer;
  if(/^[0-9a-f]{64}$/i.test(configured)) key=Buffer.from(configured,'hex');
  else {
    try { key=Buffer.from(configured,'base64'); }
    catch { throw new Error('CHRONOS_DATA_ENCRYPTION_KEY must be a 32-byte base64 or 64-character hex value.'); }
  }
  if(key.length!==32) throw new Error('CHRONOS_DATA_ENCRYPTION_KEY must decode to exactly 32 bytes.');
  return key;
}

export function encryptJsonPayload(value: unknown): Prisma.InputJsonValue {
  const iv=crypto.randomBytes(12);
  const cipher=crypto.createCipheriv('aes-256-gcm',encryptionKey(),iv);
  const ciphertext=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);
  return {
    format:ARCHIVE_FORMAT,
    algorithm:'aes-256-gcm',
    iv:iv.toString('base64'),
    authTag:cipher.getAuthTag().toString('base64'),
    ciphertext:ciphertext.toString('base64')
  } as Prisma.InputJsonValue;
}

export function decryptJsonPayload(value: unknown): unknown {
  const envelope=value as Record<string,unknown>;
  if(!envelope || envelope.format!==ARCHIVE_FORMAT || typeof envelope.iv!=='string' || typeof envelope.authTag!=='string' || typeof envelope.ciphertext!=='string') {
    throw new Error('Legacy archive payload is not a supported encrypted Chronos archive.');
  }
  const decipher=crypto.createDecipheriv('aes-256-gcm',encryptionKey(),Buffer.from(envelope.iv,'base64'));
  decipher.setAuthTag(Buffer.from(envelope.authTag,'base64'));
  const plain=Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext,'base64')),decipher.final()]).toString('utf8');
  return JSON.parse(plain);
}

export function encryptGoogleToken(value: string | null | undefined): string | null {
  if(!value) return null;
  if(value.startsWith(TOKEN_PREFIX)) return value;
  const iv=crypto.randomBytes(12);
  const cipher=crypto.createCipheriv('aes-256-gcm',encryptionKey(),iv);
  const ciphertext=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
  return TOKEN_PREFIX+[iv.toString('base64'),cipher.getAuthTag().toString('base64'),ciphertext.toString('base64')].join(':');
}

export function decryptGoogleToken(value: string | null | undefined): string | null {
  if(!value) return null;
  if(!value.startsWith(TOKEN_PREFIX)) return value; // One-way compatibility for pre-encryption rows; next write encrypts it.
  const parts=value.slice(TOKEN_PREFIX.length).split(':');
  if(parts.length!==3) throw new Error('Stored Google token has an invalid encrypted envelope.');
  const [iv,authTag,ciphertext]=parts;
  const decipher=crypto.createDecipheriv('aes-256-gcm',encryptionKey(),Buffer.from(iv,'base64'));
  decipher.setAuthTag(Buffer.from(authTag,'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext,'base64')),decipher.final()]).toString('utf8');
}
