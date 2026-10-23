const fs = require('fs');
const path = require('path');
const Car = require('../models/Car');

const uploadDir = path.join(__dirname, '..', 'uploads', 'cars');
fs.mkdirSync(uploadDir, { recursive: true });

function normalizeList(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean).map(String);
    return String(value)
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
}

function saveImageData(imageData, imageName = 'car') {
    if (!imageData) return null;
    const match = String(imageData).match(
        /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/i
    );
    if (!match)
        throw Object.assign(new Error('Invalid image. Use JPG, JPEG, PNG or WEBP.'), {
            status: 400,
        });

    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > 5 * 1024 * 1024) {
        throw Object.assign(new Error('Image is too large. Maximum size is 5 MB.'), {
            status: 400,
        });
    }
    const ext =
        match[1].toLowerCase() === 'jpeg' || match[1].toLowerCase() === 'jpg'
            ? 'jpg'
            : match[1].toLowerCase();
    const safeBase =
        String(imageName)
            .replace(/\.[^.]+$/, '')
            .replace(/[^a-zA-Z0-9_-]/g, '-')
            .replace(/-+/g, '-')
            .toLowerCase()
            .slice(0, 60) || 'car';
    const filename = `${safeBase}-${Date.now()}.${ext}`;
    const fullPath = path.join(uploadDir, filename);
    fs.writeFileSync(fullPath, buffer);
    return `/uploads/cars/${filename}`;
}

function removeUploadedImage(imagePath) {
    if (!imagePath || !imagePath.startsWith('/uploads/cars/')) return;
    const filename = path.basename(imagePath);
    const fullPath = path.join(uploadDir, filename);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
}

exports.getCars = async (req, res, next) => {
    try {
        const q = {};
        if (req.query.search) {
            const search = String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            q.$or = [
                { name: new RegExp(search, 'i') },
                { brand: new RegExp(search, 'i') },
                { model: new RegExp(search, 'i') },
            ];
        }
        if (req.query.fuelType) q.fuelType = req.query.fuelType;
        if (req.query.available === 'true') q.isAvailable = true;
        const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 100);
        const cars = await Car.find(q).sort({ createdAt: -1 }).limit(limit);
        res.json({ cars });
    } catch (e) {
        next(e);
    }
};

exports.getCar = async (req, res, next) => {
    try {
        const car = await Car.findById(req.params.id);
        if (!car) return res.status(404).json({ message: 'Car not found' });
        res.json({ car });
    } catch (e) {
        next(e);
    }
};

exports.createCar = async (req, res, next) => {
    let newImage = null;
    try {
        const body = { ...req.body };
        body.features = normalizeList(body.features);
        if (body.imageData) {
            newImage = saveImageData(body.imageData, body.imageName || body.name);
            body.images = [newImage];
        } else {
            body.images = normalizeList(body.images);
        }
        delete body.imageData;
        delete body.imageName;
        body.year = Number(body.year);
        body.hourlyRate = Number(body.hourlyRate);
        body.seats = Number(body.seats);
        body.isAvailable =
            body.isAvailable === undefined ? true : String(body.isAvailable) !== 'false';

        const car = await Car.create(body);
        res.status(201).json({ car });
    } catch (e) {
        if (newImage) removeUploadedImage(newImage);
        next(e);
    }
};

exports.updateCar = async (req, res, next) => {
    let newImage = null;
    try {
        const car = await Car.findById(req.params.id);
        if (!car) return res.status(404).json({ message: 'Car not found' });

        const body = { ...req.body };
        body.features = normalizeList(body.features);
        body.year = Number(body.year);
        body.hourlyRate = Number(body.hourlyRate);
        body.seats = Number(body.seats);
        body.isAvailable =
            body.isAvailable === undefined ? car.isAvailable : String(body.isAvailable) !== 'false';

        if (body.imageData) {
            newImage = saveImageData(body.imageData, body.imageName || body.name);
            body.images = [newImage];
            removeUploadedImage(car.images?.[0]);
        }
        delete body.imageData;
        delete body.imageName;

        Object.assign(car, body);
        await car.save();
        res.json({ car });
    } catch (e) {
        if (newImage) removeUploadedImage(newImage);
        next(e);
    }
};

exports.deleteCar = async (req, res, next) => {
    try {
        const car = await Car.findByIdAndDelete(req.params.id);
        if (!car) return res.status(404).json({ message: 'Car not found' });
        (car.images || []).forEach(removeUploadedImage);
        res.json({ message: 'Car deleted' });
    } catch (e) {
        next(e);
    }
};
