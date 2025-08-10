import { Router } from 'express';
import { AuthController } from '../controllers/authController';

const router = Router();

// Public routes (no authentication required)
router.post('/register', AuthController.register);
router.post('/login', AuthController.passwordLogin);
router.put('/change-password', AuthController.changePassword);
router.put('/set-password', AuthController.setPasswordWithToken);

// Protected routes (authentication required)
router.get('/profile', AuthController.getProfile);
router.put('/profile', AuthController.updateProfile);

// Admin routes
router.post('/assign-tenant', AuthController.assignToTenant);
router.get('/users', AuthController.listUsers);
router.put('/users/:userId/role', AuthController.updateUserRole);
router.put('/users/:userId/deactivate', AuthController.deactivateUser);

// Development/testing routes
router.post('/generate-test-token', AuthController.generateTestToken);

export default router; 