import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { CalendarDays, CreditCard, Eye, XCircle } from 'lucide-react';

import { cancelBooking, getMyBookings } from '../../services/bookingService';

import { formatRentalDuration } from '../../utils/rentalDuration';

export default function Bookings() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState('');

    /*
    |--------------------------------------------------------------------------
    | LOAD BOOKINGS
    |--------------------------------------------------------------------------
    */

    const loadBookings = useCallback(async (showLoader = false) => {
        try {
            if (showLoader) {
                setLoading(true);
            }

            const response = await getMyBookings();

            setBookings(response.data?.bookings || []);
        } catch (error) {
            console.error('Unable to load bookings:', error);

            if (showLoader) {
                Swal.fire({
                    icon: 'error',
                    title: 'Unable to load bookings',
                    text: error.response?.data?.message || 'Please try again.',
                });
            }
        } finally {
            if (showLoader) {
                setLoading(false);
            }
        }
    }, []);

    /*
    |--------------------------------------------------------------------------
    | INITIAL LOAD + AUTO REFRESH
    |--------------------------------------------------------------------------
    |
    | The server is the source of truth.
    |
    | This keeps the user page synchronized after:
    |
    | - Stripe payment
    | - Admin booking update
    | - Refund
    | - Automatic booking expiry
    | - Booking lifecycle changes
    |
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        loadBookings(true);

        const refreshBookings = () => {
            loadBookings(false);
        };

        const interval = setInterval(refreshBookings, 10000);

        window.addEventListener('focus', refreshBookings);

        return () => {
            clearInterval(interval);

            window.removeEventListener('focus', refreshBookings);
        };
    }, [loadBookings]);

    /*
    |--------------------------------------------------------------------------
    | PAYMENT AVAILABLE
    |--------------------------------------------------------------------------
    |
    | Failed payments can be retried.
    |
    |--------------------------------------------------------------------------
    */

    const canPay = (booking) => {
        if (!booking) {
            return false;
        }

        return (
            booking.bookingStatus === 'Pending' &&
            ['Pending', 'Failed'].includes(booking.paymentStatus) &&
            new Date(booking.pickupDateTime) > new Date()
        );
    };

    /*
    |--------------------------------------------------------------------------
    | CANCELLATION AVAILABLE
    |--------------------------------------------------------------------------
    */

    const canCancel = (booking) => {
        if (!booking) {
            return false;
        }

        return (
            ['Pending', 'Confirmed'].includes(booking.bookingStatus) &&
            new Date(booking.pickupDateTime) > new Date()
        );
    };

    /*
    |--------------------------------------------------------------------------
    | CANCEL BOOKING
    |--------------------------------------------------------------------------
    */

    const handleCancel = async (booking) => {
        const hoursBeforePickup = (new Date(booking.pickupDateTime).getTime() - Date.now()) / 3600000;
        const deductionPercent = hoursBeforePickup > 48 ? 0 : hoursBeforePickup >= 24 ? 5 : hoursBeforePickup >= 6 ? 10 : hoursBeforePickup >= 2 ? 15 : 25;
        const deductionAmount = booking.paymentStatus === 'Paid' ? Math.round(Number(booking.totalAmount || 0) * deductionPercent) / 100 : 0;
        const estimatedRefund = booking.paymentStatus === 'Paid' ? Math.max(0, Number(booking.totalAmount || 0) - deductionAmount) : 0;
        const result = await Swal.fire({
            icon: 'warning',
            title: 'Cancel this booking?',
            text: booking.paymentStatus === 'Paid'
                ? `Policy deduction: ${deductionPercent}% (₹${deductionAmount.toLocaleString('en-IN')}). Estimated refund: ₹${estimatedRefund.toLocaleString('en-IN')}. The server calculates the final amount and Stripe processing can take time.`
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
            setCancelling(booking._id);

            const response = await cancelBooking(booking._id);

            await Swal.fire({
                icon: 'success',
                title: 'Booking cancelled',
                text: response.data?.message || 'Your booking has been cancelled.',
                timer: 1700,
                showConfirmButton: false,
            });

            /*
             * Reload from backend so both
             * booking and payment status are
             * immediately synchronized.
             */
            await loadBookings(false);
        } catch (error) {
            console.error('Cancellation error:', error);

            Swal.fire({
                icon: 'error',
                title: 'Cancellation failed',
                text: error.response?.data?.message || 'Unable to cancel this booking.',
            });
        } finally {
            setCancelling('');
        }
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

    /*
    |--------------------------------------------------------------------------
    | PAGE
    |--------------------------------------------------------------------------
    */

    return (
        <div>
            <div className="dash-heading">
                <div>
                    <span className="eyebrow">MY BOOKINGS</span>

                    <h1>Your rental bookings.</h1>

                    <p className="muted">View, pay and manage your reservations.</p>
                </div>

                <Link to="/cars" className="btn btn-primary-custom">
                    Book another car
                </Link>
            </div>

            {!bookings.length ? (
                <div className="empty-state">
                    <CalendarDays size={36} />

                    <h2>No bookings yet</h2>

                    <p>Choose a car and create your first rental booking.</p>

                    <Link to="/cars" className="btn btn-primary-custom">
                        Browse cars
                    </Link>
                </div>
            ) : (
                <div className="content-card table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Car</th>
                                <th>Pickup</th>
                                <th>Return</th>
                                <th>Duration</th>
                                <th>Amount</th>
                                <th>Booking</th>
                                <th>Payment</th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {bookings.map((booking) => (
                                <tr key={booking._id}>
                                    <td>
                                        <strong>{booking.carId?.name}</strong>

                                        <br />

                                        <small className="muted">
                                            {booking.carId?.brand || ''}
                                        </small>
                                    </td>

                                    <td>{new Date(booking.pickupDateTime).toLocaleString()}</td>

                                    <td>{new Date(booking.returnDateTime).toLocaleString()}</td>

                                    <td>
                                        {formatRentalDuration(
                                            booking.pickupDateTime,
                                            booking.returnDateTime
                                        )}
                                    </td>

                                    <td>
                                        ₹{Number(booking.totalAmount || 0).toLocaleString('en-IN')}
                                    </td>

                                    <td>{booking.bookingStatus}</td>

                                    <td>{booking.paymentStatus}</td>

                                    <td>
                                        <div className="d-flex gap-2 flex-wrap">
                                            <Link
                                                to={`/my-bookings/${booking._id}`}
                                                className="table-btn"
                                                title="View booking"
                                            >
                                                <Eye size={15} />
                                                View
                                            </Link>

                                            {canPay(booking) && (
                                                <Link
                                                    to={`/checkout/${booking._id}`}
                                                    className="table-btn"
                                                    style={{
                                                        background: '#2448ff',
                                                        color: '#fff',
                                                        textDecoration: 'none',
                                                    }}
                                                >
                                                    <CreditCard size={15} />

                                                    {booking.paymentStatus === 'Failed'
                                                        ? 'Retry Payment'
                                                        : 'Pay Now'}
                                                </Link>
                                            )}

                                            {canCancel(booking) && (
                                                <button
                                                    type="button"
                                                    className="table-btn danger"
                                                    onClick={() => handleCancel(booking)}
                                                    disabled={cancelling === booking._id}
                                                >
                                                    <XCircle size={15} />

                                                    {cancelling === booking._id
                                                        ? 'Cancelling...'
                                                        : 'Cancel'}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
