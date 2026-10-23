import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';

import { getAdminPayments } from '../../services/paymentService';

export default function Payments() {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadPayments = useCallback(async (showLoader = false) => {
        try {
            if (showLoader) {
                setLoading(true);
            }

            const response = await getAdminPayments();

            setPayments(response.data?.payments || []);
        } catch (error) {
            console.error('Admin payments error:', error);

            if (showLoader) {
                Swal.fire({
                    icon: 'error',
                    title: 'Unable to load payments',
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
        loadPayments(true);

        const refresh = () => {
            loadPayments(false);
        };

        const interval = setInterval(refresh, 10000);

        window.addEventListener('focus', refresh);

        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', refresh);
        };
    }, [loadPayments]);

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
                    <span className="eyebrow">PAYMENTS</span>

                    <h1>Payment management.</h1>

                    <p className="muted">
                        Payment records are synchronized with booking status automatically.
                    </p>
                </div>
            </div>

            <div className="content-card table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Booking ID</th>
                            <th>Customer</th>
                            <th>Car</th>
                            <th>Pickup</th>
                            <th>Drop / Return</th>
                            <th>Amount</th>
                            <th>Booking Status</th>
                            <th>Payment Status</th>
                            <th>Payment Date &amp; Time</th>
                            <th>Action</th>
                        </tr>
                    </thead>

                    <tbody>
                        {payments.map((payment) => {
                            const booking = payment.bookingId;
                            const user = payment.userId;
                            const car = booking?.carId;

                            return (
                                <tr key={payment._id}>
                                    <td>
                                        <small>{booking?._id || '—'}</small>
                                    </td>

                                    <td>
                                        <strong>
                                            {user?.firstName || ''} {user?.lastName || ''}
                                        </strong>

                                        <br />

                                        <small className="muted">{user?.email || ''}</small>
                                    </td>

                                    <td>{car?.name || 'Car'}</td>

                                    <td>
                                        <strong>{formatDateTime(booking?.pickupDateTime)}</strong>
                                    </td>

                                    <td>
                                        <strong>{formatDateTime(booking?.returnDateTime)}</strong>
                                    </td>

                                    <td>₹{Number(payment.amount || 0).toLocaleString('en-IN')}</td>

                                    <td>{booking?.bookingStatus || '—'}</td>

                                    <td>{payment.paymentStatus || '—'}</td>

                                    <td>{formatDateTime(payment.createdAt)}</td>

                                    <td>
                                        {booking?._id ? (
                                            <Link
                                                to={`/admin/bookings/${booking._id}`}
                                                className="table-btn"
                                            >
                                                Manage
                                            </Link>
                                        ) : (
                                            '—'
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {!payments.length && (
                    <div className="empty-state py-5">
                        <h3>No payments found</h3>

                        <p>
                            Payment records will appear here when customers make bookings and
                            payments.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
