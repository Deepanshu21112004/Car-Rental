import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, ShieldCheck, Clock3, MapPin, ChevronRight } from 'lucide-react';
import { getCars } from '../../services/carService';
import CarCard from '../../components/CarCard';
import '../../styles/home.css';

const fade = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.55 } },
};

export default function Home() {
    const [cars, setCars] = useState([]);
    const navigate = useNavigate();
    useEffect(() => {
        getCars({ limit: 3 })
            .then((r) => setCars(r.data.cars || []))
            .catch(() => {});
    }, []);
    const submit = (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const car = fd.get('car');
        if (car) navigate(`/booking/${car}`);
        else navigate('/cars');
    };

    return (
        <div>
            <section className="hero-section">
                <div className="container hero-grid">
                    <motion.div
                        className="hero-copy"
                        variants={fade}
                        initial="hidden"
                        animate="show"
                    >
                        <span className="eyebrow">SMARTER WAY TO TRAVEL</span>
                        <h1>
                            Rent A Car,
                            <br />
                            <span>Drive With Ease!</span>
                        </h1>
                        <p>
                            Affordable, reliable and hassle-free car rentals for every journey. Book
                            your ride now.
                        </p>
                        <div className="hero-buttons">
                            <Link to="/cars" className="btn btn-primary-custom">
                                Browse Cars <ArrowRight size={17} />
                            </Link>
                            <Link to="/about" className="text-link">
                                How it works <ChevronRight size={16} />
                            </Link>
                        </div>
                        <div className="trust-row">
                            <span>
                                <CheckCircle2 /> Easy booking
                            </span>
                            <span>
                                <ShieldCheck /> Secure payment
                            </span>
                        </div>
                    </motion.div>
                    <motion.div
                        className="hero-visual"
                        initial={{ opacity: 0, scale: 0.94 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.7 }}
                    >
                        <div className="hero-car-panel">
                            <div className="mini-labels">
                                <span>
                                    Wide Range
                                    <br />
                                    Of Vehicles
                                </span>
                                <span>
                                    Affordable
                                    <br />
                                    Pricing
                                </span>
                            </div>
                            <img src="/car-hero.svg" alt="Car" />
                        </div>
                        <div className="stats-panel">
                            <div>
                                <strong>126k+</strong>
                                <small>TOTAL USER</small>
                            </div>
                            <div>
                                <strong>5+</strong>
                                <small>YEARS EXPERIENCE</small>
                            </div>
                            <div>
                                <strong>4.8</strong>
                                <small>AVERAGE REVIEW</small>
                            </div>
                            <div>
                                <strong>24/7</strong>
                                <small>SERVICES</small>
                            </div>
                        </div>
                    </motion.div>
                </div>
                <form className="booking-widget container" onSubmit={submit}>
                    <div className="rate-tabs">
                        <button type="button" className="active">
                            Distance
                        </button>
                        <button type="button">Hourly</button>
                        <button type="button">Flat Rate</button>
                    </div>
                    <select name="car" className="form-control-custom">
                        <option value="">Select a car</option>
                        {cars.map((c) => (
                            <option key={c._id} value={c._id}>
                                {c.name} — ₹{c.hourlyRate}/hr
                            </option>
                        ))}
                    </select>
                    <input
                        name="pickupLocation"
                        className="form-control-custom"
                        placeholder="Pickup address"
                    />
                    <input
                        name="returnLocation"
                        className="form-control-custom"
                        placeholder="Drop off address"
                    />
                    <input
                        type="datetime-local"
                        name="pickupDateTime"
                        className="form-control-custom"
                    />
                    <button className="btn btn-primary-custom reserve-btn">Reserve Now</button>
                </form>
            </section>

            <section className="section-space">
                <div className="container">
                    <div className="section-heading">
                        <div>
                            <span className="eyebrow">OUR FLEET</span>
                            <h2>
                                Choose the ride
                                <br />
                                <span>that fits you.</span>
                            </h2>
                        </div>
                        <Link to="/cars" className="text-link">
                            View all cars <ArrowRight size={16} />
                        </Link>
                    </div>
                    <div className="car-grid">
                        {cars.map((c) => (
                            <CarCard key={c._id} car={c} />
                        ))}
                    </div>
                    {!cars.length && (
                        <div className="empty-state">
                            No cars have been added yet. Admin can add the first car from the
                            dashboard.
                        </div>
                    )}
                </div>
            </section>

            <section className="soft-section">
                <div className="container feature-grid">
                    <div>
                        <span className="eyebrow">WHY I-CAR</span>
                        <h2>Everything you need for a smoother journey.</h2>
                    </div>
                    <div className="feature-list">
                        <div>
                            <ShieldCheck />
                            <h4>Trusted & secure</h4>
                            <p>Verified cars and protected checkout.</p>
                        </div>
                        <div>
                            <Clock3 />
                            <h4>Flexible rentals</h4>
                            <p>Book for the hours that suit your plan.</p>
                        </div>
                        <div>
                            <MapPin />
                            <h4>Simple pickup</h4>
                            <p>Choose convenient pickup and return locations.</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
