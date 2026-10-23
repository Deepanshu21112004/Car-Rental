import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
    const { login } = useAuth();

    const navigate = useNavigate();
    const location = useLocation();

    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });

    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    /*
     * Only allow a saved redirect when it belongs
     * to the correct type of account.
     */
    const getSafeRedirect = (user) => {
        const requestedPage = location.state?.from;

        /*
         * ADMIN
         *
         * Never send an admin to:
         * /dashboard
         * /profile
         * /my-bookings
         * /favorites
         * /my-reviews
         */
        if (user.role === 'ADMIN') {
            if (requestedPage && requestedPage.startsWith('/admin')) {
                return requestedPage;
            }

            return '/admin';
        }

        /*
         * NORMAL USER
         *
         * Never send a normal user to an admin page.
         */
        if (requestedPage && !requestedPage.startsWith('/admin')) {
            return requestedPage;
        }

        return '/dashboard';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.email || !formData.password) {
            Swal.fire({
                icon: 'warning',
                title: 'Missing details',
                text: 'Please enter your email and password.',
                confirmButtonColor: '#2448ff',
            });

            return;
        }

        setLoading(true);

        try {
            const response = await login(formData);

            const user = response.user;

            if (!user || !user.role) {
                throw new Error('Login succeeded but account role was not returned.');
            }

            const redirectPath = getSafeRedirect(user);

            navigate(redirectPath, {
                replace: true,
            });
        } catch (error) {
            console.error('Login error:', error);

            Swal.fire({
                icon: 'error',
                title: 'Login failed',
                text:
                    error.response?.data?.message || error.message || 'Invalid email or password.',
                confirmButtonColor: '#2448ff',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-panel">
                {/* LOGO */}
                <Link to="/" className="brand">
                    <span className="brand-mark">I</span>
                    -CAR
                    <span className="brand-dot">.</span>
                </Link>

                <span className="eyebrow">ACCOUNT LOGIN</span>

                <h1>Welcome back.</h1>

                <p>Sign in to manage your rentals, bookings and account.</p>

                <form className="auth-form" onSubmit={handleSubmit}>
                    {/* EMAIL */}
                    <label>
                        Email
                        <input
                            type="email"
                            name="email"
                            placeholder="Enter your email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            autoComplete="email"
                        />
                    </label>

                    {/* PASSWORD */}
                    <label>
                        Password
                        <input
                            type="password"
                            name="password"
                            placeholder="Enter your password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            autoComplete="current-password"
                        />
                    </label>

                    {/* OPTIONS */}
                    <div className="form-row-between">
                        <label className="check-label">
                            <input type="checkbox" />

                            <span>Remember me</span>
                        </label>

                        <Link to="/forgot-password">Forgot password?</Link>
                    </div>

                    {/* LOGIN BUTTON */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary-custom w-100"
                    >
                        {loading ? 'Signing in...' : 'Sign in'}
                    </button>

                    {/* REGISTER LINK */}
                    <p className="auth-switch">
                        Don't have an account? <Link to="/register">Create an account</Link>
                    </p>
                </form>
            </div>

            {/* RIGHT SIDE IMAGE */}
            <div className="auth-art">
                <img src="/car-hero.svg" alt="Car rental" />

                <h2>
                    Move freely.
                    <br />
                    Travel confidently.
                </h2>
            </div>
        </div>
    );
}
