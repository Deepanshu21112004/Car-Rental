const router = require('express').Router();
const protect = require('../middleware/authMiddleware');
const c = require('../controllers/favoriteController');

router.use(protect);
router.get('/', c.list);
router.post('/', c.toggle);
router.delete('/:carId', c.remove);

module.exports = router;
