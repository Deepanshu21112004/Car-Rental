import { useState } from 'react';
import Swal from 'sweetalert2';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
export default function Profile() {
    const { user, refreshUser } = useAuth();
    const [f, setF] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        phone: user?.phone || '',
    });
    const submit = async (e) => {
        e.preventDefault();
        try {
            await api.put('/users/profile', f);
            await refreshUser();
            Swal.fire({
                icon: 'success',
                title: 'Profile updated',
                timer: 1500,
                showConfirmButton: false,
            });
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Update failed',
                text: err.response?.data?.message || 'Unable to update',
            });
        }
    };
    return (
        <div>
            <div className="dash-heading">
                <div>
                    <span className="eyebrow">PROFILE</span>
                    <h1>Personal details</h1>
                </div>
            </div>
            <form className="form-card" onSubmit={submit}>
                <div className="two-col">
                    <label>
                        First name
                        <input
                            value={f.firstName}
                            onChange={(e) => setF({ ...f, firstName: e.target.value })}
                        />
                    </label>
                    <label>
                        Last name
                        <input
                            value={f.lastName}
                            onChange={(e) => setF({ ...f, lastName: e.target.value })}
                        />
                    </label>
                </div>
                <label>
                    Email
                    <input value={user?.email || ''} disabled />
                </label>
                <label>
                    Phone
                    <input
                        value={f.phone}
                        onChange={(e) => setF({ ...f, phone: e.target.value })}
                    />
                </label>
                <button className="btn btn-primary-custom">Save changes</button>
            </form>
        </div>
    );
}
