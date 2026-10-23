const Stripe = require('stripe');

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

const User = require('../models/User');
const Car = require('../models/Car');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Review = require('../models/Review');

const { syncBookingLifecycle, syncPaymentStatus } = require('../utils/bookingPaymentSync');

/*
|--------------------------------------------------------------------------
| USERS
|--------------------------------------------------------------------------
*/

exports.users = async (req, res, next) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });

        res.json({ users });
    } catch (error) {
        next(error);
    }
};

/*
|--------------------------------------------------------------------------
| BLOCK / UNBLOCK USER
|--------------------------------------------------------------------------
*/

exports.blockUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                message: 'User not found',
            });
        }

        if (user.role === 'ADMIN') {
            return res.status(400).json({
                message: 'Admin accounts cannot be blocked from this screen.',
            });
        }

        user.isBlocked = !user.isBlocked;

        await user.save();

        res.json({
            user: {
                ...user.toObject(),
                password: undefined,
            },
        });
    } catch (error) {
        next(error);
    }
};

/*
|--------------------------------------------------------------------------
| SYNCHRONIZE ALL BOOKINGS
|--------------------------------------------------------------------------
*/

const syncAllBookings = async (bookings) => {
    for (const booking of bookings) {
        await syncBookingLifecycle(booking);
    }
};

/*
|--------------------------------------------------------------------------
| GET ALL BOOKINGS
|--------------------------------------------------------------------------
*/

exports.bookings = async (req, res, next) => {
    try {
        const bookings = await Booking.find()
            .populate('userId', 'firstName lastName email phone')
            .populate('carId', 'name brand model hourlyRate images')
            .sort({ createdAt: -1 });

        await syncAllBookings(bookings);

        res.json({
            bookings,
        });
    } catch (error) {
        next(error);
    }
};

/*
|--------------------------------------------------------------------------
| GET SINGLE BOOKING
|--------------------------------------------------------------------------
*/

exports.getBooking = async (req, res, next) => {
    try {
        let booking = await Booking.findById(req.params.id)
            .populate('userId', 'firstName lastName email phone')
            .populate('carId');

        if (!booking) {
            return res.status(404).json({
                message: 'Booking not found',
            });
        }

        await syncBookingLifecycle(booking);

        booking = await Booking.findById(booking._id)
            .populate('userId', 'firstName lastName email phone')
            .populate('carId');

        res.json({
            booking,
        });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({
                message: 'Invalid booking ID',
            });
        }

        next(error);
    }
};

/*
|--------------------------------------------------------------------------
| ADMIN BOOKING STATUS TRANSITIONS
|--------------------------------------------------------------------------
|
| Admin can manually move a booking from any status to any
| other supported booking status.
|
|--------------------------------------------------------------------------
*/

const allowedTransitions = {
    Pending: ['Pending', 'Confirmed', 'Active', 'Completed', 'Cancelled'],

    Confirmed: ['Pending', 'Confirmed', 'Active', 'Completed', 'Cancelled'],

    Active: ['Pending', 'Confirmed', 'Active', 'Completed', 'Cancelled'],

    Completed: ['Pending', 'Confirmed', 'Active', 'Completed', 'Cancelled'],

    Cancelled: ['Pending', 'Confirmed', 'Active', 'Completed', 'Cancelled'],
};

/*
|--------------------------------------------------------------------------
| UPDATE BOOKING
|--------------------------------------------------------------------------
*/

