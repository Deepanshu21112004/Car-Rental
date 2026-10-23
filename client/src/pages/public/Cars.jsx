import { useEffect, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import CarCard from '../../components/CarCard';
import { getCars } from '../../services/carService';
export default function Cars() {
    const [cars, setCars] = useState([]);
    const [search, setSearch] = useState('');
    const [fuel, setFuel] = useState('');
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        getCars()
            .then((r) => setCars(r.data.cars || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);
    const filtered = cars.filter(
        (c) =>
            `${c.name} ${c.brand} ${c.model}`.toLowerCase().includes(search.toLowerCase()) &&
            (!fuel || c.fuelType === fuel)
    );
    return (
        <div className="container section-space">
            <div className="page-hero compact">
                <span className="eyebrow">OUR CARS</span>
                <h1>
                    Find a car for <span>your next trip.</span>
                </h1>
                <p>Browse the fleet, compare features and book online.</p>
            </div>
            <div className="filter-bar">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search cars..."
                    />
                </div>
                <div className="select-box">
                    <SlidersHorizontal size={17} />
                    <select value={fuel} onChange={(e) => setFuel(e.target.value)}>
                        <option value="">All fuel types</option>
                        <option>Petrol</option>
                        <option>Diesel</option>
                        <option>Electric</option>
                        <option>Hybrid</option>
                    </select>
                </div>
            </div>
            {loading ? (
                <div className="loading-box">
                    <div className="spinner" />
                </div>
            ) : (
                <div className="car-grid">
                    {filtered.map((c) => (
                        <CarCard key={c._id} car={c} />
                    ))}
                </div>
            )}
            {!loading && !filtered.length && (
                <div className="empty-state">No matching cars found.</div>
            )}
        </div>
    );
}
