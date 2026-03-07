import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/api-response.js';
import { getUserAgent, getClientIp, getParam } from '../../utils/request.js';
import * as userService from './user.service.js';

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await userService.listUsers(
      req.query as Record<string, unknown>,
      req.user!.userId,
      req.user!.role,
    );
    sendSuccess({ res, data: result.data, message: 'Users retrieved.', meta: result.meta });
  } catch (error) {
    next(error);
  }
}

export async function getUserById(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.getUserById(getParam(req, 'id'));
    sendSuccess({ res, data: user, message: 'User retrieved.' });
  } catch (error) {
    next(error);
  }
}

export async function updateUserStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await userService.updateUserStatus(
      getParam(req, 'id'),
      req.body.status,
      req.body.reason,
      req.user!.userId,
      req.user!.role,
      getClientIp(req),
      getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'User status updated.' });
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await userService.softDeleteUser(
      getParam(req, 'id'),
      req.user!.userId,
      req.user!.role,
      getClientIp(req),
      getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'User deleted.' });
  } catch (error) {
    next(error);
  }
}

export async function getOwnProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.getOwnProfile(req.user!.userId);
    sendSuccess({ res, data: user, message: 'Profile retrieved.' });
  } catch (error) {
    next(error);
  }
}

export async function updateOwnProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await userService.updateOwnProfile(
      req.user!.userId,
      req.body,
      getClientIp(req),
      getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Profile updated.' });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await userService.changePassword(
      req.user!.userId,
      req.body.currentPassword,
      req.body.newPassword,
      getClientIp(req),
      getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Password changed.' });
  } catch (error) {
    next(error);
  }
}
