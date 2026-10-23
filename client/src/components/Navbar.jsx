import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, UserRound, LogOut, LayoutDashboard, LogIn, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/navbar.css';

export default function Navbar() {
    const [open, setOpen] = useState(false);

    const { user, logout } = useAuth();

    const navigate = useNavigate();

    const signOut = async () => {
        await logout();

        setOpen(false);

        navigate('/');
    };

    return (
        <header className="site-header">
            <div className="container header-inner">
                {/* LOGO */}
                <Link to="/" className="brand" onClick={() => setOpen(false)}>
                    <span className="brand-mark">I</span>
                    -CAR
                    <span className="brand-dot">.</span>
                </Link>

                {/* MOBILE MENU BUTTON */}
                <button className="mobile-toggle" onClick={() => setOpen(!open)} aria-label="Menu">
                    {open ? <X /> : <Menu />}
                </button>

                {/* NAVIGATION */}
                <nav className={`main-nav ${open ? 'show' : ''}`}>
                    <NavLink to="/" onClick={() => setOpen(false)}>
                        Home
                    </NavLink>

                    <NavLink to="/about" onClick={() => setOpen(false)}>
                        About Us
                    </NavLink>

                    <NavLink to="/cars" onClick={() => setOpen(false)}>
                        Cars
                    </NavLink>

                    <NavLink to="/faq" onClick={() => setOpen(false)}>
                        Help
                    </NavLink>

                    {user && (
                        <NavLink to="/my-bookings" onClick={() => setOpen(false)}>
                            My Bookings
                        </NavLink>
                    )}
                </nav>

                {/* RIGHT SIDE */}
                <div className="header-actions">
                    {user ? (
                        <>
                            {/* DASHBOARD BUTTON */}
                            <Link
                                to={user.role === 'ADMIN' ? '/admin' : '/dashboard'}
                                className="icon-action"
                                onClick={() => setOpen(false)}
                            >
                                {user.role === 'ADMIN' ? (
                                    <LayoutDashboard size={17} />
                                ) : (
                                    <UserRound size={17} />
                                )}

                                <span>{user.firstName || 'Account'}</span>
                            </Link>

                            {/* LOGOUT */}
                            <button className="logout-btn" onClick={signOut} title="Logout">
                                <LogOut size={16} />
                            </button>
                        </>
                    ) : (
                        <>
                            {/* LOGIN */}
                            <Link
                                to="/login"
                                className="header-login"
                                onClick={() => setOpen(false)}
                            >
                                <LogIn size={16} />
                                <span>Login</span>
                            </Link>

                            {/* REGISTER */}
                            <Link
                                to="/register"
                                className="header-cta"
                                onClick={() => setOpen(false)}
                            >
                                <UserPlus size={16} />
                                <span>Register</span>
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
