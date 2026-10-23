const mongoose = require('mongoose');
const Challan = require('../models/Challan');
const Booking = require('../models/Booking');
const Car = require('../models/Car');
const Stripe = require('stripe');
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const CLIENT_URL = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');

exports.my = async (req, res, next) => {
    try {
        const challans = await Challan.find({ userId: req.user._id })
            .populate('carId', 'name registrationNumber')
            .populate('bookingId', 'pickupDateTime returnDateTime bookingStatus')
            .sort({ violationDate: -1 });
        res.json({ challans });
    } catch (error) { next(error); }
};

exports.adminList = async (req, res, next) => {
    try {
        const challans = await Challan.find()
            .populate('carId', 'name registrationNumber')
            .populate('bookingId', 'pickupDateTime returnDateTime')
            .populate('userId', 'firstName lastName email phone')
            .populate('createdBy', 'firstName lastName')
            .sort({ createdAt: -1 });
        res.json({ challans });
    } catch (error) { next(error); }
};

exports.create = async (req, res, next) => {
    try {
        const { carId, bookingId, challanNumber, violationDate, violationType, description, fineAmount, evidenceUrl } = req.body;
        if (!carId || !mongoose.isValidObjectId(carId) || !String(challanNumber || '').trim() || !violationDate || !String(violationType || '').trim() || fineAmount === '' || fineAmount == null) {
            return res.status(400).json({ message: 'Car, challan number, violation date, violation type and fine amount are required.' });
        }
        const car = await Car.findById(carId);
        if (!car) return res.status(404).json({ message: 'Vehicle not found.' });
        const date = new Date(violationDate);
        const amount = Number(fineAmount);
        if (evidenceUrl && !/^https?:\/\//i.test(String(evidenceUrl).trim())) return res.status(400).json({ message: 'Evidence URL must begin with http:// or https://.' });
        if (Number.isNaN(date.getTime()) || date > new Date()) return res.status(400).json({ message: 'Violation date must be a valid date and cannot be in the future.' });
        if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000) return res.status(400).json({ message: 'Fine amount must be greater than ₹0 and no more than ₹1,00,00,000.' });
        let booking = null;
        if (bookingId) {
            if (!mongoose.isValidObjectId(bookingId)) return res.status(400).json({ message: 'Invalid linked booking ID.' });
            booking = await Booking.findById(bookingId);
            if (!booking) return res.status(404).json({ message: 'Linked booking not found.' });
            if (String(booking.carId) !== String(carId)) return res.status(400).json({ message: 'Selected booking does not belong to this vehicle.' });
            if (date < new Date(booking.pickupDateTime) || date > new Date(booking.actualReturnDateTime || booking.returnDateTime)) {
                return res.status(400).json({ message: 'Violation date is outside the linked booking period. Review the details before linking this challan.' });
            }
        }
        const challan = await Challan.create({
            carId, bookingId: booking?._id || null, userId: booking?.userId || null,
            challanNumber: challanNumber.trim().toUpperCase(), violationDate: date, violationType: violationType.trim(),
            description: String(description || '').trim(), fineAmount: amount,
            evidenceUrl: String(evidenceUrl || '').trim(), createdBy: req.user._id,
            responsibilityStatus: 'Unreviewed', paymentStatus: 'Under Review',
        });
        res.status(201).json({ message: 'Challan recorded successfully.', challan });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ message: 'A challan with this number already exists.' });
        next(error);
    }
};

