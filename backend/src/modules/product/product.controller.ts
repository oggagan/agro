import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/api-response.js';
import { getUserAgent, getClientIp, getParam } from '../../utils/request.js';
import * as productService from './product.service.js';
import { getManufacturerForUser } from '../manufacturer/manufacturer.service.js';

async function getManufacturerIdForUser(req: Request): Promise<string | null> {
  const role = req.user!.role;
  if (role !== 'MANUFACTURER' && role !== 'AUTHORIZED_PERSON') return null;
  const mfr = await getManufacturerForUser(req.user!.userId);
  return mfr?.id ?? null;
}

export async function createProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const manufacturerIdForUser = await getManufacturerIdForUser(req);
    const result = await productService.createProduct(
      req.body,
      req.user!.userId,
      req.user!.role,
      manufacturerIdForUser,
      getClientIp(req),
      getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Product created.', statusCode: 201 });
  } catch (error) {
    next(error);
  }
}

export async function listProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await productService.listProducts(req.query as Record<string, unknown>);
    sendSuccess({ res, data: result.data, message: 'Products retrieved.', meta: result.meta });
  } catch (error) {
    next(error);
  }
}

export async function getProductById(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await productService.getProductById(getParam(req, 'id'));
    sendSuccess({ res, data: result, message: 'Product retrieved.' });
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const manufacturerIdForUser = await getManufacturerIdForUser(req);
    const result = await productService.updateProduct(
      getParam(req, 'id'),
      req.body,
      req.user!.userId,
      req.user!.role,
      manufacturerIdForUser,
      getClientIp(req),
      getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Product updated.' });
  } catch (error) {
    next(error);
  }
}

export async function updateProductStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await productService.updateProductStatus(
      getParam(req, 'id'),
      req.body.status,
      req.body.reason,
      req.user!.userId,
      req.user!.role,
      getClientIp(req),
      getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Product status updated.' });
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await productService.deleteProduct(
      getParam(req, 'id'),
      req.user!.userId,
      req.user!.role,
      getClientIp(req),
      getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Product deleted.' });
  } catch (error) {
    next(error);
  }
}

export async function uploadProductDocuments(req: Request, res: Response, next: NextFunction) {
  try {
    const files = req.files as Express.Multer.File[];
    const manufacturerIdForUser = await getManufacturerIdForUser(req);
    const result = await productService.uploadProductDocuments(
      getParam(req, 'id'),
      files,
      req.body.docType ?? 'product_photo',
      req.user!.userId,
      req.user!.role,
      manufacturerIdForUser,
      getClientIp(req),
      getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Documents uploaded.', statusCode: 201 });
  } catch (error) {
    next(error);
  }
}

export async function deleteProductDocument(req: Request, res: Response, next: NextFunction) {
  try {
    const manufacturerIdForUser = await getManufacturerIdForUser(req);
    const result = await productService.deleteProductDocument(
      getParam(req, 'id'),
      getParam(req, 'docId'),
      req.user!.userId,
      req.user!.role,
      manufacturerIdForUser,
      getClientIp(req),
      getUserAgent(req),
    );
    sendSuccess({ res, data: result, message: 'Document deleted.' });
  } catch (error) {
    next(error);
  }
}
