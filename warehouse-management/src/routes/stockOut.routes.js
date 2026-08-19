const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/stockOut.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, ctrl.getAll);
router.get('/:id', authenticate, ctrl.getOne);
router.post('/', authenticate, authorize('admin', 'staff'), ctrl.create);

module.exports = router;
