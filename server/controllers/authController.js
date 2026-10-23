const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const User = require('../models/User');
const generateToken = require('../utils/generateToken');

/*
 * Authentication cookie settings
 */
const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
};

/*
 * ================================
 * REGISTER
 * ================================
 */
exports.register = async (req, res, next) => {
    try {
        const { firstName, lastName, email, phone, password } = req.body;

        if (!firstName || !lastName || !email || !phone || !password) {
            return res.status(400).json({
                message: 'All fields are required',
            });
        }

        const existingUser = await User.findOne({
            $or: [
                {
                    email: email.toLowerCase(),
                },
                {
                    phone,
                },
            ],
        });

        if (existingUser) {
            return res.status(409).json({
                message: 'Email or phone already exists',
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const user = await User.create({
            firstName,
            lastName,
            email: email.toLowerCase(),
            phone,
            password: passwordHash,

            /*
             * Public registration can only create
             * normal USER accounts.
             */
            role: 'USER',
        });

        /*
         * Create authentication cookie.
         */
        res.cookie('token', generateToken(user._id), cookieOptions);

        res.status(201).json({
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                role: user.role,
            },
        });
    } catch (error) {
        next(error);
    }
};

/*
 * ================================
 * LOGIN
 * ================================
 */
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: 'Email and password are required',
            });
        }

        const user = await User.findOne({
            email: email.toLowerCase(),
        }).select('+password');

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({
                message: 'Invalid email or password',
            });
        }

        if (user.isBlocked) {
            return res.status(403).json({
                message: 'Your account is blocked',
            });
        }

        /*
         * Create a fresh authentication cookie.
         */
        res.cookie('token', generateToken(user._id), cookieOptions);

        res.json({
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                role: user.role,
            },
        });
    } catch (error) {
        next(error);
    }
};

/*
 * ================================
 * LOGOUT
 * ================================
 */
exports.logout = (req, res) => {
    /*
     * Clear the main authentication cookie.
     */
    res.clearCookie('token', {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        path: '/',
    });

    /*
     * Also clear possible old cookies created
     * with different paths.
     */
    res.clearCookie('token', {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        path: '/api',
    });

    res.clearCookie('token', {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        path: '/api/auth',
    });

    res.json({
        success: true,
        message: 'Logged out successfully',
    });
};

/*
 * ================================
 * CURRENT USER
 * ================================
 */
exports.me = async (req, res) => {
    res.json({
        user: {
            id: req.user._id,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            email: req.user.email,
            phone: req.user.phone,
            role: req.user.role,
        },
    });
};

/*
 * ================================
 * FORGOT PASSWORD
 * ================================
 */
exports.forgotPassword = async (req, res, next) => {
    try {
        const user = await User.findOne({
            email: req.body.email?.toLowerCase(),
        });

        /*
         * Do not reveal whether an account exists.
         */
        if (!user) {
            return res.json({
                message: 'If the account exists, a reset request was created.',
            });
        }

        const token = crypto.randomBytes(24).toString('hex');

        user.resetToken = token;

        user.resetTokenExpires = Date.now() + 15 * 60 * 1000;

        await user.save();

        /*
         * Development version.
         * In production this token should be
         * sent through email instead.
         */
        res.json({
            message: 'Reset token created for development.',
            token,
        });
    } catch (error) {
        next(error);
    }
};

/*
 * ================================
 * RESET PASSWORD
 * ================================
 */
exports.resetPassword = async (req, res, next) => {
    try {
        const user = await User.findOne({
            resetToken: req.body.token,
            resetTokenExpires: {
                $gt: Date.now(),
            },
        }).select('+password');

        if (!user) {
            return res.status(400).json({
                message: 'Invalid or expired reset token',
            });
        }

        user.password = await bcrypt.hash(req.body.password, 12);

        user.resetToken = undefined;
        user.resetTokenExpires = undefined;

        await user.save();

        res.json({
            message: 'Password updated',
        });
    } catch (error) {
        next(error);
    }
};
