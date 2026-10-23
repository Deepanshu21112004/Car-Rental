const router = require('express').Router();

const paymentController = require('../controllers/paymentController');
const protect = require('../middleware/authMiddleware');

/*
|--------------------------------------------------------------------------
| CREATE CHECKOUT SESSION
|--------------------------------------------------------------------------
*/
router.post(
    '/create-checkout-session',
    protect,
    paymentController.checkout
);

/*
|--------------------------------------------------------------------------
| VERIFY PAYMENT
|--------------------------------------------------------------------------
*/
router.post(
    '/verify-payment',
    protect,
    paymentController.verifyPayment
);

/*
|--------------------------------------------------------------------------
| REFUND PAYMENT
|--------------------------------------------------------------------------
*/
router.post(
    '/refund',
    protect,
    paymentController.refundPayment
);

/*
|--------------------------------------------------------------------------
| GET PAYMENT
|--------------------------------------------------------------------------
*/
router.get(
    '/:id',
    protect,
    paymentController.getOne
);

module.exports = router;