const mongoose = require('mongoose');

const schema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },

        carId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Car',
            required: true,
            index: true,
        },

        /*
         * One completed booking can have only one review.
         */
        bookingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Booking',
            required: true,
            unique: true,
            index: true,
        },

        rating: {
            type: Number,
            min: 1,
            max: 5,
            required: true,
        },

        comment: {
            type: String,
            required: true,
            trim: true,
            minlength: 3,
            maxlength: 1000,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Review', schema);
