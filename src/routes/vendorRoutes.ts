import { Router } from 'express';
import { VendorController } from '../controllers/vendorController';

const router = Router();

// Vendor CRUD routes
router.get('/', VendorController.getAllVendors);
router.get('/stats', VendorController.getVendorStats);
router.get('/:id', VendorController.getVendorById);
router.post('/', VendorController.createVendor);
router.put('/:id', VendorController.updateVendor);
router.delete('/:id', VendorController.deleteVendor);
router.patch('/:id/toggle-status', VendorController.toggleVendorStatus);

// Contact person management routes
router.post('/:id/contact-persons', VendorController.addContactPerson);
router.put('/:id/contact-persons/:contactId', VendorController.updateContactPerson);
router.delete('/:id/contact-persons/:contactId', VendorController.deleteContactPerson);

export default router;