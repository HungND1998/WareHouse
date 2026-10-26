const express = require('express');
const router = express.Router();
const crudFactory = require('../controllers/crudFactory');
const { authenticate, hasPermission } = require('../middleware/auth');

const ctrl = crudFactory('suppliers', ['name', 'phone', 'email', 'address']);

router.get('/', authenticate, hasPermission('suppliers.view'), ctrl.getAll);
router.get('/:id', authenticate, hasPermission('suppliers.view'), ctrl.getOne);
router.post('/', authenticate, hasPermission('suppliers.create'), ctrl.create);
router.put('/:id', authenticate, hasPermission('suppliers.edit'), ctrl.update);
router.delete('/:id', authenticate, hasPermission('suppliers.delete'), ctrl.remove);

module.exports = router;

