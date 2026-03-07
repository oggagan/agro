import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { upload } from '../../middleware/upload.middleware.js';
import {
  createManufacturerSchema,
  updateManufacturerSchema,
  updateManufacturerStatusSchema,
  createDirectorSchema,
  updateDirectorSchema,
  addAuthorizedPersonSchema,
  updateAuthorizedPersonSchema,
  updateBankDetailsSchema,
  listManufacturersQuerySchema,
} from './manufacturer.validation.js';
import * as mfgController from './manufacturer.controller.js';
import { ROLES } from '../../utils/constants.js';

const router = Router();

router.use(authenticate);

// ─── Self-service routes (must be before :id param routes) ───────────────────

/**
 * @swagger
 * /api/v1/manufacturers/me:
 *   get:
 *     tags: [Manufacturers]
 *     summary: Get own manufacturer profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Manufacturer profile retrieved
 */
router.get('/me', authorize(ROLES.MANUFACTURER, ROLES.AUTHORIZED_PERSON), mfgController.getOwnProfile);

/**
 * @swagger
 * /api/v1/manufacturers/me:
 *   put:
 *     tags: [Manufacturers]
 *     summary: Update own manufacturer profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.put('/me', authorize(ROLES.MANUFACTURER, ROLES.AUTHORIZED_PERSON), validate(updateManufacturerSchema), mfgController.updateOwnProfile);

/**
 * @swagger
 * /api/v1/manufacturers/me/documents:
 *   post:
 *     tags: [Manufacturers]
 *     summary: Upload own documents
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Documents uploaded
 */
router.post('/me/documents', authorize(ROLES.MANUFACTURER, ROLES.AUTHORIZED_PERSON), upload.array('files', 10), mfgController.uploadOwnDocuments);

/**
 * @swagger
 * /api/v1/manufacturers/me/bank-details:
 *   put:
 *     tags: [Manufacturers]
 *     summary: Update own bank details
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bank details updated
 */
router.put('/me/bank-details', authorize(ROLES.MANUFACTURER, ROLES.AUTHORIZED_PERSON), validate(updateBankDetailsSchema), mfgController.updateOwnBankDetails);

/**
 * @swagger
 * /api/v1/manufacturers/me/directors/{dirId}:
 *   put:
 *     tags: [Manufacturers]
 *     summary: Update own director
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: dirId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Director updated
 */
router.put('/me/directors/:dirId', authorize(ROLES.MANUFACTURER, ROLES.AUTHORIZED_PERSON), validate(updateDirectorSchema), mfgController.updateOwnDirector);

/**
 * @swagger
 * /api/v1/manufacturers/me/authorized-persons/{apId}:
 *   put:
 *     tags: [Manufacturers]
 *     summary: Update an authorized person for own manufacturer
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: apId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Authorized person updated
 */
router.put('/me/authorized-persons/:apId', authorize(ROLES.MANUFACTURER, ROLES.AUTHORIZED_PERSON), validate(updateAuthorizedPersonSchema), mfgController.updateOwnAuthorizedPerson);

// ─── Admin routes ────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/manufacturers:
 *   post:
 *     tags: [Manufacturers]
 *     summary: Create a manufacturer (admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, password, name, companyName, companyType]
 *             properties:
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *               name:
 *                 type: string
 *               companyName:
 *                 type: string
 *               companyType:
 *                 type: string
 *                 enum: [LIMITED, PVT_LTD, PROPRIETORSHIP, PARTNERSHIP]
 *     responses:
 *       201:
 *         description: Manufacturer created
 */
router.post('/', authorize(ROLES.SUPER_ADMIN), validate(createManufacturerSchema), mfgController.createManufacturer);

/**
 * @swagger
 * /api/v1/manufacturers:
 *   get:
 *     tags: [Manufacturers]
 *     summary: List all manufacturers (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Manufacturers retrieved
 */
router.get('/', authorize(ROLES.SUPER_ADMIN), validate(listManufacturersQuerySchema, 'query'), mfgController.listManufacturers);

/**
 * @swagger
 * /api/v1/manufacturers/{id}:
 *   get:
 *     tags: [Manufacturers]
 *     summary: Get manufacturer by ID (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Manufacturer retrieved
 */
router.get('/:id', authorize(ROLES.SUPER_ADMIN), mfgController.getManufacturerById);

/**
 * @swagger
 * /api/v1/manufacturers/{id}:
 *   put:
 *     tags: [Manufacturers]
 *     summary: Update manufacturer (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Manufacturer updated
 */
router.put('/:id', authorize(ROLES.SUPER_ADMIN), validate(updateManufacturerSchema), mfgController.updateManufacturer);

/**
 * @swagger
 * /api/v1/manufacturers/{id}/status:
 *   patch:
 *     tags: [Manufacturers]
 *     summary: Update manufacturer status (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/:id/status', authorize(ROLES.SUPER_ADMIN), validate(updateManufacturerStatusSchema), mfgController.updateManufacturerStatus);

/**
 * @swagger
 * /api/v1/manufacturers/{id}/documents:
 *   post:
 *     tags: [Manufacturers]
 *     summary: Upload documents for manufacturer (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Documents uploaded
 */
