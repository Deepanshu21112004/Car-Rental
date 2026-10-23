import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Fuel, Gauge, Users, CalendarDays, Star } from 'lucide-react';

import { getCar, getCarImage } from '../../services/carService';
import { getCarReviews } from '../../services/reviewService';

export default function CarDetails() {
    const { id } = useParams();

    const [car, setCar] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    const nav = useNavigate();

    useEffect(() => {
        let mounted = true;

        const loadCarDetails = async () => {
            try {
                setLoading(true);

                const [carResponse, reviewsResponse] = await Promise.all([
                    getCar(id),
                    getCarReviews(id),
                ]);

                if (!mounted) {
                    return;
                }

                setCar(carResponse.data?.car || null);
                setReviews(reviewsResponse.data?.reviews || []);
            } catch (error) {
                console.error('Car details/reviews error:', error);

                if (mounted) {
                    setCar(null);
                    setReviews([]);
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        loadCarDetails();

        return () => {
            mounted = false;
        };
    }, [id]);

    /*
     * Calculate average rating for this car.
     */
    const averageRating = useMemo(() => {
        if (!reviews.length) {
            return 0;
        }

        const total = reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0);

        return total / reviews.length;
    }, [reviews]);

    if (loading) {
        return (
            <div className="page-loader">
                <div className="spinner" />
            </div>
        );
    }

    if (!car) {
        return (
            <div className="container section-space">
                <div className="empty-state">Car not found.</div>
            </div>
        );
    }

    return (
        <div className="container section-space">
            {/* BACK */}
            <Link to="/cars" className="back-link">
                <ArrowLeft size={16} />
                Back to cars
            </Link>

            {/* CAR DETAILS */}
            <div className="detail-grid">
                <div className="detail-image">
                    <img
                        src={getCarImage(car.images?.[0]) || '/car-placeholder.svg'}
                        alt={car.name || 'Car'}
                        onError={(event) => {
                            event.currentTarget.src = '/car-placeholder.svg';
                        }}
                    />
                </div>

                <div className="detail-copy">
                    <span className="eyebrow">
                        {car.brand || 'I-CAR'} • {car.year || ''}
                    </span>

                    <h1>{car.name}</h1>

                    <p>{car.description || 'Comfortable and reliable rental car.'}</p>

                    <div className="detail-specs">
                        <span>
                            <Fuel />
                            {car.fuelType || 'Petrol'}
                        </span>

                        <span>
                            <Gauge />
                            {car.transmission || 'Automatic'}
                        </span>

                        <span>
                            <Users />
                            {car.seats || 5} seats
                        </span>

                        <span>
                            <CalendarDays />
                            {car.year || ''}
                        </span>
                    </div>

                    <div className="detail-price">
                        <strong>₹{Number(car.hourlyRate || 0).toLocaleString('en-IN')}</strong>

                        <span>/ hour</span>
                    </div>

                    <button
                        disabled={!car.isAvailable}
                        onClick={() => nav(`/booking/${car._id}`)}
                        className="btn btn-primary-custom w-100"
                    >
                        {car.isAvailable ? 'Reserve this car' : 'Currently unavailable'}
                    </button>

                    <div className="feature-tags">
                        {(car.features || []).map((feature) => (
                            <span key={feature}>
                                <Check size={14} />
                                {feature}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* REVIEWS */}
            <section className="review-section">
                <div className="review-section-heading">
                    <div>
                        <span className="eyebrow">REVIEWS</span>

                        <h2>What renters say</h2>
                    </div>

                    {reviews.length > 0 && (
                        <div className="review-summary">
                            <strong>{averageRating.toFixed(1)}</strong>

                            <span className="review-summary-star">
                                <Star size={18} fill="currentColor" />
                            </span>

                            <small>
                                {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                            </small>
                        </div>
                    )}
                </div>

                {reviews.length > 0 ? (
                    <div className="review-list">
                        {reviews.map((review) => (
                            <article className="review-card" key={review._id}>
                                <div className="review-card-header">
                                    <div>
                                        <strong>
                                            {review.userId?.firstName || 'Customer'}{' '}
                                            {review.userId?.lastName || ''}
                                        </strong>

                                        <div className="review-stars">
                                            {'★'.repeat(Number(review.rating) || 0)}

                                            {'☆'.repeat(5 - (Number(review.rating) || 0))}
                                        </div>
                                    </div>

                                    <small className="muted">
                                        {review.createdAt
                                            ? new Date(review.createdAt).toLocaleDateString(
                                                  'en-IN',
                                                  {
                                                      day: '2-digit',
                                                      month: 'short',
                                                      year: 'numeric',
                                                  }
                                              )
                                            : ''}
                                    </small>
                                </div>

                                <p>{review.comment}</p>
                            </article>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <h3>No reviews yet</h3>

                        <p>Be the first renter to share your experience with this car.</p>
                    </div>
                )}
            </section>
        </div>
    );
}
