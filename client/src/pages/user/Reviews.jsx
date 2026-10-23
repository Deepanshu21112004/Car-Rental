import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import {
    createReview,
    deleteReview,
    getMyReviews,
    updateReview,
} from '../../services/reviewService';
import { getMyBookings } from '../../services/bookingService';

export default function Reviews() {
    const [bookings, setBookings] = useState([]);
    const [myReviews, setMyReviews] = useState([]);

    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [selected, setSelected] = useState('');

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [editingId, setEditingId] = useState(null);
    const [editRating, setEditRating] = useState(5);
    const [editComment, setEditComment] = useState('');

    const loadReviewsData = async () => {
        try {
            setLoading(true);

            const [bookingResponse, reviewResponse] = await Promise.all([
                getMyBookings(),
                getMyReviews(),
            ]);

            const completedBookings =
                bookingResponse.data?.bookings?.filter(
                    (booking) => booking.bookingStatus === 'Completed'
                ) || [];

            const reviews = reviewResponse.data?.reviews || [];

            setMyReviews(reviews);

            /*
             * Only show completed bookings that do not already
             * have a review.
             */
            const reviewedBookingIds = new Set(
                reviews.map((review) => String(review.bookingId?._id || review.bookingId))
            );

            const availableBookings = completedBookings.filter(
                (booking) => !reviewedBookingIds.has(String(booking._id))
            );

            setBookings(availableBookings);
        } catch (error) {
            console.error('Load reviews data error:', error);

            Swal.fire({
                icon: 'error',
                title: 'Unable to load reviews',
                text: error.response?.data?.message || 'Please try again later.',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReviewsData();
    }, []);

    const submit = async (event) => {
        event.preventDefault();

        if (!selected) {
            Swal.fire({
                icon: 'warning',
                title: 'Select a booking',
                text: 'Please select a completed booking first.',
            });

            return;
        }

        if (!comment.trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'Comment required',
                text: 'Please write a comment for your review.',
            });

            return;
        }

        try {
            setSubmitting(true);

            const response = await createReview({
                bookingId: selected,
                rating,
                comment: comment.trim(),
            });

            const newReview = response.data?.review;

            if (newReview) {
                setMyReviews((current) => [newReview, ...current]);
            }

            setBookings((current) =>
                current.filter((booking) => String(booking._id) !== String(selected))
            );

            setSelected('');
            setRating(5);
            setComment('');

            await Swal.fire({
                icon: 'success',
                title: 'Review submitted',
                text: 'Thank you for sharing your experience!',
                timer: 1600,
                showConfirmButton: false,
            });
        } catch (error) {
            console.error('Create review error:', error);

            Swal.fire({
                icon: 'error',
                title: 'Unable to submit review',
                text: error.response?.data?.message || 'Unable to submit review.',
            });
        } finally {
            setSubmitting(false);
        }
    };

    const startEditing = (review) => {
        setEditingId(review._id);
        setEditRating(review.rating);
        setEditComment(review.comment || '');
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditRating(5);
        setEditComment('');
    };

    const saveEdit = async (reviewId) => {
        if (!editComment.trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'Comment required',
                text: 'Please write a comment for your review.',
            });

            return;
        }

        try {
            const response = await updateReview(reviewId, {
                rating: editRating,
                comment: editComment.trim(),
            });

            const updatedReview = response.data?.review;

            setMyReviews((current) =>
                current.map((review) =>
                    String(review._id) === String(reviewId)
                        ? {
                              ...review,
                              ...updatedReview,
                          }
                        : review
                )
            );

            cancelEditing();

            Swal.fire({
                icon: 'success',
                title: 'Review updated',
                text: 'Your review has been updated successfully.',
                timer: 1500,
                showConfirmButton: false,
            });
        } catch (error) {
            console.error('Update review error:', error);

            Swal.fire({
                icon: 'error',
                title: 'Unable to update review',
                text: error.response?.data?.message || 'Unable to update review.',
            });
        }
    };

    const handleDelete = async (review) => {
        const result = await Swal.fire({
            icon: 'warning',
            title: 'Delete review?',
            text: 'This review will be permanently removed.',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#d33',
        });

        if (!result.isConfirmed) {
            return;
        }

        try {
            await deleteReview(review._id);

            setMyReviews((current) =>
                current.filter((item) => String(item._id) !== String(review._id))
            );

            /*
             * Once the review is deleted, its completed booking
             * becomes available for reviewing again.
             */
            const booking = review.bookingId;

            if (booking?._id) {
                setBookings((current) => {
                    const alreadyExists = current.some(
                        (item) => String(item._id) === String(booking._id)
                    );

                    if (alreadyExists) {
                        return current;
                    }

                    return [booking, ...current];
                });
            }

            Swal.fire({
                icon: 'success',
                title: 'Review deleted',
                text: 'Your review has been removed.',
                timer: 1500,
                showConfirmButton: false,
            });
        } catch (error) {
            console.error('Delete review error:', error);

            Swal.fire({
                icon: 'error',
                title: 'Unable to delete review',
                text: error.response?.data?.message || 'Unable to delete review.',
            });
        }
    };

    const renderStars = (value) => {
        return (
            <span className="review-stars">
                {'★'.repeat(Number(value) || 0)}
                {'☆'.repeat(5 - (Number(value) || 0))}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="page-loader">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="dashboard-page">
            <div className="dash-heading">
                <div>
                    <span className="eyebrow">REVIEWS</span>

                    <h1>Share your experience.</h1>

                    <p>Review cars you have rented and manage your previous reviews.</p>
                </div>
            </div>

            {/* WRITE REVIEW */}
            <section className="content-card mb-4">
                <div className="mb-4">
                    <span className="eyebrow">WRITE A REVIEW</span>

                    <h2 className="mt-1">Tell us about your rental.</h2>
                </div>

                {bookings.length > 0 ? (
                    <form className="form-card" onSubmit={submit}>
                        <label>
                            Completed booking
                            <select
                                required
                                value={selected}
                                onChange={(event) => setSelected(event.target.value)}
                            >
                                <option value="">Select booking</option>

                                {bookings.map((booking) => (
                                    <option key={booking._id} value={booking._id}>
                                        {booking.carId?.name || 'Car'} •{' '}
                                        {new Date(booking.pickupDateTime).toLocaleDateString(
                                            'en-IN'
                                        )}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label>
                            Rating
                            <select
                                value={rating}
                                onChange={(event) => setRating(Number(event.target.value))}
                            >
                                {[5, 4, 3, 2, 1].map((number) => (
                                    <option key={number} value={number}>
                                        {number} / 5
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label>
                            Comment
                            <textarea
                                required
                                rows="5"
                                value={comment}
                                maxLength={1000}
                                placeholder="Tell us about your experience with the car..."
                                onChange={(event) => setComment(event.target.value)}
                            />
                            <small className="muted">{comment.length}/1000</small>
                        </label>

                        <button
                            type="submit"
                            className="btn btn-primary-custom"
                            disabled={submitting}
                        >
                            {submitting ? 'Submitting...' : 'Submit review'}
                        </button>
                    </form>
                ) : (
                    <div className="empty-state">
                        <h3>No review pending</h3>

                        <p>You have no completed bookings waiting for a review.</p>
                    </div>
                )}
            </section>

            {/* MY REVIEWS */}
            <section className="content-card">
                <div className="mb-4">
                    <span className="eyebrow">MY REVIEWS</span>

                    <h2 className="mt-1">Your previous reviews.</h2>
                </div>

                {myReviews.length > 0 ? (
                    <div className="review-list">
                        {myReviews.map((review) => (
                            <div className="review-card" key={review._id}>
                                {editingId === review._id ? (
                                    <div>
                                        <div className="mb-3">
                                            <strong>{review.carId?.name || 'Car'}</strong>
                                        </div>

                                        <label>
                                            Rating
                                            <select
                                                value={editRating}
                                                onChange={(event) =>
                                                    setEditRating(Number(event.target.value))
                                                }
                                            >
                                                {[5, 4, 3, 2, 1].map((number) => (
                                                    <option key={number} value={number}>
                                                        {number} / 5
                                                    </option>
                                                ))}
                                            </select>
                                        </label>

                                        <label>
                                            Comment
                                            <textarea
                                                rows="4"
                                                maxLength={1000}
                                                value={editComment}
                                                onChange={(event) =>
                                                    setEditComment(event.target.value)
                                                }
                                            />
                                        </label>

                                        <div className="d-flex gap-2 mt-3">
                                            <button
                                                type="button"
                                                className="btn btn-primary-custom"
                                                onClick={() => saveEdit(review._id)}
                                            >
                                                Save changes
                                            </button>

                                            <button
                                                type="button"
                                                className="btn btn-outline-custom"
                                                onClick={cancelEditing}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="review-card-header">
                                            <div>
                                                <strong>{review.carId?.name || 'Car'}</strong>

                                                <div>{renderStars(review.rating)}</div>
                                            </div>

                                            <small className="muted">
                                                {new Date(review.createdAt).toLocaleDateString(
                                                    'en-IN',
                                                    {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric',
                                                    }
                                                )}
                                            </small>
                                        </div>

                                        <p>{review.comment}</p>

                                        <div className="d-flex gap-2">
                                            <button
                                                type="button"
                                                className="btn btn-outline-custom"
                                                onClick={() => startEditing(review)}
                                            >
                                                Edit
                                            </button>

                                            <button
                                                type="button"
                                                className="btn btn-outline-danger"
                                                onClick={() => handleDelete(review)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <h3>No reviews yet</h3>

                        <p>Your submitted reviews will appear here.</p>
                    </div>
                )}
            </section>
        </div>
    );
}