router.post('/:id/documents', authorize(ROLES.SUPER_ADMIN), upload.array('files', 10), mfgController.uploadDocuments);

/**
 * @swagger
 * /api/v1/manufacturers/{id}/documents/{docId}:
 *   delete:
 *     tags: [Manufacturers]
 *     summary: Delete document (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: docId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Document deleted
 */
router.delete('/:id/documents/:docId', authorize(ROLES.SUPER_ADMIN), mfgController.deleteDocument);

/**
 * @swagger
 * /api/v1/manufacturers/{id}/directors:
 *   post:
 *     tags: [Manufacturers]
 *     summary: Add director (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Director added
 */
/**
 * @swagger
 * /api/v1/manufacturers/{id}/directors/{dirId}/documents:
 *   post:
 *     tags: [Manufacturers]
 *     summary: Upload documents for a director (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: dirId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Director documents uploaded
 */
router.post('/:id/directors/:dirId/documents', authorize(ROLES.SUPER_ADMIN), upload.array('files', 10), mfgController.uploadDirectorDocuments);

/**
 * @swagger
 * /api/v1/manufacturers/{id}/authorized-persons/{apId}/documents:
 *   post:
 *     tags: [Manufacturers]
 *     summary: Upload documents for an authorized person (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: apId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Authorized person documents uploaded
 */
router.post('/:id/authorized-persons/:apId/documents', authorize(ROLES.SUPER_ADMIN), upload.array('files', 10), mfgController.uploadAuthorizedPersonDocuments);

/**
 * @swagger
 * /api/v1/manufacturers/{id}/bank-details/documents:
 *   post:
 *     tags: [Manufacturers]
 *     summary: Upload documents for bank details (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Bank details documents uploaded
 */
router.post('/:id/bank-details/documents', authorize(ROLES.SUPER_ADMIN), upload.array('files', 10), mfgController.uploadBankDetailsDocuments);

router.post('/:id/directors', authorize(ROLES.SUPER_ADMIN), validate(createDirectorSchema), mfgController.addDirector);

/**
 * @swagger
 * /api/v1/manufacturers/{id}/directors/{dirId}:
 *   put:
 *     tags: [Manufacturers]
 *     summary: Update director (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: dirId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Director updated
 */
router.put('/:id/directors/:dirId', authorize(ROLES.SUPER_ADMIN), validate(updateDirectorSchema), mfgController.updateDirector);

/**
 * @swagger
 * /api/v1/manufacturers/{id}/directors/{dirId}:
 *   delete:
 *     tags: [Manufacturers]
 *     summary: Delete director (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: dirId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Director deleted
 */
router.delete('/:id/directors/:dirId', authorize(ROLES.SUPER_ADMIN), mfgController.deleteDirector);

/**
 * @swagger
 * /api/v1/manufacturers/{id}/authorized-person:
 *   put:
 *     tags: [Manufacturers]
 *     summary: "(Legacy) Set/update single authorized person when manufacturer has 0 or 1"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Authorized person updated or created
 *       400:
 *         description: Manufacturer has multiple authorized persons; use PUT .../authorized-persons/:apId
 */
router.put('/:id/authorized-person', authorize(ROLES.SUPER_ADMIN), validate(updateAuthorizedPersonSchema), mfgController.upsertAuthorizedPersonLegacy);

/**
 * @swagger
 * /api/v1/manufacturers/{id}/authorized-persons:
 *   post:
 *     tags: [Manufacturers]
 *     summary: Add authorized person (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Authorized person added
 */
router.post('/:id/authorized-persons', authorize(ROLES.SUPER_ADMIN), validate(addAuthorizedPersonSchema), mfgController.addAuthorizedPerson);

/**
 * @swagger
 * /api/v1/manufacturers/{id}/authorized-persons/{apId}:
 *   put:
 *     tags: [Manufacturers]
 *     summary: Update authorized person (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: apId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Authorized person updated
 */
router.put('/:id/authorized-persons/:apId', authorize(ROLES.SUPER_ADMIN), validate(updateAuthorizedPersonSchema), mfgController.updateAuthorizedPerson);

/**
 * @swagger
 * /api/v1/manufacturers/{id}/authorized-persons/{apId}:
 *   delete:
 *     tags: [Manufacturers]
 *     summary: Remove authorized person (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: apId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Authorized person removed
 */
router.delete('/:id/authorized-persons/:apId', authorize(ROLES.SUPER_ADMIN), mfgController.removeAuthorizedPerson);

/**
 * @swagger
 * /api/v1/manufacturers/{id}/bank-details:
 *   put:
 *     tags: [Manufacturers]
 *     summary: Set/update bank details (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bank details updated
 */
router.put('/:id/bank-details', authorize(ROLES.SUPER_ADMIN), validate(updateBankDetailsSchema), mfgController.upsertBankDetails);

export default router;