exports.update = async (req, res, next) => {
    try {
        const challan = await Challan.findById(req.params.id);
        if (!challan) return res.status(404).json({ message: 'Challan not found.' });

        const body = req.body || {};
        const isPaid = challan.paymentStatus === 'Paid' || Boolean(challan.paidAt);
        const hasStatusChange = body.responsibilityStatus !== undefined || body.paymentStatus !== undefined;

        // A verified payment is immutable through the ordinary admin editor. This prevents
        // responsibility edits from making a paid challan payable a second time.
        if (isPaid && hasStatusChange) {
            return res.status(409).json({ message: 'This challan has a verified payment. Responsibility and payment status are locked. Add an admin note if needed; do not reopen or charge this challan again.' });
        }
        // Prevent an admin status change from invalidating a Checkout session that may still be paid.
        if (!isPaid && hasStatusChange && stripe && challan.stripeCheckoutSessionId) {
            try {
                const activeSession = await stripe.checkout.sessions.retrieve(challan.stripeCheckoutSessionId);
                if (activeSession.payment_status === 'paid' || activeSession.status === 'complete') {
                    return res.status(409).json({ message: 'A Stripe checkout session has completed or payment may have been captured. Verify that payment before changing responsibility or payment status.' });
                }
                if (activeSession.status === 'open') await stripe.checkout.sessions.expire(activeSession.id);
                challan.stripeCheckoutSessionId = null;
            } catch (stripeError) {
                if (stripeError.statusCode !== 404 && stripeError.code !== 'resource_missing') throw stripeError;
                challan.stripeCheckoutSessionId = null;
            }
        }

        if (body.adminNote !== undefined) challan.adminNote = String(body.adminNote).trim().slice(0, 2000);
        if (body.evidenceUrl !== undefined) {
            const evidenceUrl = String(body.evidenceUrl || '').trim();
            if (evidenceUrl && !/^https?:\/\//i.test(evidenceUrl)) return res.status(400).json({ message: 'Evidence URL must begin with http:// or https://.' });
            challan.evidenceUrl = evidenceUrl;
        }

        const responsibilityOptions = ['Unreviewed', 'Customer Responsible', 'Company Responsible', 'Disputed', 'Not Customer Responsible'];
        const paymentOptions = ['Under Review', 'Payment Due', 'Paid', 'Disputed', 'Closed'];
        const requestedResponsibility = body.responsibilityStatus !== undefined ? String(body.responsibilityStatus).trim() : challan.responsibilityStatus;
        const requestedPayment = body.paymentStatus !== undefined ? String(body.paymentStatus).trim() : challan.paymentStatus;

        if (!responsibilityOptions.includes(requestedResponsibility)) return res.status(400).json({ message: 'Invalid responsibility status.' });
        if (!paymentOptions.includes(requestedPayment)) return res.status(400).json({ message: 'Invalid payment status.' });

        // A disputed challan must be formally resolved before any payment can be recorded.
        if (body.paymentStatus === 'Paid' && (challan.disputeStatus === 'Open' || challan.disputeStatus === 'Under Review' || challan.paymentStatus === 'Disputed')) {
            return res.status(409).json({ message: 'Resolve the customer dispute before recording payment.' });
        }
        if (body.paymentStatus === 'Paid' && (challan.responsibilityStatus !== 'Customer Responsible' || challan.paymentStatus !== 'Payment Due')) {
            return res.status(409).json({ message: 'A customer payment can only be recorded for a verified customer-responsible challan in Payment Due status.' });
        }
        // Paid can only be set by verified Stripe checkout or an admin-verified receipt.
        if (body.paymentStatus === 'Paid') {
            const receipt = String(body.paymentReference || '').trim();
            if (!receipt) return res.status(400).json({ message: 'A verified official receipt/payment reference is required.' });
            challan.paymentReference = receipt;
            challan.paymentStatus = 'Paid';
            challan.paidAt = new Date();
        } else if (body.paymentStatus !== undefined) {
            challan.paymentStatus = requestedPayment;
        }

        if (body.responsibilityStatus !== undefined) challan.responsibilityStatus = requestedResponsibility;

        // Dispute resolution must be explicit and auditable. A customer-responsible outcome
        // creates one payment-due state; a company-responsible outcome closes the customer debt.
        if (challan.disputeStatus === 'Open' || challan.disputeStatus === 'Under Review' || body.resolveDispute === true) {
            if (body.resolveDispute === true || body.responsibilityStatus !== undefined) {
                const resolutionNote = String(body.resolutionNote || '').trim();
                if (!resolutionNote || resolutionNote.length < 10) {
                    return res.status(400).json({ message: 'Enter a resolution note of at least 10 characters before resolving the customer dispute.' });
                }
                if (!['Customer Responsible', 'Company Responsible', 'Not Customer Responsible'].includes(challan.responsibilityStatus)) {
                    return res.status(400).json({ message: 'Choose Customer Responsible, Company Responsible, or Not Customer Responsible to resolve this dispute.' });
                }
                challan.resolutionNote = resolutionNote.slice(0, 2000);
                challan.disputeStatus = 'Resolved';
                challan.resolvedAt = new Date();
                challan.paymentStatus = challan.responsibilityStatus === 'Customer Responsible' ? 'Payment Due' : 'Closed';
            }
        } else if (challan.responsibilityStatus === 'Customer Responsible' && body.responsibilityStatus !== undefined) {
            challan.paymentStatus = 'Payment Due';
        } else if (['Company Responsible', 'Not Customer Responsible'].includes(challan.responsibilityStatus) && body.responsibilityStatus !== undefined) {
            challan.paymentStatus = 'Closed';
        }

        if (challan.paymentStatus === 'Payment Due' && challan.responsibilityStatus !== 'Customer Responsible') {
            return res.status(400).json({ message: 'Payment Due is allowed only after customer responsibility is confirmed.' });
        }
        if (challan.paymentStatus === 'Paid' && !String(challan.paymentReference || '').trim()) {
            return res.status(400).json({ message: 'Payment reference is required before marking the challan Paid.' });
        }
        if (challan.paymentStatus === 'Disputed') {
            challan.disputeStatus = challan.disputeStatus === 'None' ? 'Open' : challan.disputeStatus;
        }

        await challan.save();
        res.json({ message: 'Challan updated successfully.', challan });
    } catch (error) { next(error); }
};


// Create a Stripe Checkout session only after the admin has confirmed customer responsibility.
exports.createPaymentSession = async (req, res, next) => {
    try {
        if (!stripe) return res.status(503).json({ message: 'Online challan payment is not configured. Please contact support for the verified official payment process.' });
        const challan = await Challan.findOne({ _id: req.params.id, userId: req.user._id });
        if (!challan) return res.status(404).json({ message: 'Challan not found for this account.' });
        if (challan.responsibilityStatus !== 'Customer Responsible' || challan.paymentStatus !== 'Payment Due') {
            return res.status(400).json({ message: 'Payment is available only after the admin confirms your responsibility and marks the challan Payment Due.' });
        }
        if (challan.paymentStatus === 'Paid' || challan.paidAt) return res.status(400).json({ message: 'This challan has already been paid.' });
        // Reuse an existing open Checkout session rather than creating multiple payable sessions.
        if (challan.stripeCheckoutSessionId) {
            try {
                const existingSession = await stripe.checkout.sessions.retrieve(challan.stripeCheckoutSessionId);
                if (existingSession.payment_status === 'paid' || existingSession.status === 'complete') {
                    return res.status(409).json({ message: 'A payment may already have completed. Refresh My Challans and check the payment status before trying again.' });
                }
                if (existingSession.status === 'open' && existingSession.url) {
                    return res.json({ checkoutUrl: existingSession.url, sessionId: existingSession.id, reused: true });
                }
            } catch (stripeError) {
                if (stripeError.statusCode !== 404 && stripeError.code !== 'resource_missing') throw stripeError;
            }
            challan.stripeCheckoutSessionId = null;
        }
        const amount = Number(challan.fineAmount);
        if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: 'The challan amount is invalid.' });
        // Stripe's India minimum is generally ₹50; never inflate a smaller fine to meet the minimum.
        if (amount < 50) return res.status(400).json({ message: 'This fine is below the supported minimum for online checkout. Pay through the verified official channel and ask the admin to record the receipt.' });
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            line_items: [{ price_data: { currency: 'inr', product_data: { name: `Challan ${challan.challanNumber}`, description: `${challan.violationType} · vehicle challan` }, unit_amount: Math.round(amount * 100) }, quantity: 1 }],
            metadata: { type: 'challan', challanId: String(challan._id), userId: String(req.user._id) },
            success_url: `${CLIENT_URL}/my-challans?challan_session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${CLIENT_URL}/my-challans?challan_payment=cancelled`,
        }, { idempotencyKey: `challan-checkout-${challan._id}-${challan.updatedAt.getTime()}` });
        challan.stripeCheckoutSessionId = session.id;
        await challan.save();
        return res.json({ checkoutUrl: session.url, sessionId: session.id });
    } catch (error) { next(error); }
};

