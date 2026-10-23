import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { LayoutDashboard, User, CalendarDays, Heart, Star, LogOut, FileWarning } from 'lucide-react';

import { useAuth } from '../context/AuthContext';

const links = [
    ['/dashboard', 'Dashboard', LayoutDashboard],
    ['/profile', 'Profile', User],
    ['/my-bookings', 'Bookings', CalendarDays],
    ['/favorites', 'Favorites', Heart],
    ['/my-reviews', 'Reviews', Star],
    ['/my-challans', 'My Challans', FileWarning],
];

export default function UserLayout() {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();

            // Go to home page after logout
            navigate('/', {
                replace: true,
            });
        } catch (error) {
            console.error('Logout failed:', error);

            // Even if backend logout fails,
            // don't keep the user on account page.
            navigate('/', {
                replace: true,
            });
        }
    };

    return (
        <div className="dashboard-shell">
            {/* SIDEBAR */}
            <aside className="dashboard-sidebar">
                {/* TITLE */}
                <div className="side-title">My Account</div>

                {/* NAVIGATION */}
                <div className="sidebar-links">
                    {links.map(([to, label, Icon]) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) => (isActive ? 'active' : '')}
                        >
                            <Icon size={18} />

                            <span>{label}</span>
                        </NavLink>
                    ))}
                </div>

                {/* LOGOUT */}
                <button type="button" className="sidebar-logout" onClick={handleLogout}>
                    <LogOut size={18} />

                    <span>Logout</span>
                </button>
            </aside>

            {/* PAGE CONTENT */}
            <section className="dashboard-content">
                <Outlet />
            </section>
        </div>
    );
}
