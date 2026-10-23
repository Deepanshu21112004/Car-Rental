const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Car = require('../models/Car');

const Stripe = require('stripe');

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

const { calculateHours, calculateTotal } = require('../utils/priceCalculator');

const DRIVER_CHARGE_PER_DAY = 500;

/*
|--------------------------------------------------------------------------
| MINIMUM PAYMENT AMOUNT
|--------------------------------------------------------------------------
*/

const MINIMUM_PAYMENT_AMOUNT_INR = 50;

/*
|--------------------------------------------------------------------------
| CREATE BOOKING
|--------------------------------------------------------------------------
*/

exports.create = async (req, res) => {
    try {
        const {
            carId,
            pickupLocation,
            returnLocation,
            pickupDateTime,
            returnDateTime,
            driverCharges,
            driverOption,
            selfDriver,
            acceptedPolicy,
        } = req.body;

        /*
        |--------------------------------------------------------------------------
        | REQUIRED FIELDS
        |--------------------------------------------------------------------------
        */

        if (!carId || !pickupLocation || !returnLocation || !pickupDateTime || !returnDateTime) {
            return res.status(400).json({
                message:
                    'Car, pickup location, return location, pickup time and return time are required.',
            });
        }

        if (!mongoose.isValidObjectId(carId)) return res.status(400).json({ message: 'Invalid car ID.' });

        if (acceptedPolicy !== true) {
            return res.status(400).json({ message: 'You must accept the cancellation and early-return policy before booking.' });
        }

        /*
        |--------------------------------------------------------------------------
        | FIND CAR
        |--------------------------------------------------------------------------
        */

        const car = await Car.findById(carId);

        if (!car) {
            return res.status(404).json({
                message: 'Car not found.',
            });
        }

        /*
        |--------------------------------------------------------------------------
        | CAR AVAILABILITY
        |--------------------------------------------------------------------------
        */

        if (!car.isAvailable) {
            return res.status(400).json({
                message: 'This car is currently unavailable.',
            });
        }

        /*
        |--------------------------------------------------------------------------
        | DATE OBJECTS
        |--------------------------------------------------------------------------
        */

        const pickup = new Date(pickupDateTime);

        const returnTime = new Date(returnDateTime);

        const now = new Date();

        /*
        |--------------------------------------------------------------------------
        | DATE VALIDATION
        |--------------------------------------------------------------------------
        */

        if (Number.isNaN(pickup.getTime()) || Number.isNaN(returnTime.getTime())) {
            return res.status(400).json({
                message: 'Invalid pickup or return date.',
            });
        }

        /*
        |--------------------------------------------------------------------------
        | PICKUP MUST BE FUTURE
        |--------------------------------------------------------------------------
        */

        if (pickup <= now) {
            return res.status(400).json({
                message: 'Pickup time must be in the future.',
            });
        }

        /*
        |--------------------------------------------------------------------------
        | RETURN MUST BE AFTER PICKUP
        |--------------------------------------------------------------------------
        */

        if (returnTime <= pickup) {
            return res.status(400).json({
                message: 'Return time must be after pickup time.',
            });
        }

        /*
        |--------------------------------------------------------------------------
        | EXACT RENTAL HOURS
        |--------------------------------------------------------------------------
        */

        const hours = calculateHours(pickup, returnTime);

        if (!Number.isFinite(hours) || hours <= 0) {
            return res.status(400).json({
                message: 'Invalid rental duration.',
            });
        }

        /*
        |--------------------------------------------------------------------------
        | CAR HOURLY RATE
        |--------------------------------------------------------------------------
        */

        const rate = Number(car.hourlyRate);

        if (!Number.isFinite(rate) || rate <= 0) {
            return res.status(400).json({
                message: 'Invalid car hourly rate.',
            });
        }

        /*
        |--------------------------------------------------------------------------
        | DRIVER CHARGES
        |--------------------------------------------------------------------------
        */

        const selectedDriverOption = driverOption || (Number(driverCharges) > 0 ? 'With Driver' : 'Self Drive');
        if (!['Self Drive', 'With Driver'].includes(selectedDriverOption)) {
            return res.status(400).json({ message: 'Please select Self Drive or With Driver.' });
        }
        // Driver service is charged per started 24-hour rental day, minimum one day.
        // The server computes this amount; the client-submitted amount is never trusted.
        const rentalDays = Math.max(1, Math.ceil(hours / 24));
        const expectedDriverCharge = selectedDriverOption === 'With Driver' ? rentalDays * DRIVER_CHARGE_PER_DAY : 0;
        const submittedDriverCharge = Number(driverCharges);
        if (!Number.isFinite(submittedDriverCharge) || submittedDriverCharge < 0) {
            return res.status(400).json({ message: 'Invalid driver charges.' });
        }
        if (submittedDriverCharge !== expectedDriverCharge) {
            return res.status(400).json({ message: `Driver charges must be ₹${expectedDriverCharge} for ${rentalDays} rental day(s) at ₹${DRIVER_CHARGE_PER_DAY} per day. Please refresh the booking total.` });
        }
        const driver = expectedDriverCharge;
        const driverDetails = selfDriver || {};
        if (selectedDriverOption === 'Self Drive') {
            const required = ['fullName', 'phone', 'dateOfBirth', 'licenceNumber', 'licenceExpiry', 'address'];
            const missing = required.filter((key) => !String(driverDetails[key] || '').trim());
            if (missing.length) {
                return res.status(400).json({ message: 'Self-driver details are required: full name, phone, date of birth, licence number, licence expiry and address.' });
            }
            const dob = new Date(driverDetails.dateOfBirth);
            const expiry = new Date(driverDetails.licenceExpiry);
            if (Number.isNaN(dob.getTime()) || Number.isNaN(expiry.getTime())) {
                return res.status(400).json({ message: 'Enter valid date of birth and licence expiry dates.' });
            }
            const age = (now.getTime() - dob.getTime()) / (365.2425 * 24 * 60 * 60 * 1000);
            if (age < 18) return res.status(400).json({ message: 'The self-driver must be at least 18 years old. Follow the applicable local licence and rental eligibility rules.' });
            if (expiry <= pickup) return res.status(400).json({ message: 'The driving licence must remain valid through the scheduled pickup time.' });
            if (!/^[+0-9()\s-]{8,20}$/.test(String(driverDetails.phone).trim())) return res.status(400).json({ message: 'Enter a valid driver phone number.' });
            if (String(driverDetails.licenceNumber).trim().length < 5) return res.status(400).json({ message: 'Enter a valid driving licence number.' });
        }
        if (selectedDriverOption === 'Self Drive' && driver !== 0) {
            return res.status(400).json({ message: 'Self Drive must not include driver charges.' });
        }

        /*
        |--------------------------------------------------------------------------
        | CALCULATE FINAL AMOUNT
        |--------------------------------------------------------------------------
        */

        const calculatedAmount = calculateTotal(hours, rate, driver);

        if (!Number.isFinite(calculatedAmount) || calculatedAmount <= 0) {
            return res.status(400).json({
                message: 'Unable to calculate booking amount.',
            });
        }

        /*
        |--------------------------------------------------------------------------
        | ROUND OFF FINAL PAYMENT
        |--------------------------------------------------------------------------
        |
        | Example:
        |
        | ₹15.67 -> ₹16
        | ₹99.25 -> ₹99
        | ₹150.50 -> ₹151
        |
        */

        const roundedAmount = Math.round(calculatedAmount);

        /*
        |--------------------------------------------------------------------------
        | APPLY MINIMUM PAYMENT
        |--------------------------------------------------------------------------
        |
        | Any booking below ₹50 is charged ₹50.
        |
        | ₹16 -> ₹50
        | ₹40 -> ₹50
        | ₹49 -> ₹50
        | ₹50 -> ₹50
        | ₹99 -> ₹99
        |
        */

        const amount = Math.max(roundedAmount, MINIMUM_PAYMENT_AMOUNT_INR);

        /*
        |--------------------------------------------------------------------------
        | CHECK BOOKING CONFLICT
        |--------------------------------------------------------------------------
        */

        const conflict = await Booking.findOne({
            carId,

            bookingStatus: { $in: ['Pending', 'Confirmed', 'Active'] },
            pickupDateTime: { $lt: returnTime },
            returnDateTime: { $gt: pickup },
            // An unpaid pending reservation is no longer a hold after its pickup time passes.
            $or: [
                { bookingStatus: { $in: ['Confirmed', 'Active'] } },
                { bookingStatus: 'Pending', pickupDateTime: { $gt: now } },
            ],
        });

        if (conflict) {
            return res.status(409).json({
                message: 'This car is already booked for the selected time.',
            });
        }

        /*
        |--------------------------------------------------------------------------
        | CREATE BOOKING
        |--------------------------------------------------------------------------
        */

        const booking = await Booking.create({
            carId,

            userId: req.user._id,

            pickupLocation: String(pickupLocation).trim(),

            returnLocation: String(returnLocation).trim(),

            pickupDateTime: pickup,

            returnDateTime: returnTime,

            totalHours: hours,

            carRate: rate,

            driverCharges: driver,
            driverOption: selectedDriverOption,
            policyAccepted: true,
            policyAcceptedAt: new Date(),
            cancellationPolicyVersion: '2026-10-v1',
            selfDriver: selectedDriverOption === 'Self Drive' ? {
                fullName: String(driverDetails.fullName).trim(),
                phone: String(driverDetails.phone).trim(),
                dateOfBirth: new Date(driverDetails.dateOfBirth),
                licenceNumber: String(driverDetails.licenceNumber).trim(),
                licenceExpiry: new Date(driverDetails.licenceExpiry),
                address: String(driverDetails.address).trim(),
                verificationStatus: 'Pending',
            } : { verificationStatus: 'Not Required' },

            /*
                |--------------------------------------------------------------------------
                | STORE FINAL PAYABLE AMOUNT
                |--------------------------------------------------------------------------
                */

            totalAmount: amount,

            bookingStatus: 'Pending',

            paymentStatus: 'Pending',
        });

        /*
        |--------------------------------------------------------------------------
        | RESPONSE
        |--------------------------------------------------------------------------
        */

        return res.status(201).json({
            message: 'Booking created successfully.',

            booking,
        });
    } catch (error) {
        console.error('Create booking error:', error);

        return res.status(500).json({
            message: error.message || 'Unable to create booking',
        });
    }
};

