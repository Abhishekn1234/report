const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { Jwt_Secret } = require('../db');

router.post('/login', async (req, res) => {
    try {
        const { email, number, password } = req.body;

        const user = await User.findOne({ $or: [{ email }, { number }] });

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or mobile number format' });
        }

       
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or mobile number format' });
        }

        
        const token = jwt.sign({ userId: user._id }, Jwt_Secret);
        console.log(token);
        return res.status(200).json({ token, message: 'Login successful' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});

router.post('/register', async (req, res) => {
    try {
        const { Id, fullName, Designation, email, number, password, confirmPassword, jobMethod } = req.body;

        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        const isMobileNumber = /^\d{10}$/.test(number);

        if (!isEmail && !isMobileNumber) {
            return res.status(400).json({ message: 'Invalid email or mobile number format' });
        }

        const user = await User.findOne({ $or: [{ email: email }, { number: number }] });
        if (user) {
            return res.status(400).json({ message: 'User already exists with this email or mobile number' });
        }

        if (!confirmPassword) {
            return res.status(400).json({ message: 'confirmPassword is required' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            Id,
            fullName, 
            Designation,
            email,
            number,
            password: hashedPassword,
            jobMethod,
            confirmPassword: hashedPassword,
        });

        const savedUser = await newUser.save();
        console.log(savedUser);
        return res.status(200).json({ message: "User registered successfully" });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});




module.exports=router;