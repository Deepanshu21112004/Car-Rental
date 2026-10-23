import { useState } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../../services/api';
export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const submit = async (e) => {
        e.preventDefault();
        try {
            const r = await api.post('/auth/forgot-password', { email });
            Swal.fire({ icon: 'success', title: 'Request received', text: r.data.message });
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err.response?.data?.message || 'Unable to process request',
            });
        }
    };
    return (
        <div className="auth-page">
            <div className="auth-panel">
                <Link to="/" className="brand">
                    <span className="brand-mark">I</span>-CAR<span className="brand-dot">.</span>
                </Link>
                <span className="eyebrow">PASSWORD RESET</span>
                <h1>Forgot your password?</h1>
                <p>
                    Enter your account email. In development, the reset token is returned by the API
                    response.
                </p>
                <form className="auth-form" onSubmit={submit}>
                    <label>
                        Email
                        <input
                            required
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </label>
                    <button className="btn btn-primary-custom w-100">Send reset request</button>
                    <Link to="/login" className="auth-switch">
                        Back to sign in
                    </Link>
                </form>
            </div>
            <div className="auth-art">
                <img src="/car-hero.svg" alt="car" />
            </div>
        </div>
    );
}
