const express = require('express');
const router = express.Router();
const crudFactory = require('../controllers/crudFactory');
const { authenticate, hasPermission } = require('../middleware/auth');

const ctrl = crudFactory('categories', ['name', 'description']);

router.get('/', authenticate, hasPermission('categories.view'), ctrl.getAll);
router.get('/:id', authenticate, hasPermission('categories.view'), ctrl.getOne);
router.post('/', authenticate, hasPermission('categories.create'), ctrl.create);
router.put('/:id', authenticate, hasPermission('categories.edit'), ctrl.update);
router.delete('/:id', authenticate, hasPermission('categories.delete'), ctrl.remove);

module.exports = router;

