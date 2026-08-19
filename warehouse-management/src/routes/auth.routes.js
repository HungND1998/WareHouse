const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');

router.post('/login', ctrl.login);
router.post('/register', ctrl.register); // Trong thực tế nên giới hạn quyền admin mới được tạo user
router.get('/me', authenticate, ctrl.me);

module.exports = router;
