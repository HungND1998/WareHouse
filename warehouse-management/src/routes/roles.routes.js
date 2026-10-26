const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/role.controller');
const { authenticate, authorize } = require('../middleware/auth');

// Endpoint cho tất cả người dùng đăng nhập để lấy danh sách quyền của mình
router.get('/my-permissions', authenticate, ctrl.getMyPermissions);

// Các endpoint quản trị vai trò & ma trận phân quyền (yêu cầu Quản trị viên)
router.use(authenticate, authorize('admin'));

router.get('/permissions', ctrl.getPermissionsMatrix);
router.get('/', ctrl.getAll);
router.post('/', ctrl.createRole);
router.get('/:id', ctrl.getOne);
router.get('/:id/permissions', ctrl.getOne);
router.put('/:id/permissions', ctrl.updatePermissions);
router.post('/:id/reset', ctrl.resetPermissions);
router.delete('/:id', ctrl.deleteRole);

module.exports = router;
