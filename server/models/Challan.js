const mongoose = require('mongoose');

const challanSchema = new mongoose.Schema({
    carId: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true, index: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    challanNumber: { type: String, required: true, trim: true, unique: true },
    violationDate: { type: Date, required: true },
    violationType: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    fineAmount: { type: Number, required: true, min: 0.01 },
    evidenceUrl: { type: String, trim: true, default: '' },
    responsibilityStatus: { type: String, enum: ['Unreviewed', 'Customer Responsible', 'Company Responsible', 'Disputed', 'Not Customer Responsible'], default: 'Unreviewed' },
    paymentStatus: { type: String, enum: ['Under Review', 'Payment Due', 'Paid', 'Disputed', 'Closed'], default: 'Under Review' },
    paymentReference: { type: String, trim: true, default: '' },
    stripeCheckoutSessionId: { type: String, default: null },
    stripePaymentIntentId: { type: String, default: null },
    paidAt: { type: Date, default: null },
    adminNote: { type: String, trim: true, default: '' },
    disputeReason: { type: String, trim: true, maxlength: 2000, default: '' },
    disputeStatus: { type: String, enum: ['None', 'Open', 'Under Review', 'Resolved'], default: 'None', index: true },
    resolutionNote: { type: String, trim: true, maxlength: 2000, default: '' },
    disputedAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Challan', challanSchema);
