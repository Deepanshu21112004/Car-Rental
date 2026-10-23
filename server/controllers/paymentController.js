const Stripe = require('stripe');

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

const Booking = require('../models/Booking');
const Payment = require('../models/Payment');

/*
|--------------------------------------------------------------------------
| MINIMUM PAYMENT AMOUNT
|--------------------------------------------------------------------------
|
| Application-level minimum payment.
|
| Any booking below ₹50 will be charged ₹50.
|
*/

const MINIMUM_PAYMENT_AMOUNT_INR = 50;

/*
|--------------------------------------------------------------------------
| CREATE STRIPE CHECKOUT SESSION
|--------------------------------------------------------------------------
*/

exports.checkout = async (req, res) => {
    try {
        if (!stripe) {
            return res.status(503).json({
                message: 'Stripe is not configured on the server.',
            });
        }

        const { bookingId } = req.body;

        const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

        if (!bookingId) {
            return res.status(400).json({
                message: 'Booking ID is required',
            });
        }

        const booking = await Booking.findOne({
            _id: bookingId,
            userId: req.user._id,
        }).populate('carId');

        if (!booking) {
            return res.status(404).json({
                message: 'Booking not found',
            });
        }

        /*
        |--------------------------------------------------------------------------
        | ONLY PENDING BOOKINGS CAN BE PAID
        |--------------------------------------------------------------------------
        */

        if (booking.bookingStatus !== 'Pending') {
            return res.status(400).json({
                message: 'This booking cannot be paid because it is no longer pending.',
            });
        }

        /*
        |--------------------------------------------------------------------------
        | ALREADY PAID
        |--------------------------------------------------------------------------
        */

        if (booking.paymentStatus === 'Paid') {
            return res.status(400).json({
                message: 'This booking has already been paid.',
            });
        }

        /*
        |--------------------------------------------------------------------------
        | CHECK PICKUP DEADLINE
        |--------------------------------------------------------------------------
        */

        const now = new Date();

        const pickupTime = new Date(booking.pickupDateTime);

        if (pickupTime <= now) {
            booking.bookingStatus = 'Cancelled';

            booking.paymentStatus = 'Expired';

            await booking.save();

            await Payment.findOneAndUpdate(
                {
                    bookingId: booking._id,
                },
                {
                    paymentStatus: 'Expired',
                }
            );

            return res.status(400).json({
                message: 'The payment deadline has passed. This booking has been cancelled.',

                bookingStatus: 'Cancelled',

                paymentStatus: 'Expired',
            });
        }

        /*
        |--------------------------------------------------------------------------
        | GET BOOKING AMOUNT
        |--------------------------------------------------------------------------
        */

        const originalAmount = Number(booking.totalAmount);

        if (!Number.isFinite(originalAmount) || originalAmount <= 0) {
            return res.status(400).json({
                message: 'Invalid booking payment amount.',
            });
        }

        /*
        |--------------------------------------------------------------------------
        | ROUND OFF PAYMENT
        |--------------------------------------------------------------------------
        |
        | Example:
        |
        | ₹15.67 -> ₹16
        | ₹99.25 -> ₹99
        | ₹150.50 -> ₹151
        |
        */

        const roundedAmount = Math.round(originalAmount);

        /*
        |--------------------------------------------------------------------------
        | APPLY MINIMUM PAYMENT
        |--------------------------------------------------------------------------
        |
        | Any amount below ₹50 becomes ₹50.
        |
        | ₹16 -> ₹50
        | ₹40 -> ₹50
        | ₹49 -> ₹50
        | ₹50 -> ₹50
        | ₹99 -> ₹99
        |
        */

        const payableAmount = Math.max(roundedAmount, MINIMUM_PAYMENT_AMOUNT_INR);

        /*
        |--------------------------------------------------------------------------
        | UPDATE BOOKING AMOUNT
        |--------------------------------------------------------------------------
        |
        | This ensures the amount displayed by the frontend
        | matches the actual Stripe payment amount.
        |
        */

        if (Number(booking.totalAmount) !== payableAmount) {
            booking.totalAmount = payableAmount;

            await booking.save();
        }

        /*
        |--------------------------------------------------------------------------
        | FIND EXISTING PAYMENT
        |--------------------------------------------------------------------------
        */

        let payment = await Payment.findOne({
            bookingId: booking._id,
        });

        if (!payment) {
            payment = new Payment({
                bookingId: booking._id,

                userId: req.user._id,

                amount: payableAmount,

                currency: 'inr',

                paymentStatus: 'Pending',
            });
        }

        /*
        |--------------------------------------------------------------------------
        | KEEP PAYMENT AMOUNT IN SYNC
        |--------------------------------------------------------------------------
        */

        payment.amount = payableAmount;

        payment.currency = 'inr';

        /*
        |--------------------------------------------------------------------------
        | RETRY AFTER FAILED PAYMENT
        |--------------------------------------------------------------------------
        */

        if (payment.paymentStatus === 'Failed') {
            payment.paymentStatus = 'Pending';
        }

        /*
        |--------------------------------------------------------------------------
        | CREATE STRIPE CHECKOUT SESSION
        |--------------------------------------------------------------------------
        */

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',

            payment_method_types: ['card'],

            line_items: [
                {
                    price_data: {
                        currency: 'inr',

                        product_data: {
                            name: booking.carId?.name
                                ? `Car Rental - ${booking.carId.name}`
                                : 'Car Rental Booking',
                        },

                        /*
                        |--------------------------------------------------------------------------
                        | STRIPE USES PAISE FOR INR
                        |--------------------------------------------------------------------------
                        |
                        | ₹50 = 5000 paise
                        |
                        */

                        unit_amount: payableAmount * 100,
                    },

                    quantity: 1,
                },
            ],

            customer_email: req.user.email,

            metadata: {
                bookingId: String(booking._id),

                userId: String(req.user._id),
            },

            success_url: `${clientUrl}/payment-success` + `?session_id={CHECKOUT_SESSION_ID}`,

            cancel_url: `${clientUrl}/checkout/${booking._id}?cancelled=true`,
        });

        /*
        |--------------------------------------------------------------------------
        | SAVE STRIPE INFORMATION
        |--------------------------------------------------------------------------
        */

        payment.stripeCheckoutSessionId = session.id;

        if (session.payment_intent) {
            payment.stripePaymentIntentId =
                typeof session.payment_intent === 'string'
                    ? session.payment_intent
                    : session.payment_intent.id;
        }

        /*
        |--------------------------------------------------------------------------
        | KEEP BOOKING PENDING
        |--------------------------------------------------------------------------
        */

        booking.paymentStatus = 'Pending';

        await booking.save();

        await payment.save();

        return res.status(200).json({
            message: 'Checkout session created',

            sessionId: session.id,

            url: session.url,

            amount: payableAmount,
        });
    } catch (error) {
        console.error('Stripe checkout error:', error);

        return res.status(500).json({
            message: error.message || 'Unable to create checkout session',
        });
    }
};

