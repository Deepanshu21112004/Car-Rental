import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';

import { getCar } from '../../services/carService';
import { createBooking, getCarBookedSlots } from '../../services/bookingService';
import { formatRentalDuration, getRentalHours } from '../../utils/rentalDuration';
import { toLocalDateTimeInput } from '../../utils/localDateTime';

const toApiDateTime = (value) => {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? value : date.toISOString();
};

export default function Booking() {
    const { carId } = useParams();

    const nav = useNavigate();

    const [car, setCar] = useState(null);
    const [bookedSlots, setBookedSlots] = useState([]);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [slotsError, setSlotsError] = useState('');

    const DRIVER_CHARGE_PER_DAY = 500;

    const [f, setF] = useState({
        pickupLocation: '',
        returnLocation: '',
        pickupDateTime: '',
        returnDateTime: '',
        driverCharges: 0,
        driverOption: '',
        selfDriver: { fullName: '', phone: '', dateOfBirth: '', licenceNumber: '', licenceExpiry: '', address: '' },
        acceptedPolicy: false,
    });

    useEffect(() => {
        if (!carId) {
            return;
        }

        getCar(carId)
            .then((r) => {
                setCar(r.data.car || r.data);
            })
            .catch((err) => {
                console.error('Get car error:', err);

                Swal.fire({
                    icon: 'error',
                    title: 'Unable to load car',
                    text: err.response?.data?.message || 'Car information could not be loaded.',
                    confirmButtonColor: '#2448ff',
                });
            });
    }, [carId]);

    useEffect(() => {
        if (!carId) return;
        let cancelled = false;
        setSlotsLoading(true);
        setSlotsError('');
        getCarBookedSlots(carId)
            .then((response) => {
                if (!cancelled) setBookedSlots(Array.isArray(response.data?.slots) ? response.data.slots : []);
            })
            .catch((error) => {
                if (!cancelled) {
                    setSlotsError(error.response?.data?.message || 'Booked slots could not be loaded. Please refresh before booking.');
                }
            })
            .finally(() => {
                if (!cancelled) setSlotsLoading(false);
            });
        return () => { cancelled = true; };
    }, [carId]);

    const formatSlotDateTime = (value) => new Date(value).toLocaleString([], {
        year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });

    const overlapsBookedSlot = (pickupValue, returnValue, slots = bookedSlots) => {
        const pickup = new Date(pickupValue).getTime();
        const returnTime = new Date(returnValue).getTime();
        if (!Number.isFinite(pickup) || !Number.isFinite(returnTime) || returnTime <= pickup) return false;
        return slots.some((slot) => pickup < new Date(slot.returnDateTime).getTime()
            && returnTime > new Date(slot.pickupDateTime).getTime());
    };

    const selectedSlotConflict = overlapsBookedSlot(f.pickupDateTime, f.returnDateTime);

    const handleDriverChange = (e) => {
        const option = e.target.value;

        setF((prev) => ({
            ...prev,
            driverOption: option,
            driverCharges: 0,
        }));
    };

    const getHourlyRate = () => {
        if (!car) {
            return 0;
        }

        return Number(car.hourlyRate ?? car.pricePerHour ?? car.rentPerHour ?? car.price ?? 0);
    };

    /*
    |--------------------------------------------------------------------------
    | EXACT RENTAL DURATION
    |--------------------------------------------------------------------------
    */

    const rentalHours = getRentalHours(f.pickupDateTime, f.returnDateTime);

    const rentalDuration = formatRentalDuration(f.pickupDateTime, f.returnDateTime);

    const hourlyRate = getHourlyRate();

    /*
    |--------------------------------------------------------------------------
    | CALCULATE AMOUNT
    |--------------------------------------------------------------------------
    |
    | Keep exact duration calculation.
    |
    | Example:
    |
    | 10 minutes × ₹100/hour
    | = ₹16.67
    |
    | Displayed amount:
    | = ₹17
    |
    |--------------------------------------------------------------------------
    */

    const rentalAmount = Number((rentalHours * hourlyRate).toFixed(2));

    const rentalDays = Math.max(1, Math.ceil(rentalHours / 24));
    const driverCharges = f.driverOption === 'driver' ? rentalDays * DRIVER_CHARGE_PER_DAY : 0;

    /*
    |--------------------------------------------------------------------------
    | ROUND TOTAL FOR DISPLAY
    |--------------------------------------------------------------------------
    */

    const calculatedTotal = rentalAmount + driverCharges;

    const totalAmount = Math.round(calculatedTotal);

    const submit = async (e) => {
        e.preventDefault();

        if (!f.acceptedPolicy) {
            Swal.fire({ icon: 'warning', title: 'Policy acknowledgement required', text: 'Please review and accept the cancellation and early-return policy before continuing.', confirmButtonColor: '#2448ff' });
            return;
        }

        if (!f.driverOption) {
            Swal.fire({
                icon: 'warning',
                title: 'Driver option required',
                text: 'Please select Self Drive or With Driver.',
                confirmButtonColor: '#2448ff',
            });

            return;
        }

        if (!f.pickupLocation.trim() || !f.returnLocation.trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'Location required',
                text: 'Please enter pickup and return locations.',
                confirmButtonColor: '#2448ff',
            });

            return;
        }

        if (!f.pickupDateTime || !f.returnDateTime) {
            Swal.fire({
                icon: 'warning',
                title: 'Date and time required',
                text: 'Please select pickup and return date and time.',
                confirmButtonColor: '#2448ff',
            });

            return;
        }

        const pickup = new Date(f.pickupDateTime);

        const returnTime = new Date(f.returnDateTime);

        const now = new Date();

        if (Number.isNaN(pickup.getTime()) || Number.isNaN(returnTime.getTime())) {
            Swal.fire({
                icon: 'warning',
                title: 'Invalid date and time',
                text: 'Please select valid pickup and return times.',
                confirmButtonColor: '#2448ff',
            });

            return;
        }

        if (pickup <= now) {
            Swal.fire({
                icon: 'warning',
                title: 'Invalid pickup time',
                text: 'Pickup date and time must be in the future.',
                confirmButtonColor: '#2448ff',
            });

            return;
        }

        if (returnTime <= pickup) {
            Swal.fire({
                icon: 'warning',
                title: 'Invalid date and time',
                text: 'Return date and time must be after pickup date and time.',
                confirmButtonColor: '#2448ff',
            });

            return;
        }

        // Refresh the schedule just before creating the booking to catch recently reserved slots.
        try {
            const latestSlotsResponse = await getCarBookedSlots(carId);
            const latestSlots = Array.isArray(latestSlotsResponse.data?.slots) ? latestSlotsResponse.data.slots : [];
            setBookedSlots(latestSlots);
            if (overlapsBookedSlot(f.pickupDateTime, f.returnDateTime, latestSlots)) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Time slot already booked',
                    text: 'This car has a booking that overlaps your selected time. Please choose another pickup or return time.',
                    confirmButtonColor: '#2448ff',
                });
                return;
            }
        } catch (availabilityError) {
            Swal.fire({
                icon: 'error',
                title: 'Could not verify availability',
                text: availabilityError.response?.data?.message || 'Please try again after refreshing the booked slots.',
                confirmButtonColor: '#2448ff',
            });
            return;
        }

        if (!hourlyRate || hourlyRate <= 0) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid car price',
                text: 'The hourly rental price for this car is not available.',
                confirmButtonColor: '#2448ff',
            });

            return;
        }

        if (!rentalHours || rentalHours <= 0) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid rental duration',
                text: 'Unable to calculate the rental duration.',
                confirmButtonColor: '#2448ff',
            });

            return;
        }

        if (!totalAmount || totalAmount <= 0) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid total amount',
                text: 'Unable to calculate the booking amount.',
                confirmButtonColor: '#2448ff',
            });

            return;
        }

        try {
            const bookingData = {
                carId,

                pickupLocation: f.pickupLocation.trim(),

                returnLocation: f.returnLocation.trim(),

                pickupDateTime: toApiDateTime(f.pickupDateTime),

                returnDateTime: toApiDateTime(f.returnDateTime),

                /*
                |--------------------------------------------------------------------------
                | SERVER CALCULATES FINAL AMOUNT
                |--------------------------------------------------------------------------
                */

                totalHours: Number(rentalHours.toFixed(6)),

                carRate: Number(hourlyRate),

                driverCharges: Number(driverCharges),
                driverOption: f.driverOption === 'driver' ? 'With Driver' : 'Self Drive',
                acceptedPolicy: f.acceptedPolicy,
                selfDriver: f.driverOption === 'self' ? f.selfDriver : undefined,
            };

            console.log('BOOKING DATA SENT TO SERVER:', bookingData);

            const r = await createBooking(bookingData);

            const bookingId = r.data?.booking?._id;

            if (!bookingId) {
                throw new Error('Booking was created but booking ID was not returned.');
            }

            nav(`/checkout/${bookingId}`);
        } catch (err) {
            console.error('Create booking error:', err);

            Swal.fire({
                icon: 'error',
                title: 'Booking failed',
                text: err.response?.data?.message || err.message || 'Unable to create booking',
                confirmButtonColor: '#2448ff',
            });
        }
    };

    if (!car) {
        return (
            <div className="page-loader">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="container section-space">
            <div className="page-hero compact">
                <span className="eyebrow">RESERVE</span>

                <h1>
                    Book <span>{car.name}.</span>
                </h1>

                <p>
                    ₹{hourlyRate.toLocaleString('en-IN')}
                    /hour • {car.transmission} • {car.seats} seats
                </p>
            </div>

            <form className="form-card booking-form" onSubmit={submit}>
                <div className="two-col">
                    <label>
                        Pickup location
                        <input
                            required
                            type="text"
                            placeholder="Enter pickup location"
                            value={f.pickupLocation}
                            onChange={(e) =>
                                setF((prev) => ({
                                    ...prev,
                                    pickupLocation: e.target.value,
                                }))
                            }
                        />
                    </label>

                    <label>
                        Return location
                        <input
                            required
                            type="text"
                            placeholder="Enter return location"
                            value={f.returnLocation}
                            onChange={(e) =>
                                setF((prev) => ({
                                    ...prev,
                                    returnLocation: e.target.value,
                                }))
                            }
                        />
                    </label>
                </div>

                <div className="two-col">
                    <label>
                        Pickup date & time
                        <input
                            required
                            type="datetime-local"
                            min={toLocalDateTimeInput()}
                            value={f.pickupDateTime}
                            onChange={(e) =>
                                setF((prev) => ({
                                    ...prev,
                                    pickupDateTime: e.target.value,
                                }))
                            }
                        />
                    </label>

                    <label>
                        Return date & time
                        <input
                            required
                            type="datetime-local"
                            min={f.pickupDateTime || toLocalDateTimeInput()}
                            value={f.returnDateTime}
                            onChange={(e) =>
                                setF((prev) => ({
                                    ...prev,
                                    returnDateTime: e.target.value,
                                }))
                            }
                        />
                    </label>
                </div>

                <section className="booked-slots-panel" aria-live="polite">
                    <div className="booked-slots-heading">
                        <div>
                            <h3>Already booked slots</h3>
                            <p>Check these reserved times before selecting your rental period.</p>
                        </div>
                        <span className="booked-slots-count">{bookedSlots.length} reserved</span>
                    </div>

                    {slotsLoading ? (
                        <p className="booked-slots-message">Loading reserved slots…</p>
                    ) : slotsError ? (
                        <div className="booked-slots-error">{slotsError}</div>
                    ) : bookedSlots.length === 0 ? (
                        <div className="booked-slots-empty">No upcoming bookings for this car. Your selected time will still be checked again before booking.</div>
                    ) : (
                        <div className="booked-slots-list">
                            {bookedSlots.map((slot, index) => (
                                <div className="booked-slot" key={`${slot.pickupDateTime}-${index}`}>
                                    <div>
                                        <strong>{formatSlotDateTime(slot.pickupDateTime)}</strong>
                                        <span>to</span>
                                        <strong>{formatSlotDateTime(slot.returnDateTime)}</strong>
                                    </div>
                                    <span className={`booked-slot-status ${slot.bookingStatus.toLowerCase()}`}>{slot.bookingStatus}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {selectedSlotConflict && (
                        <div className="booked-slots-conflict" role="alert">
                            This selected rental period overlaps an already booked slot. Choose another time to continue.
                        </div>
                    )}
                </section>

                <label>
                    Driver option <span>*</span>
                    <select required value={f.driverOption} onChange={handleDriverChange}>
                        <option value="">Select driver option</option>

                        <option value="self">Self Drive - ₹0</option>

                        <option value="driver">With Driver - ₹500 per day</option>
                    </select>
                </label>

                {f.driverOption === 'self' && (
                    <div className="content-card mt-4">
                        <h3>Self-driver details</h3>
                        <p className="muted">Enter the person who will drive the car. Your documents/details may require admin verification before vehicle handover.</p>
                        <div className="two-col">
                            <label>Driver full name<input required maxLength={100} value={f.selfDriver.fullName} onChange={(e) => setF((p) => ({ ...p, selfDriver: { ...p.selfDriver, fullName: e.target.value } }))} placeholder="Name as on driving licence" /></label>
                            <label>Mobile number<input required type="tel" minLength={8} maxLength={20} pattern="[+0-9()\s-]{8,20}" value={f.selfDriver.phone} onChange={(e) => setF((p) => ({ ...p, selfDriver: { ...p.selfDriver, phone: e.target.value } }))} placeholder="Driver contact number" /></label>
                            <label>Date of birth<input required type="date" max={new Date().toISOString().slice(0, 10)} value={f.selfDriver.dateOfBirth} onChange={(e) => setF((p) => ({ ...p, selfDriver: { ...p.selfDriver, dateOfBirth: e.target.value } }))} /></label>
                            <label>Driving licence number<input required minLength={5} maxLength={50} value={f.selfDriver.licenceNumber} onChange={(e) => setF((p) => ({ ...p, selfDriver: { ...p.selfDriver, licenceNumber: e.target.value } }))} placeholder="Enter licence number" /></label>
                            <label>Licence expiry date<input required type="date" min={new Date().toISOString().slice(0, 10)} value={f.selfDriver.licenceExpiry} onChange={(e) => setF((p) => ({ ...p, selfDriver: { ...p.selfDriver, licenceExpiry: e.target.value } }))} /></label>
                            <label>Driver address<input required maxLength={300} value={f.selfDriver.address} onChange={(e) => setF((p) => ({ ...p, selfDriver: { ...p.selfDriver, address: e.target.value } }))} placeholder="Current address" /></label>
                        </div>
                    </div>
                )}

                <div className="booking-summary">
                    <div>
                        <span>Rental duration</span>

                        <strong>{rentalDuration}</strong>
                    </div>

                    <div>
                        <span>Car rate</span>

                        <strong>
                            ₹{hourlyRate.toLocaleString('en-IN')}
                            /hour
                        </strong>
                    </div>

                    <div>
                        <span>Car rental</span>

                        <strong>₹{rentalAmount.toLocaleString('en-IN')}</strong>
                    </div>

                    <div>
                        <span>Driver charges ({f.driverOption === 'driver' ? `${rentalDays} day(s) × ₹${DRIVER_CHARGE_PER_DAY}` : 'Self Drive'})</span>

                        <strong>₹{driverCharges.toLocaleString('en-IN')}</strong>
                    </div>

                    <div>
                        <span>Total amount</span>

                        <strong>₹{totalAmount.toLocaleString('en-IN')}</strong>
                    </div>
                </div>

                <div className="alert alert-light border mt-4">
                    <strong>Cancellation policy</strong>
                    <ul className="mb-2 mt-2">
                        <li>More than 48 hours before pickup: 0% deduction</li>
                        <li>24–48 hours: 5% deduction</li>
                        <li>6–24 hours: 10% deduction</li>
                        <li>2–6 hours: 15% deduction</li>
                        <li>Less than 2 hours: 25% deduction</li>
                    </ul>
                    <p className="mb-2">Early returns are calculated using actual rental time and the disclosed return policy. Refunds are submitted through Stripe where eligible.</p>
                    <label className="d-flex align-items-start gap-2"><input required type="checkbox" checked={f.acceptedPolicy} onChange={(e) => setF((prev) => ({ ...prev, acceptedPolicy: e.target.checked }))} style={{ marginTop: 5 }} /><span>I have read and accept the cancellation and early-return policy.</span></label>
                </div>

                <button type="submit" className="btn btn-primary-custom">
                    Continue to checkout
                </button>
            </form>
        </div>
    );
}
