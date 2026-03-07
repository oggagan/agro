import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { upload } from '../../middleware/upload.middleware.js';
import {
  createProductSchema,
  updateProductSchema,
  updateProductStatusSchema,
  listProductsQuerySchema,
} from './product.validation.js';
import * as productController from './product.controller.js';
import { ROLES } from '../../utils/constants.js';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  authorize(ROLES.SUPER_ADMIN, ROLES.MANUFACTURER, ROLES.AUTHORIZED_PERSON),
  validate(createProductSchema),
  productController.createProduct,
);

router.get(
  '/',
  validate(listProductsQuerySchema, 'query'),
  productController.listProducts,
);

router.get('/:id', productController.getProductById);

router.put(
  '/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.MANUFACTURER, ROLES.AUTHORIZED_PERSON),
  validate(updateProductSchema),
  productController.updateProduct,
);

router.patch(
  '/:id/status',
  authorize(ROLES.SUPER_ADMIN),
  validate(updateProductStatusSchema),
  productController.updateProductStatus,
);

router.delete('/:id', authorize(ROLES.SUPER_ADMIN), productController.deleteProduct);

router.post(
  '/:id/documents',
  authorize(ROLES.SUPER_ADMIN, ROLES.MANUFACTURER, ROLES.AUTHORIZED_PERSON),
  upload.array('files', 10),
  productController.uploadProductDocuments,
);

router.delete(
  '/:id/documents/:docId',
  authorize(ROLES.SUPER_ADMIN, ROLES.MANUFACTURER, ROLES.AUTHORIZED_PERSON),
  productController.deleteProductDocument,
);

export default router;
