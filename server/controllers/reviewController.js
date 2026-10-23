const mongoose = require('mongoose');

const Review = require('../models/Review');
const Booking = require('../models/Booking');

exports.create = async (req, res, next) => {
    try {
        const { bookingId, rating, comment } = req.body;

        if (!bookingId) {
            return res.status(400).json({
                message: 'Booking is required.',
            });
        }

        if (!mongoose.Types.ObjectId.isValid(bookingId)) {
            return res.status(400).json({
                message: 'Invalid booking.',
            });
        }

        const numericRating = Number(rating);

        if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
            return res.status(400).json({
                message: 'Rating must be between 1 and 5.',
            });
        }

        const cleanComment = String(comment || '').trim();

        if (!cleanComment) {
            return res.status(400).json({
                message: 'Comment is required.',
            });
        }

        if (cleanComment.length < 3) {
            return res.status(400).json({
                message: 'Comment must contain at least 3 characters.',
            });
        }

        if (cleanComment.length > 1000) {
            return res.status(400).json({
                message: 'Comment cannot exceed 1000 characters.',
            });
        }

        const booking = await Booking.findOne({
            _id: bookingId,
            userId: req.user._id,
            bookingStatus: 'Completed',
        });

        if (!booking) {
            return res.status(400).json({
                message: 'A completed booking belonging to you is required.',
            });
        }

        const existingReview = await Review.findOne({
            bookingId: booking._id,
        });

        if (existingReview) {
            return res.status(409).json({
                message: 'You have already reviewed this booking.',
            });
        }

        const review = await Review.create({
            userId: req.user._id,
            carId: booking.carId,
            bookingId: booking._id,
            rating: numericRating,
            comment: cleanComment,
        });

        const populatedReview = await Review.findById(review._id)
            .populate('carId', 'name brand images')
            .populate('bookingId')
            .populate('userId', 'firstName lastName');

        return res.status(201).json({
            message: 'Review submitted successfully.',
            review: populatedReview,
        });
    } catch (error) {
        /*
         * MongoDB duplicate-key protection for bookingId.
         */
        if (error.code === 11000) {
            return res.status(409).json({
                message: 'You have already reviewed this booking.',
            });
        }

        next(error);
    }
};

/*
 * Get all reviews for one car.
 * This endpoint is public because visitors can see reviews
 * on the car details page.
 */
exports.byCar = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.carId)) {
            return res.status(400).json({
                message: 'Invalid car ID.',
            });
        }

        const reviews = await Review.find({
            carId: req.params.carId,
        })
            .populate('userId', 'firstName lastName')
            .populate('carId', 'name brand')
            .sort({ createdAt: -1 });

        return res.json({
            reviews,
        });
    } catch (error) {
        next(error);
    }
};

/*
 * Get reviews written by the currently logged-in user.
 */
exports.mine = async (req, res, next) => {
    try {
        const reviews = await Review.find({
            userId: req.user._id,
        })
            .populate('carId', 'name brand images')
            .populate('bookingId', 'pickupDateTime returnDateTime bookingStatus totalAmount')
            .sort({ createdAt: -1 });

        return res.json({
            reviews,
        });
    } catch (error) {
        next(error);
    }
};

exports.update = async (req, res, next) => {
    try {
        const update = {};

        if (req.body.rating !== undefined) {
            const numericRating = Number(req.body.rating);

            if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
                return res.status(400).json({
                    message: 'Rating must be between 1 and 5.',
                });
            }

            update.rating = numericRating;
        }

        if (req.body.comment !== undefined) {
            const cleanComment = String(req.body.comment).trim();

            if (!cleanComment) {
                return res.status(400).json({
                    message: 'Comment is required.',
                });
            }

            if (cleanComment.length < 3) {
                return res.status(400).json({
                    message: 'Comment must contain at least 3 characters.',
                });
            }

            if (cleanComment.length > 1000) {
                return res.status(400).json({
                    message: 'Comment cannot exceed 1000 characters.',
                });
            }

            update.comment = cleanComment;
        }

        const review = await Review.findOneAndUpdate(
            {
                _id: req.params.id,
                userId: req.user._id,
            },
            update,
            {
                new: true,
                runValidators: true,
            }
        )
            .populate('carId', 'name brand images')
            .populate('bookingId', 'pickupDateTime returnDateTime bookingStatus totalAmount')
            .populate('userId', 'firstName lastName');

        if (!review) {
            return res.status(404).json({
                message: 'Review not found.',
            });
        }

        return res.json({
            message: 'Review updated successfully.',
            review,
        });
    } catch (error) {
        next(error);
    }
};

exports.remove = async (req, res, next) => {
    try {
        const query =
            req.user.role === 'ADMIN'
                ? {
                      _id: req.params.id,
                  }
                : {
                      _id: req.params.id,
                      userId: req.user._id,
                  };

        const review = await Review.findOneAndDelete(query);

        if (!review) {
            return res.status(404).json({
                message: 'Review not found.',
            });
        }

        return res.json({
            message: 'Review deleted successfully.',
        });
    } catch (error) {
        next(error);
    }
};
