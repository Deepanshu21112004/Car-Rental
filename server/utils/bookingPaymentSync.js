const Payment = require('../models/Payment');

/**
 * Keep the Payment document and Booking.paymentStatus synchronized.
 *
 * Booking.paymentStatus is treated as the source of truth because
 * Stripe/payment controllers update the booking after a payment event.
 */
exports.syncPaymentStatus = async (booking) => {
    if (!booking?._id) {
        return null;
    }

    const payment = await Payment.findOne({
        bookingId: booking._id,
    });

    if (!payment) {
        return null;
    }

    if (payment.paymentStatus !== booking.paymentStatus) {
        payment.paymentStatus = booking.paymentStatus;

        if (booking.paymentStatus === 'Paid' && !payment.paidAt) {
            payment.paidAt = new Date();
        }

        await payment.save();
    }

    return payment;
};

/**
 * Apply automatic booking lifecycle rules.
 *
 * IMPORTANT:
 * This function only performs automatic transitions based on
 * payment/date conditions. It must never turn an unpaid booking
 * into a paid booking.
 */
exports.syncBookingLifecycle = async (booking) => {
    if (!booking?._id) {
        return booking;
    }

    const now = new Date();

    const pickupTime = new Date(booking.pickupDateTime);
    const returnTime = new Date(booking.returnDateTime);

    let changed = false;

    /*
    |--------------------------------------------------------------------------
    | PAID PENDING BOOKING -> CONFIRMED
    |--------------------------------------------------------------------------
    */

    if (booking.bookingStatus === 'Pending' && booking.paymentStatus === 'Paid') {
        booking.bookingStatus = 'Confirmed';
        changed = true;
    }

    /*
    |--------------------------------------------------------------------------
    | REFUNDED PAYMENT -> CANCELLED
    |--------------------------------------------------------------------------
    */

    if (booking.paymentStatus === 'Refunded' && booking.bookingStatus !== 'Cancelled') {
        booking.bookingStatus = 'Cancelled';
        changed = true;
    }

    /*
    |--------------------------------------------------------------------------
    | EXPIRED PAYMENT -> CANCELLED
    |--------------------------------------------------------------------------
    */

    if (booking.paymentStatus === 'Expired' && booking.bookingStatus !== 'Cancelled') {
        booking.bookingStatus = 'Cancelled';
        changed = true;
    }

    /*
    |--------------------------------------------------------------------------
    | UNPAID / FAILED BOOKING REACHES PICKUP TIME
    |--------------------------------------------------------------------------
    */

    if (
        booking.bookingStatus === 'Pending' &&
        ['Pending', 'Failed'].includes(booking.paymentStatus) &&
        pickupTime <= now
    ) {
        booking.bookingStatus = 'Cancelled';
        booking.paymentStatus = 'Expired';
        changed = true;
    }

    /*
    |--------------------------------------------------------------------------
    | CONFIRMED -> ACTIVE
    |--------------------------------------------------------------------------
    */

    if (
        booking.bookingStatus === 'Confirmed' &&
        booking.paymentStatus === 'Paid' &&
        pickupTime <= now &&
        returnTime > now &&
        (booking.driverOption !== 'Self Drive' || booking.selfDriver?.verificationStatus === 'Verified')
    ) {
        booking.bookingStatus = 'Active';
        changed = true;
    }

    /*
    |--------------------------------------------------------------------------
    | CONFIRMED / ACTIVE -> COMPLETED
    |--------------------------------------------------------------------------
    */

    if (
        ['Confirmed', 'Active'].includes(booking.bookingStatus) &&
        booking.paymentStatus === 'Paid' &&
        returnTime <= now &&
        (!booking.actualReturnDateTime || booking.returnInspectionStatus === 'Approved')
    ) {
        booking.bookingStatus = 'Completed';
        changed = true;
    }

    if (changed) {
        await booking.save();
    }

    /*
    |--------------------------------------------------------------------------
    | ALWAYS SYNCHRONIZE THE LINKED PAYMENT
    |--------------------------------------------------------------------------
    */

    await exports.syncPaymentStatus(booking);

    return booking;
};
