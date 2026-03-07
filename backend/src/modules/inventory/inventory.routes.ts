import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  createInventorySchema,
  updateInventorySchema,
  listInventoriesQuerySchema,
  addInventoryProductSchema,
  updateInventoryProductSchema,
  listInventoryProductsQuerySchema,
} from './inventory.validation.js';
import * as inventoryController from './inventory.controller.js';
import { ROLES } from '../../utils/constants.js';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  authorize(ROLES.SUPER_ADMIN),
  validate(createInventorySchema),
  inventoryController.createInventory,
);

router.get(
  '/',
  validate(listInventoriesQuerySchema, 'query'),
  inventoryController.listInventories,
);

router.get('/stats', inventoryController.getInventoryStats);

router.get('/:id', inventoryController.getInventoryById);

router.put(
  '/:id',
  authorize(ROLES.SUPER_ADMIN),
  validate(updateInventorySchema),
  inventoryController.updateInventory,
);

router.delete(
  '/:id',
  authorize(ROLES.SUPER_ADMIN),
  inventoryController.deleteInventory,
);

router.post(
  '/:id/products',
  authorize(ROLES.SUPER_ADMIN, ROLES.MANUFACTURER, ROLES.RETAILER, ROLES.DISTRIBUTOR),
  validate(addInventoryProductSchema),
  inventoryController.addProductToInventory,
);

router.get(
  '/:id/products',
  validate(listInventoryProductsQuerySchema, 'query'),
  inventoryController.listInventoryProducts,
);

router.put(
  '/:id/products/:inventoryProductId',
  authorize(ROLES.SUPER_ADMIN, ROLES.MANUFACTURER, ROLES.RETAILER, ROLES.DISTRIBUTOR),
  validate(updateInventoryProductSchema),
  inventoryController.updateInventoryProduct,
);

router.delete(
  '/:id/products/:inventoryProductId',
  authorize(ROLES.SUPER_ADMIN),
  inventoryController.deleteInventoryProduct,
);

export default router;
