const jwt = require('jsonwebtoken');
const { Jwt_Secret } = require('../db');
const User = require('../models/user');
const requireIdle = async (req, res, next) => {
    try {
        if (!req.user) {
            return next(); 
        }

        const user = req.user;
        const idleTimeout = 15 * 60 * 1000; 
        const currentTime = Date.now();
        const lastActivityTime = user.lastActivityTime || 0;

   
        if (currentTime - lastActivityTime > idleTimeout) {
          
            user.tokens = [];
            await user.save();

            
            return res.status(401).json({ message: 'User logged out due to inactivity' });
        }

        user.lastActivityTime = currentTime;
        await user.save();

        next();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = requireIdle;
