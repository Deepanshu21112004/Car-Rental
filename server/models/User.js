const mongoose = require('mongoose');

const schema = new mongoose.Schema(
    {
        firstName: {
            type: String,
            required: true,
            trim: true,
        },

        lastName: {
            type: String,
            required: true,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        phone: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },

        password: {
            type: String,
            required: true,
            select: false,
        },

        role: {
            type: String,
            enum: ['USER', 'ADMIN'],
            default: 'USER',
        },

        profileImage: String,

        isBlocked: {
            type: Boolean,
            default: false,
        },

        resetToken: String,

        resetTokenExpires: Date,
    },

    {
        timestamps: true,
    }
);

module.exports = mongoose.model('User', schema);
