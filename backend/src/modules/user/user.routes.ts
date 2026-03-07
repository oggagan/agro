import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { updateUserStatusSchema, updateProfileSchema, changePasswordSchema, listUsersQuerySchema } from './user.validation.js';
import * as userController from './user.controller.js';
import { ROLES } from '../../utils/constants.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ─── Self-service routes (must come before :id routes) ───────────────────────

/**
 * @swagger
 * /api/v1/users/me:
 *   get:
 *     tags: [Users]
 *     summary: Get own profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved
 */
router.get('/me', userController.getOwnProfile);

/**
 * @swagger
 * /api/v1/users/me:
 *   patch:
 *     tags: [Users]
 *     summary: Update own profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.patch('/me', validate(updateProfileSchema), userController.updateOwnProfile);

/**
 * @swagger
 * /api/v1/users/me/password:
 *   patch:
 *     tags: [Users]
 *     summary: Change own password
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed
 */
router.patch('/me/password', validate(changePasswordSchema), userController.changePassword);

// ─── Admin routes ────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     tags: [Users]
 *     summary: List all users (admin)
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
 *         name: role
 *         schema:
 *           type: string
 *           enum: [SUPER_ADMIN, MANUFACTURER]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, PENDING, ACTIVE, INACTIVE, REJECTED]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Users retrieved
 */
router.get('/', authorize(ROLES.SUPER_ADMIN), validate(listUsersQuerySchema, 'query'), userController.listUsers);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID (admin)
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
 *         description: User retrieved
 */
router.get('/:id', authorize(ROLES.SUPER_ADMIN), userController.getUserById);

/**
 * @swagger
 * /api/v1/users/{id}/status:
 *   patch:
 *     tags: [Users]
 *     summary: Update user status (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE, REJECTED, PENDING, DRAFT]
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/:id/status', authorize(ROLES.SUPER_ADMIN), validate(updateUserStatusSchema), userController.updateUserStatus);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Soft delete a user (admin)
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
 *         description: User deleted
 */
router.delete('/:id', authorize(ROLES.SUPER_ADMIN), userController.deleteUser);

export default router;