exports.verifyPayment = async (req, res, next) => {
    try {
        if (!stripe) return res.status(503).json({ message: 'Online challan payment is not configured.' });
        const sessionId = String(req.body.sessionId || '').trim();
        if (!sessionId) return res.status(400).json({ message: 'Stripe checkout session ID is required.' });
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.metadata?.type !== 'challan' || session.metadata?.userId !== String(req.user._id)) return res.status(403).json({ message: 'This payment session does not belong to your account.' });
        const challan = await Challan.findOne({ _id: session.metadata.challanId, userId: req.user._id });
        if (!challan) return res.status(404).json({ message: 'Challan not found for this account.' });
        if (challan.paymentStatus === 'Paid' && challan.paidAt) return res.json({ message: 'Challan payment is already verified.', challan });
        if (challan.stripeCheckoutSessionId !== session.id) return res.status(400).json({ message: 'This checkout session is no longer the active payment session for this challan. If you were charged, contact support with your Stripe receipt; do not pay again.' });
        if (session.payment_status !== 'paid') return res.status(400).json({ message: 'Stripe has not confirmed this payment yet.' });
        if (challan.responsibilityStatus !== 'Customer Responsible' || challan.paymentStatus !== 'Payment Due') return res.status(409).json({ message: 'This challan is no longer payable. If Stripe charged you, contact support with your receipt before attempting another payment.' });
        if (Number(session.amount_total) !== Math.round(Number(challan.fineAmount) * 100)) return res.status(400).json({ message: 'Paid amount does not match the challan amount. Contact support.' });
        challan.paymentStatus = 'Paid';
        challan.paymentReference = String(session.payment_intent || session.id);
        challan.stripePaymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || null;
        challan.paidAt = new Date();
        await challan.save();
        return res.json({ message: 'Challan payment verified successfully.', challan });
    } catch (error) { next(error); }
};

