const router = require('express').Router();
const protect = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');
const controller = require('../controllers/challanController');

router.get('/my', protect, controller.my);
router.post('/:id/dispute', protect, controller.dispute);
router.post('/:id/pay', protect, controller.createPaymentSession);
router.post('/verify-payment', protect, controller.verifyPayment);
router.get('/', protect, admin, controller.adminList);
router.post('/', protect, admin, controller.create);
router.put('/:id', protect, admin, controller.update);
module.exports = router;
