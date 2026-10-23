import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function UserRoute() {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="page-loader">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    }

    /*
     * ADMIN accounts cannot enter
     * the normal user's account section.
     */
    if (user.role === 'ADMIN') {
        return <Navigate to="/admin" replace />;
    }

    return <Outlet />;
}
