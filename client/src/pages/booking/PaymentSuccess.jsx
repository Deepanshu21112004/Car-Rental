import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { verifyPayment } from '../../services/paymentService';
import { useAuth } from '../../context/AuthContext';

export default function PaymentSuccess() {
    const [searchParams] = useSearchParams();

    const { user, loading: authLoading } = useAuth();

    const [status, setStatus] = useState('verifying');
    const [message, setMessage] = useState('Please wait while we verify your payment.');

    const [bookingStatus, setBookingStatus] = useState(null);

    useEffect(() => {
        if (authLoading) return;

        const sessionId = searchParams.get('session_id');

        if (!sessionId) {
            setStatus('failed');
            setMessage('Stripe session ID is missing.');
            return;
        }

        if (!user) {
            setStatus('failed');
            setMessage(
                'Your login session could not be restored. Please log in and check My Bookings.'
            );
            return;
        }

        const verify = async () => {
            try {
                const response = await verifyPayment(sessionId);

                setStatus('success');

                setMessage(response.data?.message || 'Payment verified successfully.');

                setBookingStatus(response.data?.bookingStatus || 'Confirmed');
            } catch (error) {
                console.error('Payment verification error:', error);

                setStatus('failed');

                setMessage(error.response?.data?.message || 'Payment verification failed.');
            }
        };

        verify();
    }, [authLoading, user, searchParams]);

    return (
        <div className="container section-space text-center">
            {status === 'verifying' && (
                <div className="empty-state">
                    <span className="eyebrow">PAYMENT</span>

                    <h1>Verifying Payment...</h1>

                    <p>{message}</p>

                    <div className="spinner mx-auto"></div>
                </div>
            )}

            {status === 'success' && (
                <div className="empty-state">
                    <span className="eyebrow">PAYMENT SUCCESSFUL</span>

                    <h1>Booking Confirmed</h1>

                    <p>{message}</p>

                    <p>
                        Booking status: <strong>{bookingStatus}</strong>
                    </p>

                    <Link to="/my-bookings" className="btn btn-primary-custom">
                        View My Bookings
                    </Link>
                </div>
            )}

            {status === 'failed' && (
                <div className="empty-state">
                    <span className="eyebrow">PAYMENT VERIFICATION</span>

                    <h1>Payment Could Not Be Verified</h1>

                    <p>{message}</p>

                    <Link to="/my-bookings" className="btn btn-primary-custom">
                        Back to Bookings
                    </Link>
                </div>
            )}
        </div>
    );
}
