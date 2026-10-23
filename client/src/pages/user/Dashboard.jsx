import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Heart, Wallet, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getMyBookings } from '../../services/bookingService';
import { getFavorites } from '../../services/carService';
export default function Dashboard() {
    const { user } = useAuth();
    const [b, setB] = useState([]);
    const [f, setF] = useState([]);
    useEffect(() => {
        Promise.all([getMyBookings(), getFavorites()])
            .then(([a, c]) => {
                setB(a.data.bookings || []);
                setF(c.data.favorites || []);
            })
            .catch(() => {});
    }, []);
    const active = b.filter((x) =>
        ['Pending', 'Confirmed', 'Active'].includes(x.bookingStatus)
    ).length;
    return (
        <div>
            <div className="dash-heading">
                <div>
                    <span className="eyebrow">WELCOME BACK</span>
                    <h1>{user?.firstName}, ready to go?</h1>
                </div>
                <Link to="/cars" className="btn btn-primary-custom">
                    Book a car
                </Link>
            </div>
            <div className="metric-grid">
                <div className="metric-card">
                    <CalendarDays />
                    <span>Total bookings</span>
                    <strong>{b.length}</strong>
                </div>
                <div className="metric-card">
                    <Wallet />
                    <span>Active bookings</span>
                    <strong>{active}</strong>
                </div>
                <div className="metric-card">
                    <Heart />
                    <span>Favorites</span>
                    <strong>{f.length}</strong>
                </div>
            </div>
            <div className="content-card">
                <div className="card-head">
                    <h3>Recent bookings</h3>
                    <Link to="/my-bookings">
                        View all <ArrowRight size={15} />
                    </Link>
                </div>
                {b.slice(0, 5).map((x) => (
                    <div className="table-row" key={x._id}>
                        <span>{x.carId?.name || 'Car'}</span>
                        <span>{x.bookingStatus}</span>
                        <strong>₹{x.totalAmount}</strong>
                    </div>
                ))}
                {!b.length && <p className="muted">No bookings yet.</p>}
            </div>
        </div>
    );
}
