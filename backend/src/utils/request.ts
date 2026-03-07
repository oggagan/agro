import { Request } from 'express';

export function getUserAgent(req: Request): string | undefined {
  const ua = req.headers['user-agent'];
  return Array.isArray(ua) ? ua[0] : ua;
}

export function getClientIp(req: Request): string | undefined {
  const ip = req.ip;
  if (!ip) return undefined;
  return Array.isArray(ip) ? ip[0] : ip;
}

/** Express v5 params can be string | string[]; this normalizes to string. */
export function getParam(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? val[0] : val;
}
