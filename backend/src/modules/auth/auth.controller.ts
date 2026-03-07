import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/api-response.js';
import { getUserAgent, getClientIp } from '../../utils/request.js';
import * as authService from './auth.service.js';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.registerService(
      req.body.phone,
      req.body.password,
      req.body.name,
      req.body.email,
    );
    sendSuccess({ res, data: result, message: 'Registration successful.', statusCode: 201 });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.loginService(
      { phone: req.body.phone, email: req.body.email, password: req.body.password },
      getClientIp(req),
      getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Login successful.' });
  } catch (error) {
    next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.refreshService(req.body.refreshToken);
    sendSuccess({ res, data: result, message: 'Token refreshed successfully.' });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.logoutService(
      req.user!.userId,
      req.body.refreshToken,
      getClientIp(req),
      getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
}
