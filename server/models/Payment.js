const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
    {
        bookingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Booking',
            required: true,
        },

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        amount: {
            type: Number,
            required: true,
        },

        currency: {
            type: String,
            default: 'inr',
        },

        paymentStatus: {
            type: String,
            enum: ['Pending', 'Paid', 'Failed', 'Expired', 'Refunded', 'Partially Refunded'],
            default: 'Pending',
        },

        // Stripe Checkout Session ID
        stripeCheckoutSessionId: {
            type: String,
            default: null,
        },

        // Stripe Payment Intent ID
        // Required later for refunds
        stripePaymentIntentId: {
            type: String,
            default: null,
        },

        // Stripe Refund ID
        stripeRefundId: {
            type: String,
            default: null,
        },

        refundedAt: { type: Date, default: null },
        refundedAmount: { type: Number, default: 0 },
        refundStatus: { type: String, enum: ['Not Applicable', 'Pending', 'Processed', 'Failed'], default: 'Not Applicable' },
        refundReason: { type: String, default: '' },

        paidAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Payment', paymentSchema);
