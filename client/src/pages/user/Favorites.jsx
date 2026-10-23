import { useEffect, useState } from 'react';
import { getFavorites } from '../../services/carService';
import CarCard from '../../components/CarCard';
import Swal from 'sweetalert2';

export default function Favorites() {
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);

    /*
     * Load all favorite cars
     */
    const loadFavorites = async () => {
        try {
            setLoading(true);

            const response = await getFavorites();

            setFavorites(response.data?.favorites || []);
        } catch (error) {
            console.error('Load favorites error:', error);

            Swal.fire({
                icon: 'error',
                title: 'Unable to load favorites',
                text: error.response?.data?.message || 'Please try again later.',
                confirmButtonColor: '#2448ff',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFavorites();
    }, []);

    /*
     * When the heart is clicked inside the Favorites page,
     * CarCard already handles the API request.
     *
     * We ONLY remove the card from the local state here.
     *
     * This prevents the old "Favorite not found" error caused
     * by sending a second DELETE request.
     */
    const handleFavoriteChange = (carId, isFavorite) => {
        if (!isFavorite) {
            setFavorites((currentFavorites) =>
                currentFavorites.filter((favorite) => String(favorite.carId?._id) !== String(carId))
            );
        }
    };

    /*
     * Loading state
     */
    if (loading) {
        return (
            <div>
                <div className="dash-heading">
                    <div>
                        <span className="eyebrow">FAVORITES</span>

                        <h1>Cars you saved.</h1>
                    </div>
                </div>

                <div className="empty-state">Loading your favorite cars...</div>
            </div>
        );
    }

    /*
     * Favorites page
     */
    return (
        <div>
            <div className="dash-heading">
                <div>
                    <span className="eyebrow">FAVORITES</span>

                    <h1>Cars you saved.</h1>
                </div>
            </div>

            {favorites.length > 0 ? (
                <div className="car-grid">
                    {favorites.map((favorite) => {
                        const car = favorite.carId;

                        if (!car) {
                            return null;
                        }

                        return (
                            <div key={favorite._id} className="favorite-wrap">
                                <CarCard
                                    car={car}
                                    onFavoriteChange={(isFavorite) =>
                                        handleFavoriteChange(car._id, isFavorite)
                                    }
                                />
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="empty-state">You have no favorite cars yet.</div>
            )}
        </div>
    );
}
