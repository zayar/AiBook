import { Router } from 'express';
import { TenantController } from '../controllers/tenantController';

const router = Router();

// Get current tenant information
router.get('/current', TenantController.getCurrentTenant);

// Get tenant statistics
router.get('/stats', TenantController.getTenantStats);

// Update current tenant
router.put('/current', TenantController.updateTenant);

// Admin routes for tenant management
router.post('/create', TenantController.createTenant);
router.get('/list', TenantController.listTenants);

export default router; 