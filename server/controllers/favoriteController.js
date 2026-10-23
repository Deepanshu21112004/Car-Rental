const Favorite = require('../models/Favorite');
const Car = require('../models/Car');

exports.list = async (req, res, next) => {
    try {
        const favorites = await Favorite.find({
            userId: req.user._id,
        })
            .populate('carId')
            .sort({ createdAt: -1 });

        res.json({
            favorites,
        });
    } catch (error) {
        next(error);
    }
};

exports.toggle = async (req, res, next) => {
    try {
        const { carId } = req.body;

        if (!carId) {
            return res.status(400).json({
                message: 'carId is required',
            });
        }

        const car = await Car.findById(carId);

        if (!car) {
            return res.status(404).json({
                message: 'Car not found',
            });
        }

        const existing = await Favorite.findOne({
            userId: req.user._id,
            carId,
        });

        if (existing) {
            await existing.deleteOne();

            return res.json({
                favorited: false,
                message: 'Car removed from favorites',
            });
        }

        try {
            await Favorite.create({
                userId: req.user._id,
                carId,
            });
        } catch (error) {
            // Handles duplicate favorite attempts safely
            if (error.code === 11000) {
                return res.json({
                    favorited: true,
                    message: 'Car is already in favorites',
                });
            }

            throw error;
        }

        return res.status(201).json({
            favorited: true,
            message: 'Car added to favorites',
        });
    } catch (error) {
        next(error);
    }
};

exports.remove = async (req, res, next) => {
    try {
        const favorite = await Favorite.findOneAndDelete({
            userId: req.user._id,
            carId: req.params.carId,
        });

        if (!favorite) {
            return res.status(404).json({
                message: 'Favorite not found',
            });
        }

        res.json({
            success: true,
            message: 'Favorite removed',
        });
    } catch (error) {
        next(error);
    }
};
