/*
 * Rental pricing helpers.
 *
 * The server uses CommonJS, so this file must use module.exports.
 * Rental duration is calculated exactly; there is no one-hour minimum.
 */

/**
 * Calculate exact rental duration in decimal hours.
 *
 * Examples:
 * 10 minutes  -> 0.166667 hours
 * 30 minutes  -> 0.5 hours
 * 60 minutes  -> 1 hour
 * 90 minutes  -> 1.5 hours
 */
function calculateHours(start, end) {
    const startTime = new Date(start);
    const endTime = new Date(end);

    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
        return 0;
    }

    const difference = endTime.getTime() - startTime.getTime();

    if (difference <= 0) {
        return 0;
    }

    const minutes = Math.round(difference / (1000 * 60));

    return Number((minutes / 60).toFixed(6));
}

/**
 * Calculate the final rental amount.
 */
function calculateTotal(hours, hourlyRate, driverCharges = 0) {
    const rentalHours = Number(hours);
    const rate = Number(hourlyRate);
    const driver = Number(driverCharges) || 0;

    if (!Number.isFinite(rentalHours) || rentalHours <= 0) {
        return 0;
    }

    if (!Number.isFinite(rate) || rate <= 0) {
        return 0;
    }

    if (!Number.isFinite(driver) || driver < 0) {
        return 0;
    }

    return Number((rentalHours * rate + driver).toFixed(2));
}

/**
 * Backward-compatible helper for any future code that wants the
 * complete pricing breakdown.
 */
function calculateRentalPrice({
    pickupDate,
    returnDate,
    hourlyRate,
    driverRequired = false,
    driverCharge = 0,
}) {
    const rentalHours = calculateHours(pickupDate, returnDate);

    if (!rentalHours) {
        throw new Error('Invalid rental duration');
    }

    const rate = Number(hourlyRate);
    const driverAmount = driverRequired ? Number(driverCharge || 0) : 0;

    if (!Number.isFinite(rate) || rate <= 0) {
        throw new Error('Invalid hourly rate');
    }

    if (!Number.isFinite(driverAmount) || driverAmount < 0) {
        throw new Error('Invalid driver charge');
    }

    const totalMinutes = Math.round(rentalHours * 60);
    const carAmount = Number((rentalHours * rate).toFixed(2));
    const totalAmount = Number((carAmount + driverAmount).toFixed(2));

    return {
        totalMinutes,
        rentalHours,
        carAmount,
        driverAmount: Number(driverAmount.toFixed(2)),
        totalAmount,
    };
}

module.exports = {
    calculateHours,
    calculateTotal,
    calculateRentalPrice,
};