exports.updateBooking = async (req, res, next) => {
    try {
        const { bookingStatus } = req.body;

        const allowedStatuses = ['Pending', 'Confirmed', 'Active', 'Completed', 'Cancelled'];

        if (!bookingStatus) {
            return res.status(400).json({
                message: 'Booking status is required.',
            });
        }

        if (!allowedStatuses.includes(bookingStatus)) {
            return res.status(400).json({
                message: 'Invalid booking status.',
            });
        }

        let booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                message: 'Booking not found.',
            });
        }

        const currentBookingStatus = booking.bookingStatus;

        if (bookingStatus === 'Active' && booking.paymentStatus !== 'Paid') {
            return res.status(400).json({ message: 'Only paid bookings can become Active.' });
        }
        if (bookingStatus === 'Active' && booking.driverOption === 'Self Drive' && booking.selfDriver?.verificationStatus !== 'Verified') {
            return res.status(400).json({ message: 'Verify the self-driver and valid licence before activating the rental.' });
        }
        if (bookingStatus === 'Completed' && booking.actualReturnDateTime && booking.returnInspectionStatus !== 'Approved') {
            return res.status(400).json({ message: 'Approve the recorded return inspection before completing this booking.' });
        }

        if (!allowedTransitions[currentBookingStatus]?.includes(bookingStatus)) {
            return res.status(400).json({
                message: `Invalid status transition: ${currentBookingStatus} → ${bookingStatus}.`,
            });
        }

        if (currentBookingStatus === bookingStatus) {
            await syncPaymentStatus(booking);

            booking = await Booking.findById(booking._id)
                .populate('userId', 'firstName lastName email phone')
                .populate('carId');

            return res.json({
                message: 'Booking status is already up to date.',
                booking,
            });
        }

        /*
        |--------------------------------------------------------------------------
        | ADMIN CANCELLATION SETTLEMENT
        |--------------------------------------------------------------------------
        | A company-initiated cancellation receives a full refund where payment was
        | captured. Customer cancellation deductions are handled by /cancel.
        */
        if (bookingStatus === 'Cancelled' && ['Paid', 'Partially Refunded'].includes(booking.paymentStatus)) {
            if (!stripe) return res.status(503).json({ message: 'Stripe is not configured; paid booking was not cancelled.' });
            const payment = await Payment.findOne({ bookingId: booking._id, paymentStatus: { $in: ['Paid', 'Partially Refunded'] } });
            if (!payment) return res.status(400).json({ message: 'Payment record not found; booking was not cancelled.' });
            let paymentIntentId = payment.stripePaymentIntentId;
            if (!paymentIntentId && payment.stripeCheckoutSessionId) {
                const session = await stripe.checkout.sessions.retrieve(payment.stripeCheckoutSessionId, { expand: ['payment_intent'] });
                paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
            }
            if (!paymentIntentId) return res.status(400).json({ message: 'Stripe payment reference not found; booking was not cancelled.' });
            const remaining = Math.max(0, Number(payment.amount) - Number(payment.refundedAmount || 0));
            if (remaining > 0) {
                const refund = await stripe.refunds.create({ payment_intent: paymentIntentId, amount: Math.round(remaining * 100) }, { idempotencyKey: `admin-cancel-${booking._id}-${Math.round(remaining * 100)}` });
                payment.stripePaymentIntentId = paymentIntentId;
                payment.stripeRefundId = refund.id;
                payment.refundedAmount = Number((Number(payment.refundedAmount || 0) + remaining).toFixed(2));
                payment.refundedAt = new Date();
                payment.refundStatus = refund.status === 'succeeded' ? 'Processed' : 'Pending';
                payment.refundReason = 'company-cancellation';
                payment.paymentStatus = payment.refundedAmount >= Number(payment.amount) ? 'Refunded' : 'Partially Refunded';
                await payment.save();
                booking.refundStatus = payment.refundStatus;
                booking.paymentStatus = payment.paymentStatus;
            }
        } else if (bookingStatus === 'Cancelled' && !['Paid', 'Partially Refunded', 'Refunded'].includes(booking.paymentStatus)) {
            booking.paymentStatus = booking.paymentStatus === 'Failed' ? 'Failed' : 'Expired';
        }

        booking.bookingStatus = bookingStatus;

        await booking.save();

        await syncPaymentStatus(booking);

        const updatedBooking = await Booking.findById(booking._id)
            .populate('userId', 'firstName lastName email phone')
            .populate('carId');

        return res.json({
            message: 'Booking status updated and payment record synchronized successfully.',
            booking: updatedBooking,
        });
    } catch (error) {
        console.error('Admin booking update error:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                message: 'Invalid booking ID.',
            });
        }

        next(error);
    }
};

/*
|--------------------------------------------------------------------------
| STATISTICS
|--------------------------------------------------------------------------
*/

