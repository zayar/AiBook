import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const TOKEN_HEADER = 'authorization';
const SECRET = process.env.SUPERADMIN_SECRET || 'change-this-superadmin-secret';

export function verifyToken(token: string): { adminId: string; exp: number } | null {
  try {
    const [headerB64, payloadB64, signature] = token.split('.');
    if (!headerB64 || !payloadB64 || !signature) return null;

    const data = `${headerB64}.${payloadB64}`;
    const expected = crypto
      .createHmac('sha256', SECRET)
      .update(data)
      .digest('base64url');
    if (expected !== signature) return null;

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    if (!payload || !payload.adminId || !payload.exp) return null;
    if (Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function issueToken(adminId: string, ttlSeconds = 60 * 60 * 12): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = { adminId, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');
  return `${headerB64}.${payloadB64}.${signature}`;
}

export function superAdminAuth(req: Request, res: Response, next: NextFunction) {
  const header = (req.headers[TOKEN_HEADER] as string) || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  if (!token) {
    return res.status(401).json({ error: 'Super admin token required' });
  }
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired super admin token' });
  }
  (req as any).superAdmin = { id: payload.adminId };
  next();
}