/*
|--------------------------------------------------------------------------
| VERIFY PAYMENT
|--------------------------------------------------------------------------
*/

exports.verifyPayment = async (req, res) => {
    try {
        if (!stripe) {
            return res.status(503).json({
                message: 'Stripe is not configured on the server.',
            });
        }

        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({
                message: 'Stripe session ID is required',
            });
        }

        /*
        |--------------------------------------------------------------------------
        | GET STRIPE SESSION
        |--------------------------------------------------------------------------
        */

        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['payment_intent'],
        });

        if (!session) {
            return res.status(404).json({
                message: 'Stripe session not found',
            });
        }

        const bookingId = session.metadata?.bookingId;

        const sessionUserId = session.metadata?.userId;

        if (!bookingId) {
            return res.status(400).json({
                message: 'Booking information is missing from Stripe session',
            });
        }

        /*
        |--------------------------------------------------------------------------
        | VERIFY SESSION OWNER
        |--------------------------------------------------------------------------
        */

        if (sessionUserId && String(sessionUserId) !== String(req.user._id)) {
            return res.status(403).json({
                message: 'This payment session does not belong to the logged-in user.',
            });
        }

        /*
        |--------------------------------------------------------------------------
        | FIND BOOKING
        |--------------------------------------------------------------------------
        */

        const booking = await Booking.findOne({
            _id: bookingId,
            userId: req.user._id,
        });

        if (!booking) {
            return res.status(404).json({
                message: 'Booking not found',
            });
        }

        /*
        |--------------------------------------------------------------------------
        | FIND OR CREATE PAYMENT
        |--------------------------------------------------------------------------
        */

        let payment = await Payment.findOne({
            bookingId: booking._id,
        });

        if (!payment) {
            payment = new Payment({
                bookingId: booking._id,

                userId: req.user._id,

                amount: Math.max(
                    Math.round(Number(booking.totalAmount)),
                    MINIMUM_PAYMENT_AMOUNT_INR
                ),

                currency: 'inr',
            });
        }

        payment.stripeCheckoutSessionId = session.id;

        /*
        |--------------------------------------------------------------------------
        | SAVE PAYMENT INTENT
        |--------------------------------------------------------------------------
        */

        if (session.payment_intent) {
            payment.stripePaymentIntentId =
                typeof session.payment_intent === 'string'
                    ? session.payment_intent
                    : session.payment_intent.id;
        }

        /*
        |--------------------------------------------------------------------------
        | PAYMENT NOT SUCCESSFUL
        |--------------------------------------------------------------------------
        */

        if (session.payment_status !== 'paid') {
            payment.paymentStatus = 'Failed';

            await payment.save();

            booking.paymentStatus = 'Failed';

            /*
            |--------------------------------------------------------------------------
            | KEEP BOOKING PENDING
            |--------------------------------------------------------------------------
            */

            if (booking.bookingStatus !== 'Cancelled') {
                booking.bookingStatus = 'Pending';
            }

            await booking.save();

            return res.status(400).json({
                message: 'Payment was not completed.',

                paymentStatus: 'Failed',

                bookingStatus: booking.bookingStatus,
            });
        }

        /*
        |--------------------------------------------------------------------------
        | CHECK PICKUP TIME AGAIN
        |--------------------------------------------------------------------------
        */

        const now = new Date();

        const pickupTime = new Date(booking.pickupDateTime);

        /*
        |--------------------------------------------------------------------------
        | PAYMENT COMPLETED AFTER DEADLINE
        |--------------------------------------------------------------------------
        */

        if (pickupTime <= now) {
            /*
            |--------------------------------------------------------------------------
            | TRY AUTOMATIC REFUND
            |--------------------------------------------------------------------------
            */

            if (payment.stripePaymentIntentId) {
                try {
                    const refund = await stripe.refunds.create({
                        payment_intent: payment.stripePaymentIntentId,
                    });

                    payment.paymentStatus = 'Refunded';

                    payment.stripeRefundId = refund.id;

                    payment.refundedAt = new Date();

                    await payment.save();

                    booking.bookingStatus = 'Cancelled';

                    booking.paymentStatus = 'Refunded';

                    await booking.save();

                    return res.status(400).json({
                        message:
                            'The booking deadline had passed, so the completed payment was automatically refunded.',

                        paymentStatus: 'Refunded',

                        bookingStatus: 'Cancelled',
                    });
                } catch (refundError) {
                    console.error('Automatic expiry refund error:', refundError);
                }
            }

            /*
            |--------------------------------------------------------------------------
            | IF REFUND FAILED
            |--------------------------------------------------------------------------
            */

            booking.bookingStatus = 'Cancelled';

            booking.paymentStatus = 'Expired';

            await booking.save();

            payment.paymentStatus = 'Expired';

            await payment.save();

            return res.status(400).json({
                message: 'Payment was completed after the booking deadline.',

                paymentStatus: 'Expired',

                bookingStatus: 'Cancelled',
            });
        }

        /*
        |--------------------------------------------------------------------------
        | IDEMPOTENT SUCCESS
        |--------------------------------------------------------------------------
        */

        if (
            booking.bookingStatus === 'Confirmed' &&
            booking.paymentStatus === 'Paid' &&
            payment.paymentStatus === 'Paid'
        ) {
            return res.status(200).json({
                message: 'Payment was already verified successfully.',

                paymentStatus: 'Paid',

                bookingStatus: 'Confirmed',
            });
        }

        /*
        |--------------------------------------------------------------------------
        | BOOKING NO LONGER PENDING
        |--------------------------------------------------------------------------
        */

        if (booking.bookingStatus !== 'Pending') {
            /*
            |--------------------------------------------------------------------------
            | CANCELLED BOOKING WITH PAYMENT
            |--------------------------------------------------------------------------
            */

            if (booking.bookingStatus === 'Cancelled' && !['Refunded', 'Partially Refunded'].includes(payment.paymentStatus)) {
                if (payment.stripePaymentIntentId) {
                    try {
                        // If checkout completes after an unpaid booking was cancelled, refund the captured amount in full.
                        const refund = await stripe.refunds.create({
                            payment_intent: payment.stripePaymentIntentId,
                        }, { idempotencyKey: `cancelled-late-payment-${booking._id}` });
                        payment.paymentStatus = 'Refunded';
                        payment.stripeRefundId = refund.id;
                        payment.refundedAmount = Number(payment.amount || booking.totalAmount || 0);
                        payment.refundStatus = refund.status === 'succeeded' ? 'Processed' : 'Pending';
                        payment.refundedAt = new Date();
                        await payment.save();
                        booking.paymentStatus = 'Refunded';
                        booking.refundStatus = payment.refundStatus;
                        await booking.save();
                        return res.status(400).json({ message: 'The booking was already cancelled, so the late payment was refunded in full.', paymentStatus: 'Refunded', bookingStatus: 'Cancelled' });
                    } catch (refundError) {
                        console.error('Cancelled booking refund error:', refundError);
                    }
                }
            }

            return res.status(400).json({
                message: 'This booking is no longer available for payment.',

                bookingStatus: booking.bookingStatus,

                paymentStatus: booking.paymentStatus,
            });
        }

        /*
        |--------------------------------------------------------------------------
        | MARK PAYMENT AS PAID
        |--------------------------------------------------------------------------
        */

        payment.paymentStatus = 'Paid';

        payment.paidAt = new Date();

        await payment.save();

        /*
        |--------------------------------------------------------------------------
        | CONFIRM BOOKING
        |--------------------------------------------------------------------------
        */

        booking.bookingStatus = 'Confirmed';

        booking.paymentStatus = 'Paid';

        await booking.save();

        return res.status(200).json({
            message: 'Payment verified successfully',

            paymentStatus: 'Paid',

            bookingStatus: 'Confirmed',
        });
    } catch (error) {
        console.error('Payment verification error:', error);

        return res.status(500).json({
            message: error.message || 'Unable to verify payment',
        });
    }
};

/*
|--------------------------------------------------------------------------
| REFUND PAYMENT
|--------------------------------------------------------------------------
*/

exports.refundPayment = async (req, res) => {
    return res.status(400).json({ message: 'Use the booking cancellation or early-return workflow so the configured refund policy is applied correctly.' });
};

/*
|--------------------------------------------------------------------------
| GET PAYMENT
|--------------------------------------------------------------------------
*/

exports.getOne = async (req, res) => {
    try {
        const payment = await Payment.findOne({
            _id: req.params.id,

            userId: req.user._id,
        });

        if (!payment) {
            return res.status(404).json({
                message: 'Payment not found',
            });
        }

        return res.status(200).json({
            payment,
        });
    } catch (error) {
        console.error('Get payment error:', error);

        return res.status(500).json({
            message: error.message || 'Unable to get payment',
        });
    }
};
