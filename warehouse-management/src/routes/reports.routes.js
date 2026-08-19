const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/inventory.controller');
const { authenticate } = require('../middleware/auth');

router.get('/dashboard', authenticate, ctrl.dashboard);

module.exports = router;
