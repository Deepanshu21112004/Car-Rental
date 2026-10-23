import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { useAuth } from '../../context/AuthContext';

export default function Register() {
    const { register } = useAuth();

    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
    });

    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        /*
         * Check passwords
         */
        if (formData.password !== formData.confirmPassword) {
            Swal.fire({
                icon: 'warning',
                title: 'Passwords do not match',
                text: 'Please enter the same password in both fields.',
                confirmButtonColor: '#2448ff',
            });

            return;
        }

        setLoading(true);

        try {
            await register({
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                phone: formData.phone,
                password: formData.password,
            });

            /*
             * Registration automatically logs
             * the user in because your backend
             * creates the authentication cookie.
             */
            navigate('/dashboard', { replace: true });
        } catch (error) {
            console.error('Registration error:', error);

            Swal.fire({
                icon: 'error',
                title: 'Registration failed',
                text: error.response?.data?.message || 'Please check your details and try again.',
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

                <span className="eyebrow">CREATE ACCOUNT</span>

                <h1>Start your journey.</h1>

                <p>Create an account and book your next car in minutes.</p>

                <form className="auth-form" onSubmit={handleSubmit}>
                    {/* FIRST + LAST NAME */}
                    <div className="two-col">
                        <label>
                            First name
                            <input
                                type="text"
                                name="firstName"
                                placeholder="First name"
                                value={formData.firstName}
                                onChange={handleChange}
                                required
                                autoComplete="given-name"
                            />
                        </label>

                        <label>
                            Last name
                            <input
                                type="text"
                                name="lastName"
                                placeholder="Last name"
                                value={formData.lastName}
                                onChange={handleChange}
                                required
                                autoComplete="family-name"
                            />
                        </label>
                    </div>

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

                    {/* PHONE */}
                    <label>
                        Phone
                        <input
                            type="tel"
                            name="phone"
                            placeholder="Enter your phone number"
                            value={formData.phone}
                            onChange={handleChange}
                            required
                            autoComplete="tel"
                        />
                    </label>

                    {/* PASSWORD */}
                    <label>
                        Password
                        <input
                            type="password"
                            name="password"
                            placeholder="Create a password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            minLength={6}
                            autoComplete="new-password"
                        />
                    </label>

                    {/* CONFIRM PASSWORD */}
                    <label>
                        Confirm password
                        <input
                            type="password"
                            name="confirmPassword"
                            placeholder="Confirm your password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                            minLength={6}
                            autoComplete="new-password"
                        />
                    </label>

                    {/* REGISTER BUTTON */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary-custom w-100"
                    >
                        {loading ? 'Creating account...' : 'Create account'}
                    </button>

                    {/* LOGIN LINK */}
                    <p className="auth-switch">
                        Already have an account? <Link to="/login">Sign in</Link>
                    </p>
                </form>
            </div>

            {/* RIGHT SIDE */}
            <div className="auth-art">
                <img src="/car-hero.svg" alt="Car rental" />

                <h2>
                    One account.
                    <br />
                    Every journey.
                </h2>
            </div>
        </div>
    );
}
