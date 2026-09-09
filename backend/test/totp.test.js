import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateSecret, totp, verifyTotp, generateBackupCodes, hashBackupCode } from '../src/services/totp.service.js';

test('generateSecret returns a base64 string without padding', () => {
  const secret = generateSecret();
  assert.equal(typeof secret, 'string');
  assert.ok(secret.length > 0);
  assert.ok(!secret.includes('='));
});

test('totp produces a 6-digit code', () => {
  const secret = generateSecret();
  const code = totp(secret);
  assert.match(code, /^\d{6}$/);
});

test('verifyTotp accepts the current code', () => {
  const secret = generateSecret();
  const code = totp(secret);
  assert.equal(verifyTotp(secret, code), true);
});

test('verifyTotp rejects an incorrect code', () => {
  const secret = generateSecret();
  const code = totp(secret);
  const bad = code === '000000' ? '000001' : '000000';
  assert.equal(verifyTotp(secret, bad), false);
});

test('verifyTotp tolerates codes within the time window', () => {
  const secret = generateSecret();
  const now = Date.now();
  const older = totp(secret, { timestamp: now - 30 * 1000 });
  assert.equal(verifyTotp(secret, older, { timestamp: now }), true);
});

test('verifyTotp returns false for non-numeric input', () => {
  const secret = generateSecret();
  assert.equal(verifyTotp(secret, 'not-a-code'), false);
  assert.equal(verifyTotp(secret, ''), false);
  assert.equal(verifyTotp('', '123456'), false);
});

test('generateBackupCodes produces unique uppercase codes', () => {
  const codes = generateBackupCodes(8);
  assert.equal(codes.length, 8);
  assert.equal(new Set(codes).size, 8);
  codes.forEach((c) => assert.equal(c, c.toUpperCase()));
});

test('hashBackupCode is deterministic and case-insensitive', () => {
  const code = 'ABC123';
  assert.equal(hashBackupCode(code), hashBackupCode('abc123'));
  assert.equal(hashBackupCode(code).length, 64);
});