exports.verifyDriver = async (req, res, next) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Booking not found.' });
        if (booking.driverOption !== 'Self Drive') return res.status(400).json({ message: 'This booking does not require self-driver verification.' });
        const { verificationStatus, verificationNote } = req.body;
        if (!['Pending', 'Verified', 'Rejected'].includes(verificationStatus)) return res.status(400).json({ message: 'Invalid driver verification status.' });
        if (verificationStatus === 'Rejected' && !String(verificationNote || '').trim()) return res.status(400).json({ message: 'A rejection reason is required.' });
        booking.selfDriver.verificationStatus = verificationStatus;
        booking.selfDriver.verificationNote = String(verificationNote || '').trim().slice(0, 1000);
        await booking.save();
        res.json({ message: `Self-driver marked ${verificationStatus.toLowerCase()}.`, booking });
    } catch (error) { next(error); }
};

exports.dispute = async (req, res, next) => {
    try {
        const reason = String(req.body.reason || '').trim();
        if (reason.length < 10 || reason.length > 2000) return res.status(400).json({ message: 'Please provide a dispute reason between 10 and 2000 characters.' });
        const challan = await Challan.findOne({ _id: req.params.id, userId: req.user._id });
        if (!challan) return res.status(404).json({ message: 'Challan not found for this account.' });
        if (challan.paymentStatus === 'Paid' || challan.paidAt) return res.status(409).json({ message: 'This challan has already been paid. It cannot be reopened for payment or disputed through this form. Contact support if you believe the payment was incorrect.' });
        if (challan.paymentStatus === 'Closed' || challan.disputeStatus === 'Resolved') return res.status(400).json({ message: 'This challan has already been resolved or closed.' });
        if (challan.disputeStatus === 'Open' || challan.disputeStatus === 'Under Review') return res.status(409).json({ message: 'Your dispute is already submitted and visible to the admin team. You can review its current status on this page.' });

        // If checkout has been started but not completed, expire the open session before
        // pausing the challan. Never expire a completed session or silently ignore a captured payment.
        if (stripe && challan.stripeCheckoutSessionId) {
            try {
                const existingSession = await stripe.checkout.sessions.retrieve(challan.stripeCheckoutSessionId);
                if (existingSession.payment_status === 'paid' || existingSession.status === 'complete') {
                    return res.status(409).json({ message: 'A checkout session has already completed or payment may have been captured. Refresh the page and contact support if the payment is not reflected before submitting a dispute.' });
                }
                if (existingSession.status === 'open') await stripe.checkout.sessions.expire(existingSession.id);
            } catch (stripeError) {
                if (stripeError.statusCode !== 404 && stripeError.code !== 'resource_missing') throw stripeError;
            }
            challan.stripeCheckoutSessionId = null;
        }

        challan.responsibilityStatus = 'Disputed';
        challan.paymentStatus = 'Disputed';
        challan.disputeReason = reason;
        challan.disputeStatus = 'Open';
        challan.disputedAt = new Date();
        challan.resolutionNote = '';
        challan.resolvedAt = null;
        await challan.save();
        res.json({ message: 'Dispute submitted successfully and sent to the admin dashboard for review.', challan });
    } catch (error) { next(error); }
};