/*
|--------------------------------------------------------------------------
| GET MY BOOKINGS
|--------------------------------------------------------------------------
*/

exports.my = async (req, res) => {
    try {
        const now = new Date();

        /*
        |--------------------------------------------------------------------------
        | EXPIRE UNPAID BOOKINGS
        |--------------------------------------------------------------------------
        */

        await Booking.updateMany(
            {
                userId: req.user._id,

                bookingStatus: 'Pending',

                paymentStatus: 'Pending',

                pickupDateTime: {
                    $lte: now,
                },
            },
            {
                $set: {
                    bookingStatus: 'Cancelled',

                    paymentStatus: 'Expired',
                },
            }
        );

        /*
        |--------------------------------------------------------------------------
        | CONFIRMED → ACTIVE
        |--------------------------------------------------------------------------
        */

        await Booking.updateMany(
            {
                userId: req.user._id,

                bookingStatus: 'Confirmed',

                paymentStatus: 'Paid',

                pickupDateTime: {
                    $lte: now,
                },

                returnDateTime: {
                    $gt: now,
                },
                $or: [
                    { driverOption: { $ne: 'Self Drive' } },
                    { 'selfDriver.verificationStatus': 'Verified' },
                ],
            },
            {
                $set: {
                    bookingStatus: 'Active',
                },
            }
        );

        /*
        |--------------------------------------------------------------------------
        | ACTIVE → COMPLETED
        |--------------------------------------------------------------------------
        */

        await Booking.updateMany(
            {
                userId: req.user._id,

                bookingStatus: {
                    $in: ['Confirmed', 'Active'],
                },

                paymentStatus: 'Paid',

                returnDateTime: {
                    $lte: now,
                },
                $or: [
                    { actualReturnDateTime: null },
                    { returnInspectionStatus: 'Approved' },
                ],
            },
            {
                $set: {
                    bookingStatus: 'Completed',
                },
            }
        );

        /*
        |--------------------------------------------------------------------------
        | GET BOOKINGS
        |--------------------------------------------------------------------------
        */

        const bookings = await Booking.find({
            userId: req.user._id,
        })
            .populate('carId')
            .sort({
                createdAt: -1,
            });

        return res.status(200).json({
            bookings,
        });
    } catch (error) {
        console.error('My bookings error:', error);

        return res.status(500).json({
            message: error.message || 'Unable to get bookings',
        });
    }
};

