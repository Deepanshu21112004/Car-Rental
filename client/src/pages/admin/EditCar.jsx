import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';

import { getCar, getCarImage, updateCar } from '../../services/carService';

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Unable to read image'));

        reader.readAsDataURL(file);
    });
}

export default function EditCar() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [form, setForm] = useState(null);
    const [saving, setSaving] = useState(false);
    const [imagePreview, setImagePreview] = useState('');

    useEffect(() => {
        const loadCar = async () => {
            try {
                const response = await getCar(id);
                const car = response.data.car;

                const existingImage = car.images?.[0] || '';

                setForm({
                    ...car,
                    image: null,
                    existingImage,
                    features: Array.isArray(car.features)
                        ? car.features.join(', ')
                        : car.features || '',
                });

                if (existingImage) {
                    setImagePreview(getCarImage(existingImage));
                }
            } catch (error) {
                console.error('Unable to load car:', error);

                setForm(false);
            }
        };

        loadCar();
    }, [id]);

    const change = (event) => {
        const { name, value, type, checked, files } = event.target;

        if (type === 'file') {
            const file = files?.[0] || null;

            setForm((previous) => ({
                ...previous,
                image: file,
            }));

            if (file) {
                const reader = new FileReader();

                reader.onload = () => {
                    setImagePreview(reader.result);
                };

                reader.readAsDataURL(file);
            }

            return;
        }

        setForm((previous) => ({
            ...previous,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const submit = async (event) => {
        event.preventDefault();

        if (!form) return;

        if (!form.name?.trim()) {
            Swal.fire('Car name required', 'Please enter the car name.', 'warning');
            return;
        }

        if (!form.brand?.trim()) {
            Swal.fire('Brand required', 'Please enter the car brand.', 'warning');
            return;
        }

        if (!form.description?.trim()) {
            Swal.fire('Description required', 'Please enter a car description.', 'warning');
            return;
        }

        if (form.image && form.image.size > 5 * 1024 * 1024) {
            Swal.fire('Image too large', 'Please choose an image smaller than 5 MB.', 'warning');
            return;
        }

        const data = {
            name: form.name.trim(),
            brand: form.brand.trim(),
            model: form.model || '',
            year: Number(form.year),
            description: form.description.trim(),
            hourlyRate: Number(form.hourlyRate),
            fuelType: form.fuelType,
            transmission: form.transmission,
            seats: Number(form.seats),
            features: form.features,
            location: form.location || 'Amritsar',
            isAvailable: form.isAvailable,
        };

        try {
            setSaving(true);

            if (form.image) {
                data.imageData = await readFileAsDataUrl(form.image);

                data.imageName = form.image.name;
            }

            await updateCar(id, data);

            await Swal.fire({
                icon: 'success',
                title: 'Car updated',
                text: 'Car details have been updated successfully.',
                timer: 1500,
                showConfirmButton: false,
            });

            navigate('/admin/cars');
        } catch (error) {
            console.error('Unable to update car:', error);

            Swal.fire(
                'Update failed',
                error.response?.data?.message || 'Unable to update the car.',
                'error'
            );
        } finally {
            setSaving(false);
        }
    };

    if (form === null) {
        return (
            <div className="edit-car-loading">
                <div className="cars-loading-spinner" />
                <p>Loading car details...</p>
            </div>
        );
    }

    if (form === false) {
        return (
            <div className="content-card edit-car-error">
                <div className="edit-car-error-icon">!</div>

                <h2>Car could not be loaded</h2>

                <p>
                    The requested car could not be found or there was a problem loading its details.
                </p>

                <button
                    type="button"
                    className="btn btn-primary-custom"
                    onClick={() => navigate('/admin/cars')}
                >
                    ← Back to Cars
                </button>
            </div>
        );
    }

    return (
        <div className="edit-car-page">
            {/* PAGE HEADER */}

            <div className="edit-car-header">
                <div>
                    <button
                        type="button"
                        className="edit-car-back"
                        onClick={() => navigate('/admin/cars')}
                    >
                        ← Back to Cars
                    </button>

                    <span className="eyebrow">FLEET MANAGEMENT</span>

                    <h1>Edit car.</h1>

                    <p>Update your vehicle details, pricing, availability and image.</p>
                </div>

                <div
                    className={`edit-car-status ${form.isAvailable ? 'available' : 'unavailable'}`}
                >
                    <span />
                    {form.isAvailable ? 'Currently Available' : 'Currently Unavailable'}
                </div>
            </div>

            <form className="edit-car-layout" onSubmit={submit}>
                {/* LEFT SIDE */}

                <div className="edit-car-main">
                    {/* BASIC INFORMATION */}

                    <section className="edit-section">
                        <div className="edit-section-header">
                            <div className="edit-section-number">01</div>

                            <div>
                                <h2>Basic information</h2>

                                <p>Enter the main details of your vehicle.</p>
                            </div>
                        </div>

                        <div className="edit-form-grid">
                            <div className="edit-form-group">
                                <label>
                                    Car Name
                                    <span>*</span>
                                </label>

                                <input
                                    type="text"
                                    name="name"
                                    value={form.name || ''}
                                    onChange={change}
                                    placeholder="e.g. City Sedan"
                                />
                            </div>

                            <div className="edit-form-group">
                                <label>
                                    Brand
                                    <span>*</span>
                                </label>

                                <input
                                    type="text"
                                    name="brand"
                                    value={form.brand || ''}
                                    onChange={change}
                                    placeholder="e.g. Honda"
                                />
                            </div>

                            <div className="edit-form-group">
                                <label>Model</label>

                                <input
                                    type="text"
                                    name="model"
                                    value={form.model || ''}
                                    onChange={change}
                                    placeholder="e.g. City 5th Gen"
                                />
                            </div>

                            <div className="edit-form-group">
                                <label>
                                    Manufacturing Year
                                    <span>*</span>
                                </label>

                                <input
                                    type="number"
                                    name="year"
                                    value={form.year || ''}
                                    onChange={change}
                                    min="1900"
                                    max="2100"
                                    placeholder="2025"
                                />
                            </div>
                        </div>
                    </section>

                    {/* VEHICLE DETAILS */}

                    <section className="edit-section">
                        <div className="edit-section-header">
                            <div className="edit-section-number">02</div>

                            <div>
                                <h2>Vehicle details</h2>

                                <p>Configure specifications for this vehicle.</p>
                            </div>
                        </div>

                        <div className="edit-form-grid edit-form-grid-3">
                            <div className="edit-form-group">
                                <label>Fuel Type</label>

                                <select
                                    name="fuelType"
                                    value={form.fuelType || 'Petrol'}
                                    onChange={change}
                                >
                                    <option value="Petrol">Petrol</option>

                                    <option value="Diesel">Diesel</option>

                                    <option value="Electric">Electric</option>

                                    <option value="Hybrid">Hybrid</option>
                                </select>
                            </div>

                            <div className="edit-form-group">
                                <label>Transmission</label>

                                <select
                                    name="transmission"
                                    value={form.transmission || 'Automatic'}
                                    onChange={change}
                                >
                                    <option value="Automatic">Automatic</option>

                                    <option value="Manual">Manual</option>
                                </select>
                            </div>

                            <div className="edit-form-group">
                                <label>Seats</label>

                                <input
                                    type="number"
                                    name="seats"
                                    value={form.seats || 5}
                                    onChange={change}
                                    min="1"
                                    max="20"
                                />
                            </div>
                        </div>

                        <div className="edit-form-group edit-full-width">
                            <label>Features</label>

                            <input
                                type="text"
                                name="features"
                                value={form.features || ''}
                                onChange={change}
                                placeholder="AC, GPS, Bluetooth, Airbags, USB..."
                            />

                            <small>Separate multiple features with commas.</small>
                        </div>
                    </section>

                    {/* DESCRIPTION */}

                    <section className="edit-section">
                        <div className="edit-section-header">
                            <div className="edit-section-number">03</div>

                            <div>
                                <h2>Description</h2>

                                <p>Describe the vehicle for your customers.</p>
                            </div>
                        </div>

                        <div className="edit-form-group">
                            <label>
                                Vehicle Description
                                <span>*</span>
                            </label>

                            <textarea
                                name="description"
                                value={form.description || ''}
                                onChange={change}
                                rows="6"
                                placeholder="Write a detailed description of this car..."
                            />
                        </div>
                    </section>

                    {/* LOCATION */}

                    <section className="edit-section">
                        <div className="edit-section-header">
                            <div className="edit-section-number">04</div>

                            <div>
                                <h2>Location</h2>

                                <p>Set the vehicle pickup location.</p>
                            </div>
                        </div>

                        <div className="edit-form-group">
                            <label>Pickup Location</label>

                            <input
                                type="text"
                                name="location"
                                value={form.location || 'Amritsar'}
                                onChange={change}
                                placeholder="Amritsar"
                            />
                        </div>
                    </section>

                    {/* ACTIONS */}

                    <div className="edit-car-bottom-actions">
                        <button
                            type="button"
                            className="edit-cancel-btn"
                            onClick={() => navigate('/admin/cars')}
                            disabled={saving}
                        >
                            Cancel
                        </button>

                        <button type="submit" className="edit-save-btn" disabled={saving}>
                            {saving ? (
                                <>
                                    <span className="edit-btn-spinner" />
                                    Saving...
                                </>
                            ) : (
                                <>✓ Save Changes</>
                            )}
                        </button>
                    </div>
                </div>

                {/* RIGHT SIDEBAR */}

                <aside className="edit-car-sidebar">
                    {/* IMAGE */}

                    <section className="edit-sidebar-card">
                        <div className="edit-sidebar-heading">
                            <div>
                                <span>VEHICLE IMAGE</span>

                                <h3>Car photo</h3>
                            </div>
                        </div>

                        <div className="edit-image-preview">
                            {imagePreview ? (
                                <img
                                    src={imagePreview}
                                    alt={form.name || 'Car'}
                                    onError={(event) => {
                                        event.currentTarget.src = '/car-placeholder.svg';
                                    }}
                                />
                            ) : (
                                <div className="edit-no-image">
                                    <span>🚗</span>
                                    <p>No image available</p>
                                </div>
                            )}

                            <div className="edit-image-overlay">
                                <label htmlFor="car-image" className="edit-image-change">
                                    Change image
                                </label>
                            </div>
                        </div>

                        <input
                            id="car-image"
                            type="file"
                            name="image"
                            accept="image/*"
                            onChange={change}
                            className="edit-image-input"
                        />

                        <label htmlFor="car-image" className="edit-upload-btn">
                            ↑ Choose New Image
                        </label>

                        <p className="edit-image-help">JPG, PNG or WEBP. Maximum size 5 MB.</p>
                    </section>

                    {/* PRICING */}

                    <section className="edit-sidebar-card">
                        <div className="edit-sidebar-heading">
                            <div>
                                <span>PRICING</span>

                                <h3>Rental rate</h3>
                            </div>
                        </div>

                        <div className="edit-price-input">
                            <span>₹</span>

                            <input
                                type="number"
                                name="hourlyRate"
                                value={form.hourlyRate || ''}
                                onChange={change}
                                min="1"
                                step="1"
                                placeholder="500"
                            />

                            <small>/ hour</small>
                        </div>

                        <p>Customers will be charged this amount for each rental hour.</p>
                    </section>

                    {/* AVAILABILITY */}

                    <section className="edit-sidebar-card">
                        <div className="edit-sidebar-heading">
                            <div>
                                <span>STATUS</span>

                                <h3>Availability</h3>
                            </div>
                        </div>

                        <label className="availability-switch">
                            <input
                                type="checkbox"
                                name="isAvailable"
                                checked={!!form.isAvailable}
                                onChange={change}
                            />

                            <span className="availability-slider" />

                            <div>
                                <strong>
                                    {form.isAvailable ? 'Available for rental' : 'Unavailable'}
                                </strong>

                                <small>
                                    {form.isAvailable
                                        ? 'Customers can book this vehicle.'
                                        : 'Customers cannot book this vehicle.'}
                                </small>
                            </div>
                        </label>
                    </section>

                    {/* QUICK SUMMARY */}

                    <section className="edit-sidebar-card edit-summary-card">
                        <span className="edit-summary-label">QUICK SUMMARY</span>

                        <div className="edit-summary-row">
                            <span>Vehicle</span>

                            <strong>{form.brand || '—'}</strong>
                        </div>

                        <div className="edit-summary-row">
                            <span>Year</span>

                            <strong>{form.year || '—'}</strong>
                        </div>

                        <div className="edit-summary-row">
                            <span>Fuel</span>

                            <strong>{form.fuelType || '—'}</strong>
                        </div>

                        <div className="edit-summary-row">
                            <span>Seats</span>

                            <strong>{form.seats || '—'}</strong>
                        </div>

                        <div className="edit-summary-row">
                            <span>Transmission</span>

                            <strong>{form.transmission || '—'}</strong>
                        </div>
                    </section>
                </aside>
            </form>
        </div>
    );
}
