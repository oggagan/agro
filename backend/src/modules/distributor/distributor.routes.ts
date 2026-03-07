import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { upload } from '../../middleware/upload.middleware.js';
import {
  createDistributorSchema,
  updateDistributorSchema,
  updateDistributorStatusSchema,
  listDistributorsQuerySchema,
  createDirectorSchema,
  updateDirectorSchema,
  addAuthorizedPersonSchema,
  updateAuthorizedPersonSchema,
  updateBankDetailsSchema,
  createDistributorLicenseSchema,
  updateDistributorLicenseSchema,
} from './distributor.validation.js';
import * as distributorController from './distributor.controller.js';
import { ROLES } from '../../utils/constants.js';

const router = Router();

router.use(authenticate);

// ─── Admin routes (SUPER_ADMIN only) ─────────────────────────────────────────

router.post(
  '/',
  authorize(ROLES.SUPER_ADMIN),
  validate(createDistributorSchema),
  distributorController.createDistributor,
);

router.get(
  '/',
  authorize(ROLES.SUPER_ADMIN),
  validate(listDistributorsQuerySchema, 'query'),
  distributorController.listDistributors,
);

router.get('/:id', authorize(ROLES.SUPER_ADMIN), distributorController.getDistributorById);

router.put(
  '/:id',
  authorize(ROLES.SUPER_ADMIN),
  validate(updateDistributorSchema),
  distributorController.updateDistributor,
);

router.patch(
  '/:id/status',
  authorize(ROLES.SUPER_ADMIN),
  validate(updateDistributorStatusSchema),
  distributorController.updateDistributorStatus,
);

router.post(
  '/:id/documents',
  authorize(ROLES.SUPER_ADMIN),
  upload.array('files', 10),
  distributorController.uploadDocuments,
);

router.delete(
  '/:id/documents/:docId',
  authorize(ROLES.SUPER_ADMIN),
  distributorController.deleteDocument,
);

router.post(
  '/:id/directors',
  authorize(ROLES.SUPER_ADMIN),
  validate(createDirectorSchema),
  distributorController.addDirector,
);

router.put(
  '/:id/directors/:dirId',
  authorize(ROLES.SUPER_ADMIN),
  validate(updateDirectorSchema),
  distributorController.updateDirector,
);

router.delete('/:id/directors/:dirId', authorize(ROLES.SUPER_ADMIN), distributorController.deleteDirector);

router.post(
  '/:id/directors/:dirId/documents',
  authorize(ROLES.SUPER_ADMIN),
  upload.array('files', 10),
  distributorController.uploadDirectorDocuments,
);

router.post(
  '/:id/authorized-persons',
  authorize(ROLES.SUPER_ADMIN),
  validate(addAuthorizedPersonSchema),
  distributorController.addAuthorizedPerson,
);

router.put(
  '/:id/authorized-persons/:apId',
  authorize(ROLES.SUPER_ADMIN),
  validate(updateAuthorizedPersonSchema),
  distributorController.updateAuthorizedPerson,
);

router.delete(
  '/:id/authorized-persons/:apId',
  authorize(ROLES.SUPER_ADMIN),
  distributorController.removeAuthorizedPerson,
);

router.post(
  '/:id/authorized-persons/:apId/documents',
  authorize(ROLES.SUPER_ADMIN),
  upload.array('files', 10),
  distributorController.uploadAuthorizedPersonDocuments,
);

router.put(
  '/:id/bank-details',
  authorize(ROLES.SUPER_ADMIN),
  validate(updateBankDetailsSchema),
  distributorController.upsertBankDetails,
);

router.post(
  '/:id/bank-details/documents',
  authorize(ROLES.SUPER_ADMIN),
  upload.array('files', 10),
  distributorController.uploadBankDetailsDocuments,
);

router.post(
  '/:id/licenses',
  authorize(ROLES.SUPER_ADMIN),
  validate(createDistributorLicenseSchema),
  distributorController.addLicense,
);

router.put(
  '/:id/licenses/:licId',
  authorize(ROLES.SUPER_ADMIN),
  validate(updateDistributorLicenseSchema),
  distributorController.updateLicense,
);

router.delete('/:id/licenses/:licId', authorize(ROLES.SUPER_ADMIN), distributorController.deleteLicense);

router.post(
  '/:id/licenses/:licId/documents',
  authorize(ROLES.SUPER_ADMIN),
  upload.array('files', 10),
  distributorController.uploadLicenseDocuments,
);

export default router;
