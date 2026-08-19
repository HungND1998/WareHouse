const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/inventory.controller');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, ctrl.getAll);
router.get('/transactions', authenticate, ctrl.getTransactions);

module.exports = router;
