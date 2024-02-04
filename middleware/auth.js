const jwt = require("jsonwebtoken");
const { Jwt_Secret } = require("../db");
const User = require("../models/user");

const authMiddleware = async (req, res, next) => {
    const { authorization } = req.headers;

    if (!authorization) {
        return res.status(401).json({ error: "You must be logged in" });
    }

    const token = authorization.replace("Bearer ", "");

    jwt.verify(token, Jwt_Secret, async (err, payload) => {
        if (err) {
            return res.status(401).json({ error: "Invalid token or you must be logged in" });
        }

        try {
            const user = await User.findById(payload.userId);

            if (!user) {
                return res.status(401).json({ error: "User not found" });
            }

            req.user = {
                userId: user._id,
                email: user.email,
                fullName: user.fullName,
                position: user.Designation,
            };

            req.token = token;
            next();
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });
};

module.exports = authMiddleware;
