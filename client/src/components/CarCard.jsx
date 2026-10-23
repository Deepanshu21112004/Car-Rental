import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import Swal from 'sweetalert2';

import { getCarImage, getFavorites, toggleFavorite } from '../services/carService';

import { useAuth } from '../context/AuthContext';

export default function CarCard({ car, onFavoriteChange }) {
    const { user } = useAuth();

    const [isFavorite, setIsFavorite] = useState(false);
    const [favoriteLoading, setFavoriteLoading] = useState(false);

    /*
     * Load favorite status for this car
     */
    useEffect(() => {
        const loadFavoriteStatus = async () => {
            if (!user || !car?._id) {
                setIsFavorite(false);
                return;
            }

            try {
                const response = await getFavorites();

                const favorites = response.data?.favorites || [];

                const exists = favorites.some(
                    (favorite) => String(favorite.carId?._id || favorite.carId) === String(car._id)
                );

                setIsFavorite(exists);
            } catch (error) {
                console.error('Failed to load favorite status:', error);
            }
        };

        loadFavoriteStatus();
    }, [user, car?._id]);

    /*
     * Add / Remove favorite
     */
    const handleFavorite = async () => {
        if (!user) {
            Swal.fire({
                icon: 'info',
                title: 'Login required',
                text: 'Please login to add cars to favorites.',
                confirmButtonColor: '#2448ff',
            });

            return;
        }

        if (favoriteLoading) {
            return;
        }

        try {
            setFavoriteLoading(true);

            const response = await toggleFavorite(car._id);

            const newFavoriteStatus = Boolean(response.data?.favorited);

            setIsFavorite(newFavoriteStatus);

            /*
             * Notify parent component.
             * Favorites page uses this to remove the card
             * from its local list.
             */
            if (onFavoriteChange) {
                onFavoriteChange(newFavoriteStatus);
            }

            /*
             * SUCCESS POPUP
             */
            if (newFavoriteStatus) {
                Swal.fire({
                    icon: 'success',
                    title: 'Added to Favorites',
                    text: 'Car has been added to your favorites.',
                    timer: 1500,
                    showConfirmButton: false,
                });
            } else {
                Swal.fire({
                    icon: 'success',
                    title: 'Removed from Favorites',
                    text: 'Car has been removed from your favorites.',
                    timer: 1500,
                    showConfirmButton: false,
                });
            }
        } catch (error) {
            console.error('Favorite error:', error);

            Swal.fire({
                icon: 'error',
                title: 'Unable to update favorite',
                text: error.response?.data?.message || 'Please try again.',
                confirmButtonColor: '#2448ff',
            });
        } finally {
            setFavoriteLoading(false);
        }
    };

    const image = getCarImage(car?.images?.[0]) || '/car-placeholder.svg';

    return (
        <article className="car-card">
            {/* =================================================
                CAR IMAGE
            ================================================= */}

            <div className="car-card-image-wrap">
                <img src={image} alt={car?.name || 'Car'} className="car-card-image" />

                {/* =================================================
                    FAVORITE HEART
                ================================================= */}

                {user && (
                    <button
                        type="button"
                        className={`favorite-button ${isFavorite ? 'active' : ''}`}
                        onClick={handleFavorite}
                        disabled={favoriteLoading}
                        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                        <Heart
                            size={21}
                            strokeWidth={2.3}
                            fill={isFavorite ? 'currentColor' : 'none'}
                        />
                    </button>
                )}
            </div>

            {/* =================================================
                CAR DETAILS
            ================================================= */}

            <div className="car-card-body">
                <div className="car-card-heading">
                    <div>
                        <span className="eyebrow">{car?.brand || 'I-CAR'}</span>

                        <h3>{car?.name || 'Car'}</h3>
                    </div>

                    <strong>
                        ₹{Number(car?.hourlyRate || 0).toLocaleString('en-IN')}
                        <small>/hr</small>
                    </strong>
                </div>

                <p>{car?.description || 'Comfortable and reliable rental car.'}</p>

                <div className="car-card-meta">
                    <span>{car?.fuelType || 'Petrol'}</span>

                    <span>{car?.transmission || 'Automatic'}</span>

                    <span>{car?.seats || 5} Seats</span>
                </div>

                <div className="car-card-actions">
                    <Link to={`/cars/${car._id}`} className="btn btn-outline-custom">
                        View Details
                    </Link>

                    <Link to={`/booking/${car._id}`} className="btn btn-primary-custom">
                        Book Now
                    </Link>
                </div>
            </div>
        </article>
    );
}
