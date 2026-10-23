const router = require('express').Router();

const bookingController = require('../controllers/bookingController');

const protect = require('../middleware/authMiddleware');

/*
|--------------------------------------------------------------------------
| CREATE BOOKING
|--------------------------------------------------------------------------
| POST /api/bookings
|--------------------------------------------------------------------------
*/

router.post('/', protect, bookingController.create);

/*
|--------------------------------------------------------------------------
| GET MY BOOKINGS
|--------------------------------------------------------------------------
| GET /api/bookings/my
|--------------------------------------------------------------------------
*/

router.get('/my', protect, bookingController.my);

/*
|--------------------------------------------------------------------------
| CHECK CAR AVAILABILITY
|--------------------------------------------------------------------------
| GET /api/bookings/check-availability
|--------------------------------------------------------------------------
|
| IMPORTANT:
| This route must come before /:id.
|
|--------------------------------------------------------------------------
*/

router.get('/check-availability', protect, bookingController.checkAvailability);

// Must be registered before /:id so `car` is not treated as a booking ID.
router.get('/car/:carId/slots', protect, bookingController.getCarBookedSlots);

/*
|--------------------------------------------------------------------------
| GET SINGLE BOOKING
|--------------------------------------------------------------------------
| GET /api/bookings/:id
|--------------------------------------------------------------------------
*/

router.get('/:id', protect, bookingController.getOne);

/*
|--------------------------------------------------------------------------
| CANCEL BOOKING
|--------------------------------------------------------------------------
| PUT /api/bookings/:id/cancel
|--------------------------------------------------------------------------
|
| Paid booking:
| → Stripe full refund
|
| Unpaid booking:
| → Booking cancelled
|
|--------------------------------------------------------------------------
*/

router.put('/:id/cancel', protect, bookingController.cancel);
router.post('/:id/return-early', protect, bookingController.returnEarly);

module.exports = router;
