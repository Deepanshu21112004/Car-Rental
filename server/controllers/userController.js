const User = require('../models/User');
exports.profile = async (req, res, next) => {
    try {
        const { firstName, lastName, phone } = req.body;
        const u = await User.findByIdAndUpdate(
            req.user._id,
            { firstName, lastName, phone },
            { new: true, runValidators: true }
        );
        res.json({ user: u });
    } catch (e) {
        next(e);
    }
};
