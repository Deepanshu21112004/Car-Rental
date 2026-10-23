const router = require('express').Router();

const controller = require('../controllers/authController');

const protect = require('../middleware/authMiddleware');

router.post('/register', controller.register);

router.post('/login', controller.login);

router.post('/logout', controller.logout);

router.get('/me', protect, controller.me);

router.post('/forgot-password', controller.forgotPassword);

router.post('/reset-password', controller.resetPassword);

module.exports = router;
