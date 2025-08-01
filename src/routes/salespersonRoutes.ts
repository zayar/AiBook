import { Router } from 'express';
import SalespersonController from '../controllers/salespersonController';
import { authMiddleware } from '../middleware/authMiddleware';
import { tenantMiddleware } from '../middleware/tenantMiddleware';

const router = Router();

// Apply middleware to all salesperson routes
router.use(authMiddleware);
router.use(tenantMiddleware);

/**
 * 👥 SALESPERSON MANAGEMENT ROUTES
 * 
 * GET    /salespeople              - Get all salespeople with filtering
 * POST   /salespeople              - Create new salesperson
 * GET    /salespeople/:id          - Get salesperson by ID
 * PUT    /salespeople/:id          - Update salesperson
 * DELETE /salespeople/:id          - Delete/deactivate salesperson
 * PATCH  /salespeople/:id/toggle   - Toggle salesperson status
 * GET    /salespeople/:id/performance - Get salesperson performance metrics
 */

// CRUD operations
router.get('/', (req, res) => SalespersonController.getSalespeople(req, res));
router.post('/', (req, res) => SalespersonController.createSalesperson(req, res));
router.get('/:id', (req, res) => SalespersonController.getSalespersonById(req, res));
router.put('/:id', (req, res) => SalespersonController.updateSalesperson(req, res));
router.delete('/:id', (req, res) => SalespersonController.deleteSalesperson(req, res));

// Status management
router.patch('/:id/toggle', (req, res) => SalespersonController.toggleSalespersonStatus(req, res));

// Performance metrics
router.get('/:id/performance', (req, res) => SalespersonController.getSalespersonPerformance(req, res));

export default router;