const router = require('express').Router();

const protect = require('../middleware/authMiddleware');
const admin = require('../middleware/adminMiddleware');
const controller = require('../controllers/adminController');

router.use(protect, admin);

/*
|--------------------------------------------------------------------------
| USERS
|--------------------------------------------------------------------------
*/

router.get('/users', controller.users);

router.put('/users/:id/block', controller.blockUser);

/*
|--------------------------------------------------------------------------
| BOOKINGS
|--------------------------------------------------------------------------
*/

router.get('/bookings', controller.bookings);

router.get('/bookings/:id', controller.getBooking);
router.put('/bookings/:id/driver-verification', controller.verifyDriver);
router.put('/bookings/:id/return-inspection', controller.updateReturnInspection);

router.put('/bookings/:id', controller.updateBooking);

/*
|--------------------------------------------------------------------------
| DASHBOARD STATISTICS
|--------------------------------------------------------------------------
*/

router.get('/statistics', controller.statistics);

/*
|--------------------------------------------------------------------------
| OLD REVENUE ENDPOINT
|--------------------------------------------------------------------------
*/

router.get('/revenue', controller.revenue);

/*
|--------------------------------------------------------------------------
| COMPLETE REPORTS
|--------------------------------------------------------------------------
*/

router.get('/reports', controller.reports);

/*
|--------------------------------------------------------------------------
| PAYMENTS
|--------------------------------------------------------------------------
*/

router.get('/payments', controller.payments);

/*
|--------------------------------------------------------------------------
| REVIEWS
|--------------------------------------------------------------------------
*/

router.get('/reviews', controller.reviews);

module.exports = router;
