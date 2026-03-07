import jwt, { type SignOptions } from 'jsonwebtoken';
import { config } from '../config/index.js';
import type { JwtPayload } from '../types/index.js';

export function signAccessToken(payload: JwtPayload): string {
  const options: SignOptions = { expiresIn: config.jwt.accessTokenExpiry as any };
  return jwt.sign(payload, config.jwt.accessTokenSecret, options);
}

export function signRefreshToken(payload: JwtPayload): string {
  const options: SignOptions = { expiresIn: config.jwt.refreshTokenExpiry as any };
  return jwt.sign(payload, config.jwt.refreshTokenSecret, options);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwt.accessTokenSecret) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwt.refreshTokenSecret) as JwtPayload;
}
