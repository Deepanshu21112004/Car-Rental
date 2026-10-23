const router = require('express').Router();

const controller = require('../controllers/reviewController');
const protect = require('../middleware/authMiddleware');

/*
 * Public
 * Anyone can see reviews for a car.
 */
router.get('/car/:carId', controller.byCar);

/*
 * Protected
 * Get reviews belonging to logged-in user.
 *
 * IMPORTANT:
 * This must come before /:id.
 */
router.get('/my', protect, controller.mine);

/*
 * Protected
 * Create a review for a completed booking.
 */
router.post('/', protect, controller.create);

/*
 * Protected
 * Update own review.
 */
router.put('/:id', protect, controller.update);

/*
 * Protected
 * Delete own review.
 * ADMIN can delete any review.
 */
router.delete('/:id', protect, controller.remove);

module.exports = router;
