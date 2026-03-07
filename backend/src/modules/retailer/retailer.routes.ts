import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { upload } from '../../middleware/upload.middleware.js';
import {
  createRetailerSchema,
  updateRetailerSchema,
  updateRetailerStatusSchema,
  listRetailersQuerySchema,
  createDirectorSchema,
  updateDirectorSchema,
  addAuthorizedPersonSchema,
  updateAuthorizedPersonSchema,
  updateBankDetailsSchema,
  createRetailerLicenseSchema,
  updateRetailerLicenseSchema,
} from './retailer.validation.js';
import * as retailerController from './retailer.controller.js';
import { ROLES } from '../../utils/constants.js';

const router = Router();

router.use(authenticate);

// ─── Admin routes (SUPER_ADMIN only) ─────────────────────────────────────────

router.post(
  '/',
  authorize(ROLES.SUPER_ADMIN),
  validate(createRetailerSchema),
  retailerController.createRetailer,
);

router.get(
  '/',
  authorize(ROLES.SUPER_ADMIN),
  validate(listRetailersQuerySchema, 'query'),
  retailerController.listRetailers,
);

router.get('/:id', authorize(ROLES.SUPER_ADMIN), retailerController.getRetailerById);

router.put(
  '/:id',
  authorize(ROLES.SUPER_ADMIN),
  validate(updateRetailerSchema),
  retailerController.updateRetailer,
);

router.patch(
  '/:id/status',
  authorize(ROLES.SUPER_ADMIN),
  validate(updateRetailerStatusSchema),
  retailerController.updateRetailerStatus,
);

router.post(
  '/:id/documents',
  authorize(ROLES.SUPER_ADMIN),
  upload.array('files', 10),
  retailerController.uploadDocuments,
);

router.delete(
  '/:id/documents/:docId',
  authorize(ROLES.SUPER_ADMIN),
  retailerController.deleteDocument,
);

router.post(
  '/:id/directors',
  authorize(ROLES.SUPER_ADMIN),
  validate(createDirectorSchema),
  retailerController.addDirector,
);

router.put(
  '/:id/directors/:dirId',
  authorize(ROLES.SUPER_ADMIN),
  validate(updateDirectorSchema),
  retailerController.updateDirector,
);

router.delete('/:id/directors/:dirId', authorize(ROLES.SUPER_ADMIN), retailerController.deleteDirector);

router.post(
  '/:id/directors/:dirId/documents',
  authorize(ROLES.SUPER_ADMIN),
  upload.array('files', 10),
  retailerController.uploadDirectorDocuments,
);

router.post(
  '/:id/authorized-persons',
  authorize(ROLES.SUPER_ADMIN),
  validate(addAuthorizedPersonSchema),
  retailerController.addAuthorizedPerson,
);

router.put(
  '/:id/authorized-persons/:apId',
  authorize(ROLES.SUPER_ADMIN),
  validate(updateAuthorizedPersonSchema),
  retailerController.updateAuthorizedPerson,
);

router.delete(
  '/:id/authorized-persons/:apId',
  authorize(ROLES.SUPER_ADMIN),
  retailerController.removeAuthorizedPerson,
);

router.post(
  '/:id/authorized-persons/:apId/documents',
  authorize(ROLES.SUPER_ADMIN),
  upload.array('files', 10),
  retailerController.uploadAuthorizedPersonDocuments,
);

router.put(
  '/:id/bank-details',
  authorize(ROLES.SUPER_ADMIN),
  validate(updateBankDetailsSchema),
  retailerController.upsertBankDetails,
);

router.post(
  '/:id/bank-details/documents',
  authorize(ROLES.SUPER_ADMIN),
  upload.array('files', 10),
  retailerController.uploadBankDetailsDocuments,
);

router.post(
  '/:id/licenses',
  authorize(ROLES.SUPER_ADMIN),
  validate(createRetailerLicenseSchema),
  retailerController.addLicense,
);

router.put(
  '/:id/licenses/:licId',
  authorize(ROLES.SUPER_ADMIN),
  validate(updateRetailerLicenseSchema),
  retailerController.updateLicense,
);

router.delete('/:id/licenses/:licId', authorize(ROLES.SUPER_ADMIN), retailerController.deleteLicense);

router.post(
  '/:id/licenses/:licId/documents',
  authorize(ROLES.SUPER_ADMIN),
  upload.array('files', 10),
  retailerController.uploadLicenseDocuments,
);

export default router;
