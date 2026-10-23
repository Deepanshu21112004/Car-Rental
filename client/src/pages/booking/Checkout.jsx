import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getBooking } from '../../services/bookingService';
import { createCheckoutSession } from '../../services/paymentService';
import Swal from 'sweetalert2';
import { formatRentalDuration } from '../../utils/rentalDuration';

export default function Checkout() {
    const { bookingId } = useParams();
    const [b, setB] = useState(null);
    const [paying, setPaying] = useState(false);
    const nav = useNavigate();
    const [searchParams] = useSearchParams();

    /*
     * --------------------------------------------------------------------------
     * GET BOOKING
     * --------------------------------------------------------------------------
     */
    useEffect(() => {
        getBooking(bookingId)
            .then((response) => {
                setB(response.data?.booking || null);
            })
            .catch((error) => {
                console.error('Unable to load booking:', error);

                Swal.fire({
                    icon: 'error',
                    title: 'Booking not found',
                    text: error.response?.data?.message || 'Unable to load your booking.',
                }).then(() =>
                    nav('/my-bookings', {
                        replace: true,
                    })
                );
            });
    }, [bookingId, nav]);

    /*
     * --------------------------------------------------------------------------
     * STRIPE CANCELLED
     * --------------------------------------------------------------------------
     */
    useEffect(() => {
        if (searchParams.get('cancelled') === 'true') {
            Swal.fire({
                icon: 'info',
                title: 'Payment cancelled',
                text: 'Your booking is still pending. You can try payment again before pickup.',
            });
        }
    }, [searchParams]);

    /*
     * --------------------------------------------------------------------------
     * CHECK IF PAYMENT IS AVAILABLE
     * --------------------------------------------------------------------------
     */
    const paymentAvailable =
        b &&
        b.bookingStatus === 'Pending' &&
        ['Pending', 'Failed'].includes(b.paymentStatus) &&
        new Date(b.pickupDateTime) > new Date();

    /*
     * --------------------------------------------------------------------------
     * ROUNDED DISPLAY AMOUNT
     * --------------------------------------------------------------------------
     * Backend is the authority for the actual payment amount.
     * Rounding is only for displaying the amount as a whole rupee.
     * --------------------------------------------------------------------------
     */
    const payableAmount = b ? Math.round(Number(b.totalAmount || 0)) : 0;

    /*
     * --------------------------------------------------------------------------
     * START STRIPE PAYMENT
     * --------------------------------------------------------------------------
     */
    const pay = async () => {
        if (!paymentAvailable) {
            Swal.fire({
                icon: 'warning',
                title: 'Payment unavailable',
                text:
                    b?.paymentStatus === 'Failed'
                        ? 'This payment can no longer be retried.'
                        : 'This booking is no longer available for payment.',
            });

            return;
        }

        try {
            setPaying(true);

            const response = await createCheckoutSession(bookingId);

            if (response.data?.url) {
                /*
                 * ----------------------------------------------------------------
                 * REDIRECT TO STRIPE
                 * ----------------------------------------------------------------
                 */
                window.location.href = response.data.url;
                return;
            }

            throw new Error('Stripe checkout URL was not returned.');
        } catch (error) {
            console.error('Stripe checkout error:', error);

            Swal.fire({
                icon: 'error',
                title: 'Payment unavailable',
                text:
                    error.response?.data?.message ||
                    error.message ||
                    'Unable to start Stripe checkout.',
                confirmButtonColor: '#2448ff',
            });
        } finally {
            setPaying(false);
        }
    };

    /*
     * --------------------------------------------------------------------------
     * LOADING
     * --------------------------------------------------------------------------
     */
    if (!b) {
        return (
            <div className="page-loader">
                <div className="spinner" />
            </div>
        );
    }

    /*
     * --------------------------------------------------------------------------
     * PAYMENT NO LONGER AVAILABLE
     * --------------------------------------------------------------------------
     */
    if (!paymentAvailable) {
        return (
            <div className="container section-space">
                <div className="checkout-card">
                    <span className="eyebrow">CHECKOUT</span>

                    <h1>Payment unavailable.</h1>

                    <div className="summary-list">
                        <div>
                            <span>Car</span>
                            <strong>{b.carId?.name}</strong>
                        </div>

                        <div>
                            <span>Booking status</span>
                            <strong>{b.bookingStatus}</strong>
                        </div>

                        <div>
                            <span>Payment status</span>
                            <strong>{b.paymentStatus}</strong>
                        </div>

                        <div className="total">
                            <span>Total</span>
                            <strong>₹{payableAmount.toLocaleString('en-IN')}</strong>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => nav(`/my-bookings/${b._id}`)}
                        className="btn btn-primary-custom w-100"
                    >
                        View Booking
                    </button>

                    <button
                        type="button"
                        onClick={() => nav('/my-bookings')}
                        className="btn btn-outline-custom w-100 mt-2"
                    >
                        Back to My Bookings
                    </button>
                </div>
            </div>
        );
    }

    /*
     * --------------------------------------------------------------------------
     * CHECKOUT PAGE
     * --------------------------------------------------------------------------
     */
    return (
        <div className="container section-space">
            <div className="checkout-card">
                <span className="eyebrow">CHECKOUT</span>

                <h1>Review your booking.</h1>

                {b.paymentStatus === 'Failed' && (
                    <div
                        style={{
                            padding: '12px 15px',
                            marginBottom: '20px',
                            borderRadius: '8px',
                            background: '#fff3cd',
                            color: '#856404',
                            border: '1px solid #ffe69c',
                        }}
                    >
                        Your previous payment attempt failed. You can safely retry the payment
                        below.
                    </div>
                )}

                <div className="summary-list">
                    <div>
                        <span>Car</span>
                        <strong>{b.carId?.name}</strong>
                    </div>

                    <div>
                        <span>Rental time</span>
                        <strong>{formatRentalDuration(b.pickupDateTime, b.returnDateTime)}</strong>
                    </div>

                    <div>
                        <span>Car rate</span>
                        <strong>
                            ₹{Number(b.carRate || 0).toLocaleString('en-IN')}
                            /hr
                        </strong>
                    </div>

                    <div>
                        <span>Pickup</span>
                        <strong>{b.pickupLocation}</strong>
                    </div>

                    <div>
                        <span>Return</span>
                        <strong>{b.returnLocation}</strong>
                    </div>

                    <div>
                        <span>Driver charges</span>
                        <strong>₹{Number(b.driverCharges || 0).toLocaleString('en-IN')}</strong>
                    </div>

                    <div className="total">
                        <span>Total</span>
                        <strong>₹{payableAmount.toLocaleString('en-IN')}</strong>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={pay}
                    disabled={paying}
                    className="btn btn-primary-custom w-100"
                >
                    {paying
                        ? 'Opening Stripe...'
                        : b.paymentStatus === 'Failed'
                          ? 'Retry Payment with Stripe'
                          : 'Pay securely with Stripe'}
                </button>

                <button
                    type="button"
                    onClick={() => nav('/my-bookings')}
                    className="btn btn-outline-custom w-100 mt-2"
                    disabled={paying}
                >
                    Pay later / view booking
                </button>
            </div>
        </div>
    );
}
