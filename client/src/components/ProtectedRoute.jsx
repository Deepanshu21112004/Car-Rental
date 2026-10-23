import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
    const { user, loading } = useAuth();
    const location = useLocation();
    if (loading)
        return (
            <div className="page-loader">
                <div className="spinner"></div>
            </div>
        );
    if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    return <Outlet />;
}
