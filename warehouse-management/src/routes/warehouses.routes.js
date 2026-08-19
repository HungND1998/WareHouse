const express = require('express');
const router = express.Router();
const crudFactory = require('../controllers/crudFactory');
const { authenticate, authorize } = require('../middleware/auth');

const ctrl = crudFactory('warehouses', ['name', 'address']);

router.get('/', authenticate, ctrl.getAll);
router.get('/:id', authenticate, ctrl.getOne);
router.post('/', authenticate, authorize('admin'), ctrl.create);
router.put('/:id', authenticate, authorize('admin'), ctrl.update);
router.delete('/:id', authenticate, authorize('admin'), ctrl.remove);

module.exports = router;
