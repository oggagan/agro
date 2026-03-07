import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/api-response.js';
import { getUserAgent, getClientIp, getParam } from '../../utils/request.js';
import * as inventoryService from './inventory.service.js';

export async function createInventory(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await inventoryService.createInventory(
      req.body,
      req.user!.userId,
      req.user!.role,
      getClientIp(req),
      getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Inventory created.', statusCode: 201 });
  } catch (error) {
    next(error);
  }
}

export async function listInventories(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await inventoryService.listInventories(req.query as Record<string, unknown>);
    sendSuccess({ res, data: result.data, message: 'Inventories retrieved.', meta: result.meta });
  } catch (error) {
    next(error);
  }
}

export async function getInventoryStats(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await inventoryService.getInventoryStats();
    sendSuccess({ res, data: result, message: 'Inventory stats retrieved.' });
  } catch (error) {
    next(error);
  }
}

export async function getInventoryById(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await inventoryService.getInventoryById(getParam(req, 'id'));
    sendSuccess({ res, data: result, message: 'Inventory retrieved.' });
  } catch (error) {
    next(error);
  }
}

export async function updateInventory(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await inventoryService.updateInventory(
      getParam(req, 'id'),
      req.body,
      req.user!.userId,
      req.user!.role,
      getClientIp(req),
      getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Inventory updated.' });
  } catch (error) {
    next(error);
  }
}

export async function deleteInventory(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await inventoryService.deleteInventory(
      getParam(req, 'id'),
      req.user!.userId,
      req.user!.role,
      getClientIp(req),
      getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Inventory deleted.' });
  } catch (error) {
    next(error);
  }
}

export async function addProductToInventory(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await inventoryService.addProductToInventory(
      getParam(req, 'id'),
      req.body,
      req.user!.userId,
      req.user!.role,
      getClientIp(req),
      getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Product added to inventory.', statusCode: 201 });
  } catch (error) {
    next(error);
  }
}

export async function listInventoryProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await inventoryService.listInventoryProducts(
      getParam(req, 'id'),
      req.query as Record<string, unknown>,
    );
    sendSuccess({ res, data: result.data, message: 'Inventory products retrieved.', meta: result.meta });
  } catch (error) {
    next(error);
  }
}

export async function updateInventoryProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await inventoryService.updateInventoryProduct(
      getParam(req, 'id'),
      getParam(req, 'inventoryProductId'),
      req.body,
      req.user!.userId,
      req.user!.role,
      getClientIp(req),
      getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Inventory product updated.' });
  } catch (error) {
    next(error);
  }
}

export async function deleteInventoryProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await inventoryService.deleteInventoryProduct(
      getParam(req, 'id'),
      getParam(req, 'inventoryProductId'),
      req.user!.userId,
      req.user!.role,
      getClientIp(req),
      getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Inventory product entry deleted.' });
  } catch (error) {
    next(error);
  }
}