/*
|--------------------------------------------------------------------------
| GET SINGLE BOOKING
|--------------------------------------------------------------------------
*/

exports.getOne = async (req, res) => {
    try {
        const booking = await Booking.findOne({
            _id: req.params.id,

            userId: req.user._id,
        })
            .populate('carId')
            .populate('userId', '-password');

        if (!booking) {
            return res.status(404).json({
                message: 'Booking not found.',
            });
        }

        const now = new Date();

        /*
        |--------------------------------------------------------------------------
        | PENDING → EXPIRED
        |--------------------------------------------------------------------------
        */

        if (
            booking.bookingStatus === 'Pending' &&
            booking.paymentStatus === 'Pending' &&
            new Date(booking.pickupDateTime) <= now
        ) {
            booking.bookingStatus = 'Cancelled';

            booking.paymentStatus = 'Expired';

            await booking.save();
        } else if (
            booking.bookingStatus === 'Confirmed' &&
            booking.paymentStatus === 'Paid' &&
            new Date(booking.returnDateTime) <= now &&
            (!booking.actualReturnDateTime || booking.returnInspectionStatus === 'Approved')
        ) {
            /*
            |--------------------------------------------------------------------------
            | CONFIRMED → COMPLETED
            |--------------------------------------------------------------------------
            */

            booking.bookingStatus = 'Completed';

            await booking.save();
        } else if (
            booking.bookingStatus === 'Confirmed' &&
            booking.paymentStatus === 'Paid' &&
            new Date(booking.pickupDateTime) <= now &&
            (booking.driverOption !== 'Self Drive' || booking.selfDriver?.verificationStatus === 'Verified')
        ) {
            /*
            |--------------------------------------------------------------------------
            | CONFIRMED → ACTIVE
            |--------------------------------------------------------------------------
            */

            booking.bookingStatus = 'Active';

            await booking.save();
        }

        return res.status(200).json({
            booking,
        });
    } catch (error) {
        console.error('Get booking error:', error);

        if (error.name === 'CastError') {
            return res.status(400).json({
                message: 'Invalid booking ID.',
            });
        }

        return res.status(500).json({
            message: error.message || 'Unable to get booking',
        });
    }
};

