const router = require('express').Router();
const protect = require('../middleware/authMiddleware');
const c = require('../controllers/userController');
router.put('/profile', protect, c.profile);
module.exports = router;
