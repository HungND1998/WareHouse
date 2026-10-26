const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/product.controller');
const { authenticate, hasPermission } = require('../middleware/auth');

router.get('/low-stock', authenticate, hasPermission('products.view'), ctrl.lowStock);
router.get('/', authenticate, hasPermission('products.view'), ctrl.getAll);
router.get('/:id', authenticate, hasPermission('products.view'), ctrl.getOne);
router.post('/', authenticate, hasPermission('products.create'), ctrl.create);
router.put('/:id', authenticate, hasPermission('products.edit'), ctrl.update);
router.delete('/:id', authenticate, hasPermission('products.delete'), ctrl.remove);

module.exports = router;

