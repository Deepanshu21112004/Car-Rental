import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import {
    LayoutDashboard,
    Car,
    Users,
    CalendarDays,
    CreditCard,
    Star,
    BarChart3,
    Settings,
    LogOut,
    FileWarning,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

const links = [
    ['/admin', 'Dashboard', LayoutDashboard],
    ['/admin/cars', 'Cars', Car],
    ['/admin/users', 'Users', Users],
    ['/admin/bookings', 'Bookings', CalendarDays],
    ['/admin/challans', 'Challans', FileWarning],
    ['/admin/payments', 'Payments', CreditCard],
    ['/admin/reviews', 'Reviews', Star],
    ['/admin/reports', 'Reports', BarChart3],
    ['/admin/settings', 'Settings', Settings],
];

export default function AdminLayout() {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Admin logout failed:', error);
        } finally {
            navigate('/', { replace: true });
        }
    };

    return (
        <div className="dashboard-shell admin-shell">
            <aside className="dashboard-sidebar">
                <div className="side-title">I-CAR Admin</div>

                <div className="sidebar-links">
                    {links.map(([to, label, Icon]) => (
                        <NavLink key={to} to={to} end={to === '/admin'}>
                            <Icon size={18} />
                            <span>{label}</span>
                        </NavLink>
                    ))}
                </div>

                <button type="button" className="sidebar-logout" onClick={handleLogout}>
                    <LogOut size={18} />
                    <span>Logout</span>
                </button>
            </aside>

            <section className="dashboard-content">
                <Outlet />
            </section>
        </div>
    );
}