/*
|--------------------------------------------------------------------------
| CHECK CAR AVAILABILITY
|--------------------------------------------------------------------------
*/

exports.getCarBookedSlots = async (req, res) => {
    try {
        const { carId } = req.params;
        if (!mongoose.isValidObjectId(carId)) {
            return res.status(400).json({ message: 'Invalid car ID.' });
        }

        const car = await Car.findById(carId).select('_id');
        if (!car) return res.status(404).json({ message: 'Car not found.' });

        const now = new Date();
        await Booking.updateMany(
            { carId, bookingStatus: 'Pending', paymentStatus: 'Pending', pickupDateTime: { $lte: now } },
            { $set: { bookingStatus: 'Cancelled', paymentStatus: 'Expired' } }
        );
        const bookings = await Booking.find({
            carId,
            bookingStatus: { $in: ['Pending', 'Confirmed', 'Active'] },
            returnDateTime: { $gt: now },
        })
            .select('pickupDateTime returnDateTime bookingStatus')
            .sort({ pickupDateTime: 1 })
            .lean();

        return res.status(200).json({
            slots: bookings.map(({ pickupDateTime, returnDateTime, bookingStatus }) => ({
                pickupDateTime,
                returnDateTime,
                bookingStatus,
            })),
        });
    } catch (error) {
        console.error('Get booked car slots error:', error);
        return res.status(500).json({ message: 'Unable to load booked time slots.' });
    }
};

