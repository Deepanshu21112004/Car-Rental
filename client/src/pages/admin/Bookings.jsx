import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';

import { getAdminBookings } from '../../services/bookingService';
import { formatRentalDuration } from '../../utils/rentalDuration';

export default function Bookings() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadBookings = useCallback(async (showLoader = false) => {
        try {
            if (showLoader) {
                setLoading(true);
            }

            const response = await getAdminBookings();

            setBookings(response.data?.bookings || []);
        } catch (error) {
            console.error('Admin bookings error:', error);

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

    useEffect(() => {
        loadBookings(true);

        const refresh = () => {
            loadBookings(false);
        };

        const interval = setInterval(refresh, 10000);

        window.addEventListener('focus', refresh);

        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', refresh);
        };
    }, [loadBookings]);

    const formatDateTime = (date) => {
        if (!date) {
            return '—';
        }

        const parsedDate = new Date(date);

        if (Number.isNaN(parsedDate.getTime())) {
            return '—';
        }

        return parsedDate.toLocaleString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    };

    if (loading) {
        return (
            <div className="page-loader">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div>
            <div className="dash-heading">
                <div>
                    <span className="eyebrow">RENTALS</span>

                    <h1>Manage bookings.</h1>

                    <p className="muted">
                        Booking and payment statuses are synchronized automatically.
                    </p>
                </div>
            </div>

            <div className="content-card table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Customer</th>
                            <th>Car</th>
                            <th>Pickup</th>
                            <th>Drop / Return</th>
                            <th>Duration</th>
                            <th>Total</th>
                            <th>Booking</th>
                            <th>Payment</th>
                            <th>Action</th>
                        </tr>
                    </thead>

                    <tbody>
                        {bookings.map((booking) => (
                            <tr key={booking._id}>
                                <td>
                                    <strong>
                                        {booking.userId?.firstName || ''}{' '}
                                        {booking.userId?.lastName || ''}
                                    </strong>

                                    <br />

                                    <small className="muted">{booking.userId?.email || ''}</small>
                                </td>

                                <td>{booking.carId?.name || 'Car'}</td>

                                <td>
                                    <strong>{formatDateTime(booking.pickupDateTime)}</strong>
                                </td>

                                <td>
                                    <strong>{formatDateTime(booking.returnDateTime)}</strong>
                                </td>

                                <td>
                                    {formatRentalDuration(
                                        booking.pickupDateTime,
                                        booking.returnDateTime
                                    )}
                                </td>

                                <td>₹{Number(booking.totalAmount || 0).toLocaleString('en-IN')}</td>

                                <td>{booking.bookingStatus}</td>

                                <td>{booking.paymentStatus}</td>

                                <td>
                                    <Link
                                        to={`/admin/bookings/${booking._id}`}
                                        className="table-btn"
                                    >
                                        Manage
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {!bookings.length && (
                    <div className="empty-state py-5">
                        <h3>No bookings found</h3>

                        <p>New customer bookings will appear here automatically.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
