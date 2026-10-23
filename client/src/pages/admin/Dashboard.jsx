import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Car, Users, CalendarDays, IndianRupee } from 'lucide-react';
import api from '../../services/api';
export default function Dashboard() {
    const [s, setS] = useState({});
    useEffect(() => {
        api.get('/admin/statistics')
            .then((r) => setS(r.data))
            .catch(() => {});
    }, []);
    return (
        <div>
            <div className="dash-heading">
                <div>
                    <span className="eyebrow">ADMIN</span>
                    <h1>Dashboard overview.</h1>
                </div>
                <Link to="/admin/cars/add" className="btn btn-primary-custom">
                    + Add car
                </Link>
            </div>
            <div className="metric-grid">
                <div className="metric-card">
                    <Car />
                    <span>Total cars</span>
                    <strong>{s.cars ?? 0}</strong>
                </div>
                <div className="metric-card">
                    <Users />
                    <span>Users</span>
                    <strong>{s.users ?? 0}</strong>
                </div>
                <div className="metric-card">
                    <CalendarDays />
                    <span>Bookings</span>
                    <strong>{s.bookings ?? 0}</strong>
                </div>
                <div className="metric-card">
                    <IndianRupee />
                    <span>Revenue</span>
                    <strong>₹{s.revenue ?? 0}</strong>
                </div>
            </div>
            <div className="content-card">
                <h3>Quick actions</h3>
                <div className="quick-actions">
                    <Link to="/admin/cars">Manage cars</Link>
                    <Link to="/admin/users">Manage users</Link>
                    <Link to="/admin/bookings">Manage bookings</Link>
                    <Link to="/admin/payments">Payments</Link>
                </div>
            </div>
        </div>
    );
}