exports.checkAvailability = async (req, res) => {
    try {
        const { carId, pickupDateTime, returnDateTime } = req.query;

        if (!carId || !pickupDateTime || !returnDateTime) {
            return res.status(400).json({
                message: 'Car ID, pickup time and return time are required.',
            });
        }

        const pickup = new Date(pickupDateTime);

        const returnTime = new Date(returnDateTime);

        if (Number.isNaN(pickup.getTime()) || Number.isNaN(returnTime.getTime())) {
            return res.status(400).json({
                message: 'Invalid pickup or return date.',
            });
        }

        if (pickup <= new Date()) {
            return res.status(400).json({
                message: 'Pickup time must be in the future.',
            });
        }

        if (returnTime <= pickup) {
            return res.status(400).json({
                message: 'Return time must be after pickup time.',
            });
        }

        /*
        |--------------------------------------------------------------------------
        | EXACT DURATION CHECK
        |--------------------------------------------------------------------------
        */

        const hours = calculateHours(pickup, returnTime);

        if (!Number.isFinite(hours) || hours <= 0) {
            return res.status(400).json({
                message: 'Invalid rental duration.',
            });
        }

        const car = await Car.findById(carId);

        if (!car) {
            return res.status(404).json({
                message: 'Car not found.',
            });
        }

        if (!car.isAvailable) {
            return res.json({
                available: false,

                message: 'This car is currently unavailable.',
            });
        }

        const conflict = await Booking.findOne({
            carId,

            bookingStatus: { $in: ['Pending', 'Confirmed', 'Active'] },
            pickupDateTime: { $lt: returnTime },
            returnDateTime: { $gt: pickup },
            // An unpaid pending reservation is no longer a hold after its pickup time passes.
            $or: [
                { bookingStatus: { $in: ['Confirmed', 'Active'] } },
                { bookingStatus: 'Pending', pickupDateTime: { $gt: new Date() } },
            ],
        });

        return res.status(200).json({
            available: !conflict,

            message: conflict
                ? 'Car is not available for the selected time.'
                : 'Car is available for the selected time.',
        });
    } catch (error) {
        console.error('Check availability error:', error);

        return res.status(500).json({
            message: error.message || 'Unable to check car availability.',
        });
    }
};

/*
|--------------------------------------------------------------------------
| CANCEL BOOKING + REFUND
|--------------------------------------------------------------------------
*/

const getCancellationDeductionPercent = (millisecondsBeforePickup) => {
    const hours = millisecondsBeforePickup / (60 * 60 * 1000);
    if (hours > 48) return 0;
    if (hours >= 24) return 5;
    if (hours >= 6) return 10;
    if (hours >= 2) return 15;
    return 25;
};

