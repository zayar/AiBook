import { Router } from 'express';
import { SuperAdminController } from '../controllers/superAdminController';
import { superAdminAuth } from '../middleware/superAdminAuth';

const router = Router();

// Auth
router.post('/login', SuperAdminController.login);

// Protected
router.get('/tenants', superAdminAuth, SuperAdminController.listTenants);
router.post('/tenants', superAdminAuth, SuperAdminController.createTenant);
router.get('/tenants/:tenantId/users', superAdminAuth, SuperAdminController.listTenantUsers);
router.post('/tenants/:tenantId/admins', superAdminAuth, SuperAdminController.upsertTenantAdmin);
router.post('/users/:userId/set-password', superAdminAuth, SuperAdminController.setUserPassword);

export default router;


