import { motion } from 'framer-motion';
import { ShieldCheck, Car, Users, Clock3 } from 'lucide-react';
export default function About() {
    return (
        <div className="container section-space">
            <motion.div
                className="page-hero"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <span className="eyebrow">ABOUT I-CAR</span>
                <h1>
                    Better cars. Simple booking.
                    <br />
                    <span>Better journeys.</span>
                </h1>
                <p>
                    I-CAR is a modern car rental platform designed to make discovering, booking and
                    managing rentals straightforward.
                </p>
            </motion.div>
            <div className="feature-grid about-features">
                <div>
                    <Car />
                    <h3>Curated fleet</h3>
                    <p>
                        From city cars to comfortable family vehicles, manage the fleet from one
                        admin panel.
                    </p>
                </div>
                <div>
                    <ShieldCheck />
                    <h3>Secure accounts</h3>
                    <p>JWT-based authentication protects user and admin areas.</p>
                </div>
                <div>
                    <Users />
                    <h3>Customer first</h3>
                    <p>Users can manage bookings, favorites and reviews from their dashboard.</p>
                </div>
                <div>
                    <Clock3 />
                    <h3>24/7 access</h3>
                    <p>Browse vehicles and send booking requests whenever you need them.</p>
                </div>
            </div>
        </div>
    );
}