const refundStripePayment = async ({ payment, booking, refundAmount, reason }) => {
    if (!stripe) throw new Error('Stripe is not configured. Please contact support to resolve this refund.');
    let paymentIntentId = payment.stripePaymentIntentId;
    if (!paymentIntentId && payment.stripeCheckoutSessionId) {
        const session = await stripe.checkout.sessions.retrieve(payment.stripeCheckoutSessionId, { expand: ['payment_intent'] });
        if (session.payment_intent) {
            paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id;
            payment.stripePaymentIntentId = paymentIntentId;
        }
    }
    if (!paymentIntentId) throw new Error('Stripe payment reference was not found; no booking changes were made.');
    const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: Math.round(refundAmount * 100),
        reason: 'requested_by_customer',
        metadata: { bookingId: String(booking._id), refundReason: reason },
    }, { idempotencyKey: `${reason}-${booking._id}-${Math.round(refundAmount * 100)}` });
    payment.stripeRefundId = refund.id;
    payment.refundedAmount = Number(((payment.refundedAmount || 0) + refundAmount).toFixed(2));
    payment.refundedAt = new Date();
    payment.refundStatus = refund.status === 'succeeded' ? 'Processed' : 'Pending';
    payment.refundReason = reason;
    payment.paymentStatus = payment.refundedAmount >= Number(payment.amount) ? 'Refunded' : 'Partially Refunded';
    await payment.save();
    return refund;
};

/* Cancellation policy: >48h 0%, 24-48h 5%, 6-24h 10%, 2-6h 15%, <2h 25%. */
exports.cancel = async (req, res) => {
    try {
        const booking = await Booking.findOne({ _id: req.params.id, userId: req.user._id });
        if (!booking) return res.status(404).json({ message: 'Booking not found.' });
        if (!['Pending', 'Confirmed'].includes(booking.bookingStatus)) return res.status(400).json({ message: 'Only pending or confirmed bookings can be cancelled before pickup.' });
        const now = new Date();
        const msBeforePickup = new Date(booking.pickupDateTime).getTime() - now.getTime();
        if (msBeforePickup <= 0) return res.status(400).json({ message: 'Booking cannot be cancelled after the pickup time. Use the return/termination process if the rental has started.' });

        if (booking.paymentStatus !== 'Paid') {
            booking.bookingStatus = 'Cancelled';
            booking.paymentStatus = booking.paymentStatus === 'Failed' ? 'Failed' : 'Expired';
            booking.cancellationDeductionAmount = 0;
            booking.refundStatus = 'Not Applicable';
            await booking.save();
            await Payment.updateMany({ bookingId: booking._id, userId: req.user._id, paymentStatus: 'Pending' }, { $set: { paymentStatus: 'Expired' } });
            return res.status(200).json({ message: 'Unpaid booking cancelled successfully. No refund was needed.', booking, deductionPercent: 0, deductionAmount: 0, refundAmount: 0 });
        }

        const payment = await Payment.findOne({ bookingId: booking._id, userId: req.user._id, paymentStatus: { $in: ['Paid', 'Partially Refunded'] } });
        if (!payment) return res.status(400).json({ message: 'Paid payment record not found. Booking was not cancelled.' });
        const percent = getCancellationDeductionPercent(msBeforePickup);
        const alreadyRefunded = Number(payment.refundedAmount || 0);
        const deductionAmount = Math.round(Number(booking.totalAmount) * percent) / 100;
        const targetRefund = Math.min(Math.max(0, Number(booking.totalAmount) - deductionAmount - alreadyRefunded), Math.max(0, Number(payment.amount) - alreadyRefunded));
        if (targetRefund > 0) {
            await refundStripePayment({ payment, booking, refundAmount: targetRefund, reason: 'booking-cancellation' });
        }
        booking.bookingStatus = 'Cancelled';
        booking.cancellationDeductionAmount = deductionAmount;
        booking.refundStatus = targetRefund > 0 ? (payment.refundStatus === 'Processed' ? 'Processed' : 'Pending') : 'Not Applicable';
        booking.paymentStatus = Number(payment.refundedAmount || 0) >= Number(payment.amount) ? 'Refunded' : (targetRefund > 0 ? 'Partially Refunded' : 'Paid');
        await booking.save();
        return res.status(200).json({
            message: targetRefund > 0 ? 'Booking cancelled. The policy-based refund has been submitted to Stripe.' : 'Booking cancelled. No refund is due under the cancellation policy.',
            booking,
            deductionPercent: percent,
            deductionAmount,
            refundAmount: targetRefund,
            refundStatus: booking.refundStatus,
        });
    } catch (error) {
        console.error('Cancel booking / refund error:', error);
        return res.status(500).json({ message: error.message || 'Unable to cancel booking and process refund.' });
    }
};

