import { useState } from 'react';
import Swal from 'sweetalert2';
import { Mail, Phone, MapPin } from 'lucide-react';
export default function Contact() {
    const [form, setForm] = useState({ name: '', email: '', message: '' });
    const submit = (e) => {
        e.preventDefault();
        Swal.fire({
            icon: 'success',
            title: 'Message received',
            text: 'Thanks! We will contact you shortly.',
            confirmButtonColor: '#2448ff',
        });
        setForm({ name: '', email: '', message: '' });
    };
    return (
        <div className="container section-space">
            <div className="page-hero compact">
                <span className="eyebrow">CONTACT</span>
                <h1>
                    Let's talk about <span>your journey.</span>
                </h1>
            </div>
            <div className="contact-grid">
                <div className="contact-card">
                    <h3>Get in touch</h3>
                    <p>Have a question about a vehicle or booking? Send us a message.</p>
                    <div className="contact-item">
                        <Mail /> support@icar-rental.com
                    </div>
                    <div className="contact-item">
                        <Phone /> +91 98765 43210
                    </div>
                    <div className="contact-item">
                        <MapPin /> Amritsar, Punjab
                    </div>
                </div>
                <form className="form-card" onSubmit={submit}>
                    <label>
                        Name
                        <input
                            required
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                    </label>
                    <label>
                        Email
                        <input
                            required
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                        />
                    </label>
                    <label>
                        Message
                        <textarea
                            required
                            rows="6"
                            value={form.message}
                            onChange={(e) => setForm({ ...form, message: e.target.value })}
                        />
                    </label>
                    <button className="btn btn-primary-custom">Send message</button>
                </form>
            </div>
        </div>
    );
}
