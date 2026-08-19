const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/product.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/low-stock', authenticate, ctrl.lowStock);
router.get('/', authenticate, ctrl.getAll);
router.get('/:id', authenticate, ctrl.getOne);
router.post('/', authenticate, authorize('admin', 'staff'), ctrl.create);
router.put('/:id', authenticate, authorize('admin', 'staff'), ctrl.update);
router.delete('/:id', authenticate, authorize('admin'), ctrl.remove);

module.exports = router;
