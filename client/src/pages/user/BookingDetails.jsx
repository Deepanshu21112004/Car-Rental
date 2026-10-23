import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';

import { cancelBooking, getBooking, returnBookingEarly } from '../../services/bookingService';

import { formatRentalDuration } from '../../utils/rentalDuration';

export default function BookingDetails() {
    const { id } = useParams();

    const navigate = useNavigate();

    const [booking, setBooking] = useState(null);

    const [loading, setLoading] = useState(true);

    const [cancelling, setCancelling] = useState(false);
    const [returning, setReturning] = useState(false);

    /*
    |--------------------------------------------------------------------------
    | LOAD BOOKING
    |--------------------------------------------------------------------------
    */

    const loadBooking = useCallback(
        async (showLoader = true) => {
            try {
                if (showLoader) {
                    setLoading(true);
                }

                const response = await getBooking(id);

                setBooking(response.data?.booking || null);
            } catch (error) {
                console.error('Unable to load booking:', error);

                if (showLoader) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Booking not found',
                        text: error.response?.data?.message || 'Unable to load booking.',
                    }).then(() => {
                        navigate('/my-bookings', {
                            replace: true,
                        });
                    });
                }
            } finally {
                if (showLoader) {
                    setLoading(false);
                }
            }
        },
        [id, navigate]
    );

    /*
    |--------------------------------------------------------------------------
    | INITIAL LOAD + AUTO REFRESH
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        loadBooking(true);

        const refreshBooking = () => {
            loadBooking(false);
        };

        const interval = setInterval(refreshBooking, 10000);

        window.addEventListener('focus', refreshBooking);

        return () => {
            clearInterval(interval);

            window.removeEventListener('focus', refreshBooking);
        };
    }, [loadBooking]);

    /*
    |--------------------------------------------------------------------------
    | PAYMENT AVAILABLE
    |--------------------------------------------------------------------------
    |
    | Failed payments can be retried.
    |
    |--------------------------------------------------------------------------
    */

    const canPay =
        booking &&
        booking.bookingStatus === 'Pending' &&
        ['Pending', 'Failed'].includes(booking.paymentStatus) &&
        new Date(booking.pickupDateTime) > new Date();

    /*
    |--------------------------------------------------------------------------
    | CANCELLATION AVAILABLE
    |--------------------------------------------------------------------------
    */

    const canCancel =
        booking &&
        ['Pending', 'Confirmed'].includes(booking.bookingStatus) &&
        new Date(booking.pickupDateTime) > new Date();

    /*
    |--------------------------------------------------------------------------
    | CANCEL BOOKING
    |--------------------------------------------------------------------------
    */

    const handleCancel = async () => {
        const hoursBeforePickup = (new Date(booking.pickupDateTime).getTime() - Date.now()) / 3600000;
        const deductionPercent = hoursBeforePickup > 48 ? 0 : hoursBeforePickup >= 24 ? 5 : hoursBeforePickup >= 6 ? 10 : hoursBeforePickup >= 2 ? 15 : 25;
        const deductionAmount = booking.paymentStatus === 'Paid' ? Math.round(Number(booking.totalAmount || 0) * deductionPercent) / 100 : 0;
        const estimatedRefund = booking.paymentStatus === 'Paid' ? Math.max(0, Number(booking.totalAmount || 0) - deductionAmount) : 0;
        const result = await Swal.fire({
            icon: 'warning',
            title: 'Cancel this booking?',
            text: booking.paymentStatus === 'Paid'
                ? `Policy deduction: ${deductionPercent}% (₹${deductionAmount.toLocaleString('en-IN')}). Estimated refund: ₹${estimatedRefund.toLocaleString('en-IN')}. Final amount is calculated by the server and refund processing may take time.`
                : 'This unpaid booking will be cancelled. No refund is due.',
            showCancelButton: true,
            confirmButtonText: 'Confirm cancellation',
            cancelButtonText: 'Keep booking',
            confirmButtonColor: '#d33',
        });

        if (!result.isConfirmed) {
            return;
        }

        try {
            setCancelling(true);

            const response = await cancelBooking(booking._id);

            await Swal.fire({
                icon: 'success',
                title: 'Booking cancelled',
                text: response.data?.message || 'Booking cancelled successfully.',
                timer: 1700,
                showConfirmButton: false,
            });

            /*
             * Reload the actual server record.
             * This keeps paymentStatus and
             * bookingStatus synchronized.
             */
            await loadBooking(false);
        } catch (error) {
            console.error('Cancellation error:', error);

            Swal.fire({
                icon: 'error',
                title: 'Cancellation failed',
                text: error.response?.data?.message || 'Unable to cancel booking.',
            });
        } finally {
            setCancelling(false);
        }
    };

    const handleEarlyReturn = async () => {
        const result = await Swal.fire({
            title: 'Record early return',
            html: '<p>Enter the vehicle handover details. Actual return time defaults to now.</p><input id="return-odometer" class="swal2-input" type="number" min="0" placeholder="Odometer reading (optional)"><select id="return-fuel" class="swal2-select"><option value="">Fuel level (optional)</option><option>Full</option><option>Three-quarter</option><option>Half</option><option>Quarter</option><option>Empty</option></select><textarea id="return-notes" class="swal2-textarea" placeholder="Vehicle condition / inspection notes"></textarea>',
            showCancelButton: true, confirmButtonText: 'Confirm return',
            preConfirm: () => ({ returnOdometer: document.getElementById('return-odometer').value, returnFuelLevel: document.getElementById('return-fuel').value, returnConditionNotes: document.getElementById('return-notes').value }),
        });
        if (!result.isConfirmed) return;
        try {
            setReturning(true);
            const response = await returnBookingEarly(booking._id, result.value);
            await Swal.fire('Return recorded', `${response.data.message} Refund estimate: ₹${Number(response.data.refundAmount || 0).toLocaleString('en-IN')}.`, 'success');
            await loadBooking(false);
        } catch (error) { Swal.fire('Unable to record return', error.response?.data?.message || 'Please contact support.', 'error'); }
        finally { setReturning(false); }
    };

    /*
    |--------------------------------------------------------------------------
    | LOADING
    |--------------------------------------------------------------------------
    */

    if (loading) {
        return (
            <div className="page-loader">
                <div className="spinner" />
            </div>
        );
    }

    if (!booking) {
        return null;
    }

    /*
    |--------------------------------------------------------------------------
    | PAGE
    |--------------------------------------------------------------------------
    */

    return (
        <div>
            <div className="dash-heading">
                <div>
                    <span className="eyebrow">BOOKING DETAILS</span>

                    <h1>{booking.carId?.name || 'Booking'}</h1>

                    <p className="muted">Booking ID: {booking._id}</p>
                </div>

                <span className="status">{booking.bookingStatus}</span>
            </div>

            <div className="detail-summary">
                <div>
                    <span>Pickup</span>

                    <strong>{booking.pickupLocation}</strong>

                    <small>{new Date(booking.pickupDateTime).toLocaleString()}</small>
                </div>

                <div>
                    <span>Return</span>

                    <strong>{booking.returnLocation}</strong>

                    <small>{new Date(booking.returnDateTime).toLocaleString()}</small>
                </div>

                <div>
                    <span>Duration</span>

                    <strong>
                        {formatRentalDuration(booking.pickupDateTime, booking.returnDateTime)}
                    </strong>
                </div>

                <div>
                    <span>Car rate</span>

                    <strong>
                        ₹{Number(booking.carRate || 0).toLocaleString('en-IN')}
                        /hr
                    </strong>
                </div>

                <div>
                    <span>Driver charges</span>

                    <strong>₹{Number(booking.driverCharges || 0).toLocaleString('en-IN')}</strong>
                </div>

                <div>
                    <span>Booking status</span>

                    <strong>{booking.bookingStatus}</strong>
                </div>

                <div>
                    <span>Payment status</span>

                    <strong>{booking.paymentStatus}</strong>
                </div>

                <div>
                    <span>Total</span>

                    <strong>₹{Number(booking.totalAmount || 0).toLocaleString('en-IN')}</strong>
                </div>
            </div>

            {booking.bookingStatus === 'Cancelled' && (
                <div className="content-card mt-4">
                    <h3>Cancellation settlement</h3>
                    <p>Cancellation deduction: ₹{Number(booking.cancellationDeductionAmount || 0).toLocaleString('en-IN')}</p>
                    <p>Refund status: {booking.refundStatus || 'Not Applicable'}</p>
                    <p>Payment status: {booking.paymentStatus}</p>
                </div>
            )}

            {booking.driverOption === 'Self Drive' && (
                <div className="content-card mt-4">
                    <h3>Self-driver details</h3>
                    <div className="detail-grid">
                        <div><span>Driver</span><strong>{booking.selfDriver?.fullName || '—'}</strong></div>
                        <div><span>Phone</span><strong>{booking.selfDriver?.phone || '—'}</strong></div>
                        <div><span>Licence number</span><strong>{booking.selfDriver?.licenceNumber || '—'}</strong></div>
                        <div><span>Licence expiry</span><strong>{booking.selfDriver?.licenceExpiry ? new Date(booking.selfDriver.licenceExpiry).toLocaleDateString() : '—'}</strong></div>
                        <div><span>Verification</span><strong>{booking.selfDriver?.verificationStatus || 'Pending'}</strong></div>
                    </div>
                    {booking.selfDriver?.verificationStatus !== 'Verified' && <p className="alert alert-warning mt-3 mb-0">Driver verification is not complete. Vehicle handover must wait until the rental team verifies eligibility and licence details.</p>}
                    {booking.selfDriver?.verificationNote && <p className="mt-2">Admin note: {booking.selfDriver.verificationNote}</p>}
                </div>
            )}
            {booking.actualReturnDateTime && <div className="content-card mt-4"><h3>Return inspection</h3><p>Actual return: {new Date(booking.actualReturnDateTime).toLocaleString()}</p><p>Odometer: {booking.returnOdometer ?? 'Not entered'} · Fuel: {booking.returnFuelLevel || 'Not entered'}</p><p>{booking.returnConditionNotes || 'No condition notes'}</p><p>Early-return refund: ₹{Number(booking.earlyReturnRefundAmount || 0).toLocaleString('en-IN')} · Refund status: {booking.refundStatus}</p><p>Return inspection: {booking.returnInspectionStatus || 'Not Started'} (the vehicle is released only after staff approval).</p></div>}

            <div className="d-flex gap-2 flex-wrap mt-4">
                <Link to="/my-bookings" className="back-link">
                    ← Back to bookings
                </Link>

                {canPay && (
                    <Link to={`/checkout/${booking._id}`} className="btn btn-primary-custom">
                        {booking.paymentStatus === 'Failed' ? 'Retry Payment' : 'Pay Now'}
                    </Link>
                )}

                {booking.bookingStatus === 'Active' && booking.paymentStatus === 'Paid' && !booking.actualReturnDateTime && (
                    <button type="button" className="btn btn-primary-custom" onClick={handleEarlyReturn} disabled={returning}>{returning ? 'Recording return...' : 'Return Car Early'}</button>
                )}

                {canCancel && (
                    <button
                        type="button"
                        className="btn btn-outline-custom"
                        onClick={handleCancel}
                        disabled={cancelling}
                    >
                        {cancelling ? 'Cancelling...' : 'Cancel Booking'}
                    </button>
                )}
            </div>
        </div>
    );
}