exports.statistics = async (req, res, next) => {
    try {
        const [cars, users, bookings, revenue] = await Promise.all([
            Car.countDocuments(),

            User.countDocuments({
                role: {
                    $ne: 'ADMIN',
                },
            }),

            Booking.countDocuments(),

            Payment.aggregate([
                {
                    $match: {
                        paymentStatus: 'Paid',
                    },
                },

                {
                    $group: {
                        _id: null,

                        total: {
                            $sum: '$amount',
                        },
                    },
                },
            ]),
        ]);

        res.json({
            cars,
            users,
            bookings,
            revenue: revenue[0]?.total || 0,
        });
    } catch (error) {
        next(error);
    }
};

/*
|--------------------------------------------------------------------------
| REVENUE
|--------------------------------------------------------------------------
*/

exports.revenue = async (req, res, next) => {
    try {
        const rows = await Payment.aggregate([
            {
                $match: {
                    paymentStatus: 'Paid',
                },
            },

            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: '%Y-%m',
                            date: '$createdAt',
                            timezone: 'Asia/Kolkata',
                        },
                    },

                    revenue: {
                        $sum: '$amount',
                    },
                },
            },

            {
                $sort: {
                    _id: 1,
                },
            },
        ]);

        res.json({
            months: rows.map((row) => ({
                month: row._id,
                revenue: row.revenue,
            })),
        });
    } catch (error) {
        next(error);
    }
};

/*
|--------------------------------------------------------------------------
| COMPLETE REPORTS
|--------------------------------------------------------------------------
*/

