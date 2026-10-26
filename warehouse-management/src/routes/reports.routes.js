const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/inventory.controller');
const { authenticate, hasPermission } = require('../middleware/auth');

router.get('/dashboard', authenticate, hasPermission('inventory.dashboard'), ctrl.dashboard);

module.exports = router;
