const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/user.controller');
const { authenticate, hasPermission } = require('../middleware/auth');

router.use(authenticate, hasPermission('users.view'));

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getOne);
router.post('/', hasPermission('users.create'), ctrl.create);
router.put('/:id', hasPermission('users.edit'), ctrl.update);
router.patch('/:id/status', hasPermission('users.toggle_status'), ctrl.toggleStatus);
router.put('/:id/status', hasPermission('users.toggle_status'), ctrl.toggleStatus);
router.delete('/:id', hasPermission('users.delete'), ctrl.remove);

module.exports = router;

