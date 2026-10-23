const router = require('express').Router();
const c = require('../controllers/carController');
const protect = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');

router.get('/', c.getCars);
router.get('/:id', c.getCar);
router.post('/', protect, admin, c.createCar);
router.put('/:id', protect, admin, c.updateCar);
router.delete('/:id', protect, admin, c.deleteCar);

module.exports = router;
