import { Router } from 'express';
import { OrganizationProfileController } from '../controllers/organizationProfileController';

const router = Router();

/**
 * 🏢 ORGANIZATION PROFILE ROUTES
 * 
 * Comprehensive organization profile management
 */

// Get organization profile
router.get('/', OrganizationProfileController.getOrganizationProfile);

// Update organization profile
router.put('/', OrganizationProfileController.updateOrganizationProfile);

// Upload organization logo
router.post('/logo', OrganizationProfileController.uploadLogo);

// Delete organization logo
router.delete('/logo', OrganizationProfileController.deleteLogo);

// Get organization statistics
router.get('/stats', OrganizationProfileController.getOrganizationStats);

// Get available options for dropdowns
router.get('/options', OrganizationProfileController.getAvailableOptions);

export default router; 