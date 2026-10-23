import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../../services/api';
export default function ResetPassword() {
    const [p] = useSearchParams();
    const nav = useNavigate();
    const [token] = useState(p.get('token') || '');
    const [pw, setPw] = useState('');
    const submit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/auth/reset-password', { token, password: pw });
            Swal.fire({ icon: 'success', title: 'Password updated' });
            nav('/login');
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Reset failed',
                text: err.response?.data?.message || 'Invalid or expired token',
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
                <h1>Set a new password.</h1>
                <form className="auth-form" onSubmit={submit}>
                    <label>
                        Reset token
                        <input
                            required
                            value={token}
                            onChange={() => {}}
                            placeholder="Paste token"
                        />
                    </label>
                    <label>
                        New password
                        <input
                            required
                            minLength="6"
                            type="password"
                            value={pw}
                            onChange={(e) => setPw(e.target.value)}
                        />
                    </label>
                    <button className="btn btn-primary-custom w-100">Update password</button>
                </form>
            </div>
            <div className="auth-art">
                <img src="/car-hero.svg" alt="car" />
            </div>
        </div>
    );
}
