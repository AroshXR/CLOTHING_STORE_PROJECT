const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
router.use(protect, adminOnly);
const InventoryController = require('../controllers/InventoryController');

// Dashboard stats
router.get('/stats', InventoryController.getInventoryStats);

// Search inventory items
router.get('/search', InventoryController.searchInventoryItems);

// Get items by supplier
router.get('/supplier/:supplierId', InventoryController.getItemsBySupplier);

// Inventory item routes
router.get('/', InventoryController.getAllInventoryItems);
router.get('/export-csv', InventoryController.exportCSV);
router.get('/:id', InventoryController.getInventoryItem);
router.post('/', InventoryController.createInventoryItem);
router.put('/:id', InventoryController.updateInventoryItem);
router.delete('/:id', InventoryController.deleteInventoryItem);

// Special route for quantity updates
router.patch('/:id/quantity', InventoryController.updateItemQuantity);

// Use item route - decreases quantity when items are used
router.patch('/:id/use', InventoryController.useItem);

// Check and send low stock alerts
router.post('/alerts/check', InventoryController.checkLowStockAlerts);

// CSV export/import
router.post('/import-csv', InventoryController.importCSV);

module.exports = router;
