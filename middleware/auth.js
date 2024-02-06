const jwt = require('jsonwebtoken');
const { Jwt_Secret } = require('../db');
const User = require('../models/user');

const requireLogin = async (req, res, next) => {
    const { authorization } = req.headers;

    if (!authorization) {
        return res.status(401).json({ message: 'You must be logged in' });
    }

    const token = authorization.replace('Bearer ', '');

    jwt.verify(token, Jwt_Secret, async (err, payload) => {
        if (err) {
            return res.status(401).json({ message: 'Invalid token or you must be logged in' });
        }

        try {
            const user = await User.findById(payload.userId);

            if (!user) {
                return res.status(401).json({ message: 'User not found' });
            }

            req.user = user;
            await user.save();
            next();
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    });
};

module.exports = requireLogin;