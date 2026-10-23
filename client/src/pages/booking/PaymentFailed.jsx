import { Link } from 'react-router-dom';
export default function PaymentFailed() {
    return (
        <div className="container section-space text-center">
            <div className="empty-state">
                <span className="eyebrow">PAYMENT FAILED</span>
                <h1>Payment could not be completed.</h1>
                <p>Please try again from your booking page.</p>
                <Link to="/my-bookings" className="btn btn-primary-custom">
                    Back to bookings
                </Link>
            </div>
        </div>
    );
}
