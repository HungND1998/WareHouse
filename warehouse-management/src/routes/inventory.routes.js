const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/inventory.controller');
const { authenticate, hasPermission } = require('../middleware/auth');

router.get('/', authenticate, hasPermission('inventory.view'), ctrl.getAll);
router.get('/transactions', authenticate, hasPermission('inventory.transactions'), ctrl.getTransactions);

module.exports = router;
