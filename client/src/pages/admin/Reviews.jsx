import { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';

import api from '../../services/api';

export default function Reviews() {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(null);

    const loadReviews = useCallback(async (showLoader = false) => {
        try {
            if (showLoader) {
                setLoading(true);
            }

            const response = await api.get('/admin/reviews');

            setReviews(response.data?.reviews || []);
        } catch (error) {
            console.error('Admin reviews error:', error);

            if (showLoader) {
                Swal.fire({
                    icon: 'error',
                    title: 'Unable to load reviews',
                    text: error.response?.data?.message || 'Please try again.',
                });
            }
        } finally {
            if (showLoader) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        loadReviews(true);

        const refresh = () => {
            loadReviews(false);
        };

        const interval = setInterval(refresh, 10000);

        window.addEventListener('focus', refresh);

        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', refresh);
        };
    }, [loadReviews]);

    const handleDelete = async (reviewId) => {
        const result = await Swal.fire({
            title: 'Delete this review?',
            text: 'This review will be permanently deleted and cannot be recovered.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Delete',
            cancelButtonText: 'Cancel',
            reverseButtons: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
        });

        if (!result.isConfirmed) {
            return;
        }

        try {
            setDeleting(reviewId);

            await api.delete(`/reviews/${reviewId}`);

            setReviews((currentReviews) =>
                currentReviews.filter((review) => review._id !== reviewId)
            );

            await Swal.fire({
                icon: 'success',
                title: 'Review deleted',
                text: 'The review has been deleted successfully.',
                timer: 1600,
                showConfirmButton: false,
            });
        } catch (error) {
            console.error('Delete review error:', error);

            Swal.fire({
                icon: 'error',
                title: 'Delete failed',
                text: error.response?.data?.message || 'Unable to delete the review.',
            });
        } finally {
            setDeleting(null);
        }
    };

    const formatDate = (date) => {
        if (!date) {
            return '—';
        }

        const parsedDate = new Date(date);

        if (Number.isNaN(parsedDate.getTime())) {
            return '—';
        }

        return parsedDate.toLocaleString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    };

    const renderStars = (rating) => {
        const value = Number(rating) || 0;

        return (
            <span
                style={{
                    color: '#f5b301',
                    fontSize: '18px',
                    letterSpacing: '2px',
                }}
            >
                {'★'.repeat(value)}
                <span style={{ color: '#d5d5d5' }}>{'★'.repeat(5 - value)}</span>
            </span>
        );
    };

    if (loading) {
        return (
            <div className="page-loader">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div>
            <div className="dash-heading">
                <div>
                    <span className="eyebrow">REVIEWS</span>

                    <h1>Manage reviews.</h1>

                    <p className="muted">
                        View and manage customer reviews submitted for completed rentals.
                    </p>
                </div>
            </div>

            <div className="content-card table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Customer</th>
                            <th>Car</th>
                            <th>Rating</th>
                            <th>Review</th>
                            <th>Date &amp; Time</th>
                            <th>Action</th>
                        </tr>
                    </thead>

                    <tbody>
                        {reviews.map((review) => {
                            const user = review.userId;
                            const car = review.carId;

                            return (
                                <tr key={review._id}>
                                    <td>
                                        <strong>
                                            {user?.firstName || ''} {user?.lastName || ''}
                                        </strong>

                                        <br />

                                        <small className="muted">{user?.email || ''}</small>
                                    </td>

                                    <td>{car?.name || 'Car'}</td>

                                    <td>
                                        {renderStars(review.rating)}

                                        <br />

                                        <small className="muted">{review.rating}/5</small>
                                    </td>

                                    <td
                                        style={{
                                            maxWidth: '350px',
                                            whiteSpace: 'normal',
                                        }}
                                    >
                                        {review.comment || 'No comment'}
                                    </td>

                                    <td>{formatDate(review.createdAt)}</td>

                                    <td>
                                        <button
                                            type="button"
                                            className="table-btn"
                                            onClick={() => handleDelete(review._id)}
                                            disabled={deleting === review._id}
                                            style={{
                                                border: 'none',
                                                cursor:
                                                    deleting === review._id
                                                        ? 'not-allowed'
                                                        : 'pointer',
                                                opacity: deleting === review._id ? 0.6 : 1,
                                            }}
                                        >
                                            {deleting === review._id ? 'Deleting...' : 'Delete'}
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {!reviews.length && (
                    <div className="empty-state py-5">
                        <h3>No reviews found</h3>

                        <p>Customer reviews will appear here after customers submit reviews.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
