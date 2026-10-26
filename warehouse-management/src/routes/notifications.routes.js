const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', ctrl.getAll);
router.get('/unread-count', ctrl.getUnreadCount);
router.post('/read-all', ctrl.markAllAsRead);
router.post('/:id/read', ctrl.markAsRead);

module.exports = router;