exports.reports = async (req, res, next) => {
    try {
        const { range = 'all' } = req.query;

        const now = new Date();

        let startDate = null;

        if (range === '7d') {
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 7);
        }

        if (range === '30d') {
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 30);
        }

        if (range === '90d') {
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 90);
        }

        if (range === 'year') {
            startDate = new Date(now.getFullYear(), 0, 1);
        }

        const bookingMatch = {};
        const paymentMatch = {};

        if (startDate) {
            bookingMatch.createdAt = {
                $gte: startDate,
            };

            paymentMatch.createdAt = {
                $gte: startDate,
            };
        }

        const [
            totalCars,
            totalCustomers,
            totalBookings,
            bookingStatuses,
            paymentStatuses,
            paymentTotals,
            monthlyRevenue,
            monthlyBookings,
        ] = await Promise.all([
            /*
            |--------------------------------------------------------------------------
            | TOTAL CARS
            |--------------------------------------------------------------------------
            */

            Car.countDocuments(),

            /*
            |--------------------------------------------------------------------------
            | TOTAL CUSTOMERS
            |--------------------------------------------------------------------------
            */

            User.countDocuments({
                role: {
                    $ne: 'ADMIN',
                },
            }),

            /*
            |--------------------------------------------------------------------------
            | TOTAL BOOKINGS
            |--------------------------------------------------------------------------
            */

            Booking.countDocuments(bookingMatch),

            /*
            |--------------------------------------------------------------------------
            | BOOKING STATUS
            |--------------------------------------------------------------------------
            */

            Booking.aggregate([
                {
                    $match: bookingMatch,
                },

                {
                    $group: {
                        _id: '$bookingStatus',

                        count: {
                            $sum: 1,
                        },
                    },
                },
            ]),

            /*
            |--------------------------------------------------------------------------
            | PAYMENT STATUS
            |--------------------------------------------------------------------------
            */

            Payment.aggregate([
                {
                    $match: paymentMatch,
                },

                {
                    $group: {
                        _id: '$paymentStatus',

                        count: {
                            $sum: 1,
                        },

                        amount: {
                            $sum: '$amount',
                        },
                    },
                },
            ]),

            /*
            |--------------------------------------------------------------------------
            | PAYMENT TOTALS
            |--------------------------------------------------------------------------
            */

            Payment.aggregate([
                {
                    $match: paymentMatch,
                },

                {
                    $group: {
                        _id: '$paymentStatus',

                        total: {
                            $sum: '$amount',
                        },
                    },
                },
            ]),

            /*
            |--------------------------------------------------------------------------
            | MONTHLY REVENUE
            |--------------------------------------------------------------------------
            */

            Payment.aggregate([
                {
                    $match: paymentMatch,
                },

                {
                    $group: {
                        _id: {
                            month: {
                                $dateToString: {
                                    format: '%Y-%m',
                                    date: '$createdAt',
                                    timezone: 'Asia/Kolkata',
                                },
                            },

                            status: '$paymentStatus',
                        },

                        total: {
                            $sum: '$amount',
                        },
                    },
                },

                {
                    $sort: {
                        '_id.month': 1,
                    },
                },
            ]),

            /*
            |--------------------------------------------------------------------------
            | MONTHLY BOOKINGS
            |--------------------------------------------------------------------------
            */

            Booking.aggregate([
                {
                    $match: bookingMatch,
                },

                {
                    $group: {
                        _id: {
                            $dateToString: {
                                format: '%Y-%m',
                                date: '$createdAt',
                                timezone: 'Asia/Kolkata',
                            },
                        },

                        bookings: {
                            $sum: 1,
                        },
                    },
                },

                {
                    $sort: {
                        _id: 1,
                    },
                },
            ]),
        ]);

        /*
        |--------------------------------------------------------------------------
        | BOOKING STATUS REPORT
        |--------------------------------------------------------------------------
        */

        const bookingStatusReport = {
            Pending: 0,
            Confirmed: 0,
            Active: 0,
            Completed: 0,
            Cancelled: 0,
        };

        bookingStatuses.forEach((item) => {
            if (item._id) {
                bookingStatusReport[item._id] = item.count;
            }
        });

        /*
        |--------------------------------------------------------------------------
        | PAYMENT STATUS REPORT
        |--------------------------------------------------------------------------
        */

        const paymentStatusReport = {
            Pending: {
                count: 0,
                amount: 0,
            },

            Paid: {
                count: 0,
                amount: 0,
            },

            Failed: {
                count: 0,
                amount: 0,
            },

            Expired: {
                count: 0,
                amount: 0,
            },

            Refunded: {
                count: 0,
                amount: 0,
            },
        };

        paymentStatuses.forEach((item) => {
            if (item._id && paymentStatusReport[item._id]) {
                paymentStatusReport[item._id] = {
                    count: item.count,
                    amount: item.amount || 0,
                };
            }
        });

        /*
        |--------------------------------------------------------------------------
        | REVENUE
        |--------------------------------------------------------------------------
        */

        let paidAmount = 0;
        let refundedAmount = 0;

        paymentTotals.forEach((item) => {
            if (item._id === 'Paid') {
                paidAmount += Number(item.total || 0);
            }

            if (item._id === 'Refunded') {
                refundedAmount += Number(item.total || 0);
            }
        });

        const grossRevenue = paidAmount + refundedAmount;

        const netRevenue = Math.max(grossRevenue - refundedAmount, 0);

        /*
        |--------------------------------------------------------------------------
        | MONTHLY DATA
        |--------------------------------------------------------------------------
        */

        const monthlyMap = {};

        monthlyRevenue.forEach((item) => {
            const month = item._id.month;
            const status = item._id.status;

            if (!monthlyMap[month]) {
                monthlyMap[month] = {
                    month,
                    grossRevenue: 0,
                    refunded: 0,
                    netRevenue: 0,
                    bookings: 0,
                };
            }

            const amount = Number(item.total || 0);

            if (status === 'Paid' || status === 'Refunded') {
                monthlyMap[month].grossRevenue += amount;
            }

            if (status === 'Refunded') {
                monthlyMap[month].refunded += amount;
            }
        });

        monthlyBookings.forEach((item) => {
            const month = item._id;

            if (!monthlyMap[month]) {
                monthlyMap[month] = {
                    month,
                    grossRevenue: 0,
                    refunded: 0,
                    netRevenue: 0,
                    bookings: 0,
                };
            }

            monthlyMap[month].bookings = item.bookings;
        });

        const months = Object.values(monthlyMap)
            .sort((a, b) => a.month.localeCompare(b.month))
            .map((item) => ({
                ...item,

                netRevenue: Math.max(item.grossRevenue - item.refunded, 0),
            }));

        /*
        |--------------------------------------------------------------------------
        | AVERAGE BOOKING VALUE
        |--------------------------------------------------------------------------
        */

        const averageBookingValue = totalBookings > 0 ? netRevenue / totalBookings : 0;

        /*
        |--------------------------------------------------------------------------
        | RESPONSE
        |--------------------------------------------------------------------------
        */

        res.json({
            range,

            summary: {
                totalCars,
                totalCustomers,
                totalBookings,

                completedBookings: bookingStatusReport.Completed,

                activeBookings: bookingStatusReport.Active,

                confirmedBookings: bookingStatusReport.Confirmed,

                pendingBookings: bookingStatusReport.Pending,

                cancelledBookings: bookingStatusReport.Cancelled,

                grossRevenue,
                refundedAmount,
                netRevenue,

                averageBookingValue,

                pendingPayments: paymentStatusReport.Pending.count,

                paidPayments: paymentStatusReport.Paid.count,

                failedPayments: paymentStatusReport.Failed.count,

                expiredPayments: paymentStatusReport.Expired.count,
            },

            bookingStatuses: bookingStatusReport,

            paymentStatuses: paymentStatusReport,

            months,
        });
    } catch (error) {
        console.error('Admin reports error:', error);

        next(error);
    }
};

