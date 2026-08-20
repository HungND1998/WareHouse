const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/auth.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/login', ctrl.login);
router.post('/register', authenticate, authorize('admin'), ctrl.register);
router.get('/me', authenticate, ctrl.me);

module.exports = router;
