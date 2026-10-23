import { useState } from 'react';
import Swal from 'sweetalert2';
export default function Settings() {
    const [s, setS] = useState({
        companyName: 'I-CAR',
        supportEmail: 'support@icar-rental.com',
        phone: '+91 98765 43210',
    });
    const submit = (e) => {
        e.preventDefault();
        Swal.fire({
            icon: 'success',
            title: 'Settings saved',
            timer: 1200,
            showConfirmButton: false,
        });
    };
    return (
        <div>
            <div className="dash-heading">
                <div>
                    <span className="eyebrow">SETTINGS</span>
                    <h1>Platform settings.</h1>
                </div>
            </div>
            <form className="form-card" onSubmit={submit}>
                <label>
                    Company name
                    <input
                        value={s.companyName}
                        onChange={(e) => setS({ ...s, companyName: e.target.value })}
                    />
                </label>
                <label>
                    Support email
                    <input
                        type="email"
                        value={s.supportEmail}
                        onChange={(e) => setS({ ...s, supportEmail: e.target.value })}
                    />
                </label>
                <label>
                    Phone
                    <input
                        value={s.phone}
                        onChange={(e) => setS({ ...s, phone: e.target.value })}
                    />
                </label>
                <button className="btn btn-primary-custom">Save settings</button>
            </form>
        </div>
    );
}
