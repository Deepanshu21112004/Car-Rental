import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';

import { getAdminBooking, updateAdminBooking, verifyDriver, updateReturnInspection } from '../../services/bookingService';
import { formatRentalDuration } from '../../utils/rentalDuration';

export default function BookingDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [booking, setBooking] = useState(null);
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [driverNote, setDriverNote] = useState('');
    const [driverSaving, setDriverSaving] = useState(false);
    const [inspectionSaving, setInspectionSaving] = useState(false);

const loadBooking = useCallback(async () => {
        try {
            setLoading(true);

            const response = await getAdminBooking(id);

            const data = response.data.booking;

            setBooking(data);
            setStatus(data.bookingStatus);
        } catch (error) {
            console.error('Booking details error:', error);

            Swal.fire({
                icon: 'error',
                title: 'Unable to load booking',
                text: error.response?.data?.message || 'Booking could not be found.',
            });

            navigate('/admin/bookings');
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        loadBooking();
    }, [loadBooking]);

    const saveStatus = async () => {
        if (!booking || !status) {
            return;
        }

        if (status === booking.bookingStatus) {
            Swal.fire({
                icon: 'info',
                title: 'No change',
                text: 'The booking already has this status.',
                timer: 1400,
                showConfirmButton: false,
            });

            return;
        }

        try {
            setSaving(true);

            const response = await updateAdminBooking(booking._id, status);

            const updatedBooking = response.data.booking;

            setBooking(updatedBooking);

            setStatus(updatedBooking.bookingStatus);

            await Swal.fire({
                icon: 'success',
                title: 'Booking updated',
                text:
                    response.data?.message || 'Booking and payment status have been synchronized.',
                timer: 1800,
                showConfirmButton: false,
            });
        } catch (error) {
            console.error('Update booking error:', error);

            Swal.fire({
                icon: 'error',
                title: 'Update failed',
                text: error.response?.data?.message || 'Unable to update booking.',
            });

            /*
             * Reload the server version after
             * an unsuccessful update.
             */
            await loadBooking();
        } finally {
            setSaving(false);
        }
    };

    const saveReturnInspection = async (returnInspectionStatus) => {
        try {
            setInspectionSaving(true);
            const response = await updateReturnInspection(booking._id, { returnInspectionStatus });
            setBooking(response.data.booking);
            setStatus(response.data.booking.bookingStatus);
            await Swal.fire('Return inspection updated', response.data.message, 'success');
        } catch (error) { Swal.fire('Update failed', error.response?.data?.message || 'Unable to update return inspection.', 'error'); }
        finally { setInspectionSaving(false); }
    };

    const saveDriverVerification = async (verificationStatus) => {
        if (verificationStatus === 'Rejected' && !driverNote.trim()) {
            Swal.fire('Reason required', 'Enter a reason before rejecting the driver details.', 'warning');
            return;
        }
        try {
            setDriverSaving(true);
            const response = await verifyDriver(booking._id, { verificationStatus, verificationNote: driverNote });
            setBooking(response.data.booking);
            await Swal.fire('Driver details updated', response.data.message, 'success');
        } catch (error) { Swal.fire('Update failed', error.response?.data?.message || 'Unable to update driver verification.', 'error'); }
        finally { setDriverSaving(false); }
    };

    if (loading) {
        return (
            <div className="page-loader">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!booking) {
        return null;
    }

    const car = booking.carId;
    const user = booking.userId;

    return (
        <div className="dashboard-page">
            <div className="page-heading">
                <div>
                    <span className="eyebrow">ADMIN / BOOKING</span>

                    <h1>Booking Details</h1>

                    <p>Manage booking information and status.</p>
                </div>

                <Link to="/admin/bookings" className="btn btn-outline-custom">
                    Back to Bookings
                </Link>
            </div>

            <div className="row g-4">
                <div className="col-lg-8">
                    <div className="content-card">
                        <h3>Booking Information</h3>

                        <div className="detail-grid">
                            <div>
                                <span>Booking ID</span>
                                <strong>{booking._id}</strong>
                            </div>

                            <div>
                                <span>Car</span>
                                <strong>{car?.name || 'Unknown Car'}</strong>
                            </div>

                            <div>
                                <span>Pickup Location</span>
                                <strong>{booking.pickupLocation}</strong>
                            </div>

                            <div>
                                <span>Return Location</span>
                                <strong>{booking.returnLocation}</strong>
                            </div>

                            <div>
                                <span>Pickup</span>
                                <strong>{new Date(booking.pickupDateTime).toLocaleString()}</strong>
                            </div>

                            <div>
                                <span>Return</span>
                                <strong>{new Date(booking.returnDateTime).toLocaleString()}</strong>
                            </div>

                            <div>
                                <span>Total Hours</span>
                                <strong>
                                    {formatRentalDuration(
                                        booking.pickupDateTime,
                                        booking.returnDateTime
                                    )}
                                </strong>
                            </div>

                            <div>
                                <span>Hourly Rate</span>
                                <strong>
                                    ₹{Number(booking.carRate).toLocaleString('en-IN')}
                                    /hr
                                </strong>
                            </div>

                            <div>
                                <span>Driver Charges</span>
                                <strong>
                                    ₹{Number(booking.driverCharges || 0).toLocaleString('en-IN')}
                                </strong>
                            </div>

                            <div>
                                <span>Total Amount</span>
                                <strong>
                                    ₹{Number(booking.totalAmount).toLocaleString('en-IN')}
                                </strong>
                            </div>

                            <div>
                                <span>Payment Status</span>
                                <strong>{booking.paymentStatus}</strong>
                            </div>

                            <div>
                                <span>Created</span>
                                <strong>{new Date(booking.createdAt).toLocaleString()}</strong>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-lg-4">
                    {booking.actualReturnDateTime && (
                        <div className="content-card mb-4">
                            <h3>Vehicle return inspection</h3>
                            <p><strong>Actual return:</strong> {new Date(booking.actualReturnDateTime).toLocaleString()}</p>
                            <p><strong>Odometer:</strong> {booking.returnOdometer ?? 'Not entered'} · <strong>Fuel:</strong> {booking.returnFuelLevel || 'Not entered'}</p>
                            <p><strong>Condition notes:</strong> {booking.returnConditionNotes || 'None provided'}</p>
                            <p><strong>Refund:</strong> ₹{Number(booking.earlyReturnRefundAmount || 0).toLocaleString('en-IN')} · {booking.refundStatus || 'Not Applicable'}</p>
                            <p><strong>Inspection status:</strong> {booking.returnInspectionStatus || 'Pending'}</p>
                            {booking.returnInspectionStatus !== 'Approved' && <div className="d-flex flex-wrap gap-2"><button className="btn btn-success" disabled={inspectionSaving} onClick={() => saveReturnInspection('Approved')}>Approve return & release car</button><button className="btn btn-outline-danger" disabled={inspectionSaving} onClick={() => saveReturnInspection('Issue Reported')}>Report an issue</button><button className="btn btn-outline-secondary" disabled={inspectionSaving} onClick={() => saveReturnInspection('Pending')}>Keep pending</button></div>}
                        </div>
                    )}

                    {booking.driverOption === 'Self Drive' && (
                        <div className="content-card mb-4">
                            <h3>Self-driver verification</h3>
                            <div className="detail-grid">
                                <div><span>Driver</span><strong>{booking.selfDriver?.fullName || '—'}</strong></div>
                                <div><span>Phone</span><strong>{booking.selfDriver?.phone || '—'}</strong></div>
                                <div><span>Date of birth</span><strong>{booking.selfDriver?.dateOfBirth ? new Date(booking.selfDriver.dateOfBirth).toLocaleDateString() : '—'}</strong></div>
                                <div><span>Licence number</span><strong>{booking.selfDriver?.licenceNumber || '—'}</strong></div>
                                <div><span>Licence expiry</span><strong>{booking.selfDriver?.licenceExpiry ? new Date(booking.selfDriver.licenceExpiry).toLocaleDateString() : '—'}</strong></div>
                                <div><span>Address</span><strong>{booking.selfDriver?.address || '—'}</strong></div>
                                <div><span>Current verification</span><strong>{booking.selfDriver?.verificationStatus || 'Pending'}</strong></div>
                            </div>
                            <label className="d-block mt-3">Verification note<textarea className="form-control" rows="2" maxLength={1000} value={driverNote} onChange={(e) => setDriverNote(e.target.value)} placeholder="Required if rejecting; otherwise optional" /></label>
                            <div className="d-flex flex-wrap gap-2 mt-3">
                                <button className="btn btn-success" disabled={driverSaving} onClick={() => saveDriverVerification('Verified')}>Verify driver</button>
                                <button className="btn btn-outline-danger" disabled={driverSaving} onClick={() => saveDriverVerification('Rejected')}>Reject details</button>
                                <button className="btn btn-outline-secondary" disabled={driverSaving} onClick={() => saveDriverVerification('Pending')}>Mark pending</button>
                            </div>
                        </div>
                    )}

                    <div className="content-card">
                        <h3>Customer</h3>

                        <div className="mb-3">
                            <strong>
                                {user?.firstName} {user?.lastName}
                            </strong>
                        </div>

                        <p className="mb-2">{user?.email}</p>

                        <p className="mb-4">{user?.phone || 'No phone'}</p>

                        <hr />

                        <h3 className="mt-4">Booking Status</h3>

                        <select
                            className="form-select mb-3"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            disabled={saving}
                        >
                            <option value="Pending">Pending</option>

                            <option value="Confirmed">Confirmed</option>

                            <option value="Active">Active</option>

                            <option value="Completed">Completed</option>

                            <option value="Cancelled">Cancelled</option>
                        </select>

                        <button
                            type="button"
                            className="btn btn-primary-custom w-100"
                            onClick={saveStatus}
                            disabled={saving}
                        >
                            {saving ? 'Saving...' : 'Update Status'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
