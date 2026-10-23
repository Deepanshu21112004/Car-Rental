import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { createCar } from '../../services/carService';

const initialForm = {
    name: '',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    description: '',
    hourlyRate: '',
    fuelType: 'Petrol',
    transmission: 'Automatic',
    seats: 5,
    features: '',
    location: 'Amritsar',
    isAvailable: true,
    image: null,
};

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Unable to read image'));
        reader.readAsDataURL(file);
    });
}

export default function AddCar() {
    const nav = useNavigate();
    const [f, setF] = useState(initialForm);
    const [saving, setSaving] = useState(false);

    const change = (e) => {
        const { name, type, checked, value, files } = e.target;
        setF((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : type === 'file' ? files?.[0] || null : value,
        }));
    };

    const submit = async (e) => {
        e.preventDefault();
        if (!f.image) {
            Swal.fire(
                'Image required',
                'Please choose a car image before adding the car.',
                'warning'
            );
            return;
        }
        if (f.image.size > 5 * 1024 * 1024) {
            Swal.fire('Image too large', 'Please choose an image smaller than 5 MB.', 'warning');
            return;
        }

        const imageData = await readFileAsDataUrl(f.image);
        const data = {
            name: f.name.trim(),
            brand: f.brand.trim(),
            model: f.model.trim(),
            year: Number(f.year),
            description: f.description.trim(),
            hourlyRate: Number(f.hourlyRate),
            fuelType: f.fuelType,
            transmission: f.transmission,
            seats: Number(f.seats),
            features: f.features,
            location: f.location.trim(),
            isAvailable: f.isAvailable,
            imageData,
            imageName: f.image.name,
        };

        try {
            setSaving(true);
            await createCar(data);
            await Swal.fire({
                icon: 'success',
                title: 'Car added successfully',
                text: 'The image has also been uploaded and is now available to users.',
                timer: 1800,
                showConfirmButton: false,
            });
            nav('/admin/cars');
        } catch (e) {
            Swal.fire('Error', e.response?.data?.message || 'Unable to add car', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <CarForm
            title="Add a new car"
            f={f}
            change={change}
            submit={submit}
            button={saving ? 'Uploading...' : 'Add car'}
        />
    );
}

export function CarForm({ title, f, change, submit, button, imageRequired = false }) {
    return (
        <div>
            <div className="dash-heading">
                <div>
                    <span className="eyebrow">FLEET</span>
                    <h1>{title}</h1>
                </div>
            </div>
            <form className="form-card" onSubmit={submit}>
                <div className="two-col">
                    <label>
                        Car name
                        <input name="name" required value={f.name} onChange={change} />
                    </label>
                    <label>
                        Brand
                        <input name="brand" required value={f.brand} onChange={change} />
                    </label>
                </div>
                <div className="two-col">
                    <label>
                        Model
                        <input name="model" value={f.model} onChange={change} />
                    </label>
                    <label>
                        Year
                        <input
                            name="year"
                            type="number"
                            required
                            value={f.year}
                            onChange={change}
                        />
                    </label>
                </div>
                <label>
                    Description
                    <textarea
                        name="description"
                        required
                        rows="4"
                        value={f.description}
                        onChange={change}
                    />
                </label>
                <div className="three-col">
                    <label>
                        Hourly rate
                        <input
                            name="hourlyRate"
                            type="number"
                            min="1"
                            required
                            value={f.hourlyRate}
                            onChange={change}
                        />
                    </label>
                    <label>
                        Seats
                        <input
                            name="seats"
                            type="number"
                            min="1"
                            value={f.seats}
                            onChange={change}
                        />
                    </label>
                    <label>
                        Fuel
                        <select name="fuelType" value={f.fuelType} onChange={change}>
                            <option>Petrol</option>
                            <option>Diesel</option>
                            <option>Electric</option>
                            <option>Hybrid</option>
                        </select>
                    </label>
                </div>
                <div className="two-col">
                    <label>
                        Transmission
                        <select name="transmission" value={f.transmission} onChange={change}>
                            <option>Automatic</option>
                            <option>Manual</option>
                        </select>
                    </label>
                    <label>
                        Location
                        <input name="location" value={f.location} onChange={change} />
                    </label>
                </div>
                <label>
                    Features (comma separated)
                    <input
                        name="features"
                        value={f.features}
                        onChange={change}
                        placeholder="AC, GPS, Bluetooth"
                    />
                </label>
                <label>
                    Car image{' '}
                    {imageRequired ? '(optional when keeping the existing image)' : '(required)'}
                    <input
                        name="image"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={change}
                        required={!imageRequired}
                    />
                    {f.image && <small className="muted">Selected: {f.image.name}</small>}
                </label>
                <label className="check-label">
                    <input
                        type="checkbox"
                        name="isAvailable"
                        checked={f.isAvailable}
                        onChange={change}
                    />{' '}
                    Available for booking
                </label>
                <button
                    type="submit"
                    disabled={button === 'Uploading...'}
                    className="btn btn-primary-custom"
                >
                    {button}
                </button>
            </form>
        </div>
    );
}