/* Early return is recorded with actual handover/inspection details. Eligible unused time is refunded. */
exports.returnEarly = async (req, res) => {
    try {
        const booking = await Booking.findOne({ _id: req.params.id, userId: req.user._id });
        if (!booking) return res.status(404).json({ message: 'Booking not found.' });
        if (booking.bookingStatus !== 'Active') return res.status(400).json({ message: 'Early return is available only while a paid booking is active.' });
        if (booking.actualReturnDateTime) return res.status(409).json({ message: 'The actual return has already been recorded.' });
        const actualReturn = req.body.actualReturnDateTime ? new Date(req.body.actualReturnDateTime) : new Date();
        if (Number.isNaN(actualReturn.getTime())) return res.status(400).json({ message: 'Enter a valid actual return date and time.' });
        const pickup = new Date(booking.pickupDateTime);
        const scheduledReturn = new Date(booking.returnDateTime);
        const now = new Date();
        if (actualReturn > now) return res.status(400).json({ message: 'Actual return time cannot be in the future.' });
        if (actualReturn <= pickup) return res.status(400).json({ message: 'Actual return must be after pickup.' });
        if (actualReturn >= scheduledReturn) return res.status(400).json({ message: 'This is not an early return. Use the normal return process.' });
        const odometer = req.body.returnOdometer === '' || req.body.returnOdometer == null ? null : Number(req.body.returnOdometer);
        if (odometer !== null && (!Number.isFinite(odometer) || odometer < 0)) return res.status(400).json({ message: 'Odometer reading must be a non-negative number.' });
        const originalDurationMs = scheduledReturn - pickup;
        const usedDurationMs = actualReturn - pickup;
        const originalRentalValue = Math.max(0, Number(booking.totalAmount) - Number(booking.driverCharges || 0));
        const earnedRentalValue = Math.round((originalRentalValue * usedDurationMs / originalDurationMs) * 100) / 100;
        const earnedAmount = earnedRentalValue + Number(booking.driverCharges || 0);
        const refundAmount = Math.max(0, Math.round((Number(booking.totalAmount) - earnedAmount) * 100) / 100);
        let payment = null;
        if (booking.paymentStatus === 'Paid' && refundAmount > 0) {
            payment = await Payment.findOne({ bookingId: booking._id, userId: req.user._id, paymentStatus: { $in: ['Paid', 'Partially Refunded'] } });
            if (!payment) return res.status(400).json({ message: 'Payment record not found; return has not been finalized.' });
            await refundStripePayment({ payment, booking, refundAmount: Math.min(refundAmount, Number(payment.amount) - Number(payment.refundedAmount || 0)), reason: 'early-return' });
        }
        booking.actualReturnDateTime = actualReturn;
        booking.returnOdometer = odometer;
        booking.returnFuelLevel = String(req.body.returnFuelLevel || '').trim().slice(0, 100);
        booking.returnConditionNotes = String(req.body.returnConditionNotes || '').trim().slice(0, 2000);
        booking.earlyReturnRefundAmount = refundAmount;
        booking.returnInspectionStatus = 'Pending';
        booking.refundStatus = refundAmount > 0 ? (payment?.refundStatus || 'Pending') : 'Not Applicable';
        // Keep the car unavailable until an admin approves the return inspection.
        if (payment) booking.paymentStatus = payment.paymentStatus;
        await booking.save();
        return res.status(200).json({ message: refundAmount > 0 ? 'Early return recorded and eligible refund submitted. The vehicle remains unavailable until staff approve the return inspection.' : 'Early return recorded. The vehicle remains unavailable until staff approve the return inspection.', booking, refundAmount, refundStatus: booking.refundStatus });
    } catch (error) {
        console.error('Early return error:', error);
        return res.status(500).json({ message: error.message || 'Unable to record early return.' });
    }
};
