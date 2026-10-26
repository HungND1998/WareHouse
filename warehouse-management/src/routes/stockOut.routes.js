const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/stockOut.controller');
const { authenticate, hasPermission } = require('../middleware/auth');

router.get('/', authenticate, hasPermission('stock_out.view'), ctrl.getAll);
router.get('/:id', authenticate, hasPermission('stock_out.view'), ctrl.getOne);
router.post('/', authenticate, hasPermission('stock_out.create'), ctrl.create);

module.exports = router;
