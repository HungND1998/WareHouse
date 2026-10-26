const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/stockIn.controller');
const { authenticate, hasPermission } = require('../middleware/auth');

router.get('/', authenticate, hasPermission('stock_in.view'), ctrl.getAll);
router.get('/:id', authenticate, hasPermission('stock_in.view'), ctrl.getOne);
router.post('/', authenticate, hasPermission('stock_in.create'), ctrl.create);

module.exports = router;
