import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';

import { getCars, deleteCar, getCarImage } from '../../services/carService';

export default function Cars() {
    const [cars, setCars] = useState([]);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('all');
    const [loading, setLoading] = useState(true);

    const load = async () => {
        try {
            setLoading(true);

            const response = await getCars();

            setCars(response.data.cars || []);
        } catch (error) {
            console.error('Unable to load cars:', error);

            Swal.fire('Error', error.response?.data?.message || 'Unable to load cars', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const del = async (id) => {
        const result = await Swal.fire({
            title: 'Delete this car?',
            text: 'This action cannot be undone.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            reverseButtons: true,
        });

        if (!result.isConfirmed) {
            return;
        }

        try {
            await deleteCar(id);

            setCars((previousCars) => previousCars.filter((car) => car._id !== id));

            Swal.fire({
                icon: 'success',
                title: 'Car deleted',
                text: 'The car has been removed successfully.',
                timer: 1500,
                showConfirmButton: false,
            });
        } catch (error) {
            Swal.fire('Error', error.response?.data?.message || 'Unable to delete', 'error');
        }
    };

    const filteredCars = useMemo(() => {
        const searchText = search.trim().toLowerCase();

        return cars.filter((car) => {
            const matchesSearch =
                !searchText ||
                car.name?.toLowerCase().includes(searchText) ||
                car.brand?.toLowerCase().includes(searchText) ||
                car.model?.toLowerCase().includes(searchText) ||
                String(car.year || '')
                    .toLowerCase()
                    .includes(searchText);

            const matchesStatus =
                status === 'all' ||
                (status === 'available' && car.isAvailable) ||
                (status === 'unavailable' && !car.isAvailable);

            return matchesSearch && matchesStatus;
        });
    }, [cars, search, status]);

    const totalCars = cars.length;

    const availableCars = cars.filter((car) => car.isAvailable).length;

    const unavailableCars = totalCars - availableCars;

    return (
        <div className="admin-cars-page">
            {/* HEADER */}

            <div className="dash-heading cars-heading">
                <div>
                    <span className="eyebrow">FLEET MANAGEMENT</span>

                    <h1>Manage your cars.</h1>

                    <p className="muted">
                        Manage your rental fleet, availability and hourly pricing.
                    </p>
                </div>

                <Link to="/admin/cars/add" className="btn btn-primary-custom">
                    + Add car
                </Link>
            </div>

            {/* SUMMARY */}

            <div className="cars-summary-grid">
                <div className="cars-summary-card">
                    <div className="cars-summary-icon">🚗</div>

                    <div>
                        <span>Total Cars</span>

                        <strong>{totalCars}</strong>
                    </div>
                </div>

                <div className="cars-summary-card available-card">
                    <div className="cars-summary-icon">✓</div>

                    <div>
                        <span>Available</span>

                        <strong>{availableCars}</strong>
                    </div>
                </div>

                <div className="cars-summary-card unavailable-card">
                    <div className="cars-summary-icon">×</div>

                    <div>
                        <span>Unavailable</span>

                        <strong>{unavailableCars}</strong>
                    </div>
                </div>
            </div>

            {/* SEARCH */}

            <div className="content-card cars-toolbar">
                <div className="cars-search">
                    <span className="cars-search-icon">🔍</span>

                    <input
                        type="text"
                        placeholder="Search by car name, brand, model or year..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="cars-filter">
                    <label htmlFor="car-status">Status</label>

                    <select
                        id="car-status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                    >
                        <option value="all">All Cars</option>

                        <option value="available">Available</option>

                        <option value="unavailable">Unavailable</option>
                    </select>
                </div>
            </div>

            {/* RESULTS */}

            <div className="cars-results-row">
                <div>
                    <strong>{filteredCars.length}</strong>{' '}
                    {filteredCars.length === 1 ? 'car' : 'cars'} found
                </div>

                {(search || status !== 'all') && (
                    <button
                        type="button"
                        className="cars-clear-btn"
                        onClick={() => {
                            setSearch('');
                            setStatus('all');
                        }}
                    >
                        Clear filters
                    </button>
                )}
            </div>

            {/* LOADING */}

            {loading && (
                <div className="content-card cars-empty">
                    <div className="cars-loading-spinner" />

                    <p>Loading your fleet...</p>
                </div>
            )}

            {/* EMPTY */}

            {!loading && filteredCars.length === 0 && (
                <div className="content-card cars-empty">
                    <div className="cars-empty-icon">🚗</div>

                    <h3>No cars found</h3>

                    <p className="muted">Try changing your search or filter.</p>

                    {cars.length === 0 && (
                        <Link to="/admin/cars/add" className="btn btn-primary-custom">
                            + Add your first car
                        </Link>
                    )}
                </div>
            )}

            {/* CAR GRID */}

            {!loading && filteredCars.length > 0 && (
                <div className="admin-cars-grid">
                    {filteredCars.map((car) => {
                        /*
                            |--------------------------------------------------------------------------
                            | GET FIRST CAR IMAGE
                            |--------------------------------------------------------------------------
                            |
                            | Your Car model contains:
                            |
                            | images: [String]
                            |
                            | Therefore the first uploaded image is:
                            |
                            | car.images[0]
                            |
                            | getCarImage() then converts relative
                            | /uploads/... paths into the correct
                            | backend URL.
                            |
                            */

                        const imagePath =
                            Array.isArray(car.images) && car.images.length > 0
                                ? car.images[0]
                                : null;

                        const imageUrl = getCarImage(imagePath);

                        return (
                            <div className="admin-car-card" key={car._id}>
                                {/* IMAGE */}

                                <div className="admin-car-image">
                                    <img
                                        src={imageUrl}
                                        alt={car.name || 'Car'}
                                        loading="lazy"
                                        onError={(event) => {
                                            /*
                                                If the uploaded
                                                image cannot be
                                                loaded, use the
                                                project's standard
                                                placeholder.
                                                */

                                            if (
                                                event.currentTarget.src !== '/car-placeholder.svg'
                                            ) {
                                                event.currentTarget.src = '/car-placeholder.svg';
                                            }
                                        }}
                                    />

                                    {/* STATUS */}

                                    <span
                                        className={`car-status-badge ${
                                            car.isAvailable ? 'available' : 'unavailable'
                                        }`}
                                    >
                                        <span className="status-dot" />

                                        {car.isAvailable ? 'Available' : 'Unavailable'}
                                    </span>
                                </div>

                                {/* CONTENT */}

                                <div className="admin-car-content">
                                    <div className="admin-car-title-row">
                                        <div>
                                            <h3>{car.name}</h3>

                                            <p>
                                                {car.brand}

                                                {car.model && ` • ${car.model}`}

                                                {car.year && ` • ${car.year}`}
                                            </p>
                                        </div>
                                    </div>

                                    {/* DETAILS */}

                                    <div className="admin-car-details">
                                        <div>
                                            <span>RATE</span>

                                            <strong>
                                                ₹
                                                {Number(car.hourlyRate || 0).toLocaleString(
                                                    'en-IN'
                                                )}
                                                <small>/hr</small>
                                            </strong>
                                        </div>

                                        <div>
                                            <span>FUEL</span>

                                            <strong className="fuel-value">
                                                {car.fuelType || '—'}
                                            </strong>
                                        </div>
                                    </div>

                                    {/* ACTIONS */}

                                    <div className="admin-car-actions">
                                        <Link
                                            to={`/admin/cars/edit/${car._id}`}
                                            className="car-edit-btn"
                                        >
                                            ✎ Edit
                                        </Link>

                                        <button
                                            type="button"
                                            className="car-delete-btn"
                                            onClick={() => del(car._id)}
                                        >
                                            🗑 Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
