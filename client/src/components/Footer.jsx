import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, ArrowUpRight } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="footer">
            <div className="container">
                <div className="footer-grid">
                    <div>
                        <Link to="/" className="brand footer-brand">
                            <span className="brand-mark">I</span>-CAR
                            <span className="brand-dot">.</span>
                        </Link>
                        <p className="footer-copy">
                            Simple, reliable and comfortable car rentals for every journey.
                        </p>
                        <div className="social-row">
                            <span>in</span>
                            <span>f</span>
                            <span>ig</span>
                        </div>
                    </div>
                    <div>
                        <h6>Company</h6>
                        <Link to="/about">About Us</Link>
                        <Link to="/cars">Cars</Link>
                        <Link to="/contact">Contact</Link>
                    </div>
                    <div>
                        <h6>Support</h6>
                        <Link to="/faq">FAQ</Link>
                        <Link to="/login">My Account</Link>
                        <Link to="/terms">Terms</Link>
                    </div>
                    <div>
                        <h6>Contact</h6>
                        <p>
                            <Mail size={15} /> support@icar-rental.com
                        </p>
                        <p>
                            <Phone size={15} /> +91 98765 43210
                        </p>
                        <p>
                            <MapPin size={15} /> Amritsar, Punjab
                        </p>
                    </div>
                </div>
                <div className="footer-bottom">
                    <span>© 2026 I-CAR. All rights reserved.</span>
                    <span>
                        Built for easy travel <ArrowUpRight size={14} />
                    </span>
                </div>
            </div>
        </footer>
    );
}
