const express = require('express');
const router = express.Router();
const crudFactory = require('../controllers/crudFactory');
const { authenticate, hasPermission } = require('../middleware/auth');

const ctrl = crudFactory('warehouses', ['name', 'address']);

router.get('/', authenticate, hasPermission('warehouses.view'), ctrl.getAll);
router.get('/:id', authenticate, hasPermission('warehouses.view'), ctrl.getOne);
router.post('/', authenticate, hasPermission('warehouses.create'), ctrl.create);
router.put('/:id', authenticate, hasPermission('warehouses.edit'), ctrl.update);
router.delete('/:id', authenticate, hasPermission('warehouses.delete'), ctrl.remove);

module.exports = router;

