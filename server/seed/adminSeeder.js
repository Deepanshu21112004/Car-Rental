require('dotenv').config();

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const User = require('../models/User');
const connectDB = require('../config/db');

(async () => {
    try {
        await connectDB();

        const email = (process.env.ADMIN_EMAIL || 'admin@icar-rental.com').toLowerCase();

        const password = process.env.ADMIN_PASSWORD || 'Admin@12345';

        let user = await User.findOne({
            email,
        }).select('+password');

        if (user) {
            // Existing account:
            // make it ADMIN and reset its password
            user.role = 'ADMIN';

            user.password = await bcrypt.hash(password, 12);

            user.isBlocked = false;

            await user.save();

            console.log('Existing user updated as ADMIN:', email);
        } else {
            // Create new ADMIN account
            user = await User.create({
                firstName: process.env.ADMIN_FIRST_NAME || 'I',

                lastName: process.env.ADMIN_LAST_NAME || 'CAR',

                email,

                phone: process.env.ADMIN_PHONE || '9999999999',

                password: await bcrypt.hash(password, 12),

                role: 'ADMIN',

                isBlocked: false,
            });

            console.log('Admin created:', user.email);
        }

        console.log('Admin email:', email);

        console.log('Admin password:', password);

        await mongoose.disconnect();

        process.exit(0);
    } catch (error) {
        console.error('Admin seeder error:', error);

        await mongoose.disconnect();

        process.exit(1);
    }
})();
