const mongoose = require('mongoose');

const schema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        carId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Car',
            required: true,
        },

        pickupLocation: {
            type: String,
            required: true,
            trim: true,
        },

        returnLocation: {
            type: String,
            required: true,
            trim: true,
        },

        pickupDateTime: {
            type: Date,
            required: true,
        },

        returnDateTime: {
            type: Date,
            required: true,
        },

        totalHours: {
            type: Number,
            required: true,
        },

        carRate: {
            type: Number,
            required: true,
        },

        driverCharges: {
            type: Number,
            default: 0,
        },

        driverOption: { type: String, enum: ['Self Drive', 'With Driver'], default: undefined },
        policyAccepted: { type: Boolean, default: false },
        policyAcceptedAt: { type: Date, default: null },
        cancellationPolicyVersion: { type: String, default: '2026-10-v1' },

        selfDriver: {
            fullName: { type: String, trim: true, default: '' },
            phone: { type: String, trim: true, default: '' },
            dateOfBirth: { type: Date, default: null },
            licenceNumber: { type: String, trim: true, default: '' },
            licenceExpiry: { type: Date, default: null },
            address: { type: String, trim: true, default: '' },
            verificationStatus: { type: String, enum: ['Not Required', 'Pending', 'Verified', 'Rejected'], default: 'Not Required' },
            verificationNote: { type: String, trim: true, default: '' },
        },

        actualReturnDateTime: { type: Date, default: null },
        returnInspectionStatus: { type: String, enum: ['Not Started', 'Pending', 'Approved', 'Issue Reported'], default: 'Not Started' },
        returnOdometer: { type: Number, default: null },
        returnFuelLevel: { type: String, trim: true, default: '' },
        returnConditionNotes: { type: String, trim: true, default: '' },
        earlyReturnRefundAmount: { type: Number, default: 0 },
        cancellationDeductionAmount: { type: Number, default: 0 },
        refundStatus: { type: String, enum: ['Not Applicable', 'Pending', 'Processed', 'Failed'], default: 'Not Applicable' },

        totalAmount: {
            type: Number,
            required: true,
        },

        bookingStatus: {
            type: String,
            enum: ['Pending', 'Confirmed', 'Active', 'Completed', 'Cancelled'],
            default: 'Pending',
        },

        paymentStatus: {
            type: String,
            enum: ['Pending', 'Paid', 'Failed', 'Expired', 'Refunded', 'Partially Refunded'],
            default: 'Pending',
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Booking', schema);