/*
|--------------------------------------------------------------------------
| GET ALL PAYMENTS
|--------------------------------------------------------------------------
*/

exports.payments = async (req, res, next) => {
    try {
        const bookings = await Booking.find().sort({
            createdAt: -1,
        });

        for (const booking of bookings) {
            await syncBookingLifecycle(booking);
        }

        const payments = await Payment.find()
            .populate('userId', 'firstName lastName email phone')
            .populate({
                path: 'bookingId',

                populate: [
                    {
                        path: 'userId',
                        select: 'firstName lastName email phone',
                    },

                    {
                        path: 'carId',
                        select: 'name brand model hourlyRate images',
                    },
                ],
            })
            .sort({
                createdAt: -1,
            });

        res.json({
            payments,
        });
    } catch (error) {
        next(error);
    }
};

/*
|--------------------------------------------------------------------------
| REVIEWS
|--------------------------------------------------------------------------
*/

exports.reviews = async (req, res, next) => {
    try {
        const reviews = await Review.find()
            .populate('userId', 'firstName lastName email')
            .populate('carId', 'name brand model')
            .sort({
                createdAt: -1,
            });

        res.json({
            reviews,
        });
    } catch (error) {
        next(error);
    }
};


// Admin self-driver document verification.
exports.verifyDriver = async (req, res, next) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Booking not found.' });
        if (booking.driverOption !== 'Self Drive') return res.status(400).json({ message: 'This booking does not require self-driver verification.' });
        const { verificationStatus, verificationNote } = req.body;
        if (!['Pending', 'Verified', 'Rejected'].includes(verificationStatus)) return res.status(400).json({ message: 'Invalid verification status.' });
        if (verificationStatus === 'Rejected' && !String(verificationNote || '').trim()) return res.status(400).json({ message: 'A rejection reason is required.' });
        booking.selfDriver.verificationStatus = verificationStatus;
        booking.selfDriver.verificationNote = String(verificationNote || '').trim().slice(0, 1000);
        await booking.save();
        const updatedBooking = await Booking.findById(booking._id).populate('userId', 'firstName lastName email phone').populate('carId');
        res.json({ message: `Driver verification marked ${verificationStatus.toLowerCase()}.`, booking: updatedBooking });
    } catch (error) { next(error); }
};

exports.updateReturnInspection = async (req, res, next) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Booking not found.' });
        const { returnInspectionStatus, returnConditionNotes } = req.body;
        if (!['Approved', 'Issue Reported', 'Pending'].includes(returnInspectionStatus)) return res.status(400).json({ message: 'Invalid return inspection status.' });
        if (!booking.actualReturnDateTime) return res.status(400).json({ message: 'No actual return has been recorded for this booking.' });
        booking.returnInspectionStatus = returnInspectionStatus;
        if (returnConditionNotes !== undefined) booking.returnConditionNotes = String(returnConditionNotes).trim().slice(0, 2000);
        if (returnInspectionStatus === 'Approved') booking.bookingStatus = 'Completed';
        await booking.save();
        const updatedBooking = await Booking.findById(booking._id).populate('userId', 'firstName lastName email phone').populate('carId');
        res.json({ message: returnInspectionStatus === 'Approved' ? 'Return inspection approved; vehicle is now available for future bookings.' : `Return inspection marked ${returnInspectionStatus.toLowerCase()}.`, booking: updatedBooking });
    } catch (error) { next(error); }
};
