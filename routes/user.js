const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { Jwt_Secret } = require('../db');
const requireLogin = require('../middleware/auth');
const requireIdle=require("../middleware/CheckIdleTime")
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
router.post('/login', async (req, res) => {
    try {
        const { email, number, password } = req.body;

        const user = await User.findOne({ $or: [{ email }, { number }] });

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or mobile number format' });
        }


        if (user.tokens.some(token => !token.logoutTime)) {
            return res.status(400).json({ message: 'User is already logged in. Logout before logging in again.' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or mobile number format' });
        }

        const token = jwt.sign({ userId: user._id }, Jwt_Secret);

        const loginTime = new Date();

        user.tokens.push({
            token,
            loginTime,
        });

        await user.save();

        console.log(token);
        return res.status(200).json({
            token,
            loginTime: loginTime.toLocaleTimeString(),
            message: 'Login successful',
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});
router.post('/logout', requireLogin, async (req, res) => {
    try {
        const user = req.user;

        const logoutTime = new Date();


        if (user.tokens.length === 0 || user.tokens[user.tokens.length - 1].logoutTime) {
            return res.status(400).json({ message: 'No active sessions found for the user' });
        }


        user.tokens[user.tokens.length - 1].logoutTime = logoutTime;
        await user.save();

        console.log('User logged out. Logout Time:', logoutTime);


        const lastLoginTime = user.tokens[user.tokens.length - 1].loginTime;
        const timeDifference = logoutTime - lastLoginTime;
        const workingHours = timeDifference / (1000 * 60 * 60);

        console.log('Working Hours:', workingHours);


        return res.status(200).json({
            message: 'Logout successful',
            logoutTime: logoutTime.toLocaleTimeString(),
            workingHours: calculateWorkingHours(timeDifference),
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});
function calculateWorkingHours(timeDifference) {
    const hours = Math.floor(timeDifference / (1000 * 60 * 60));
    const remainingMinutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
    const remainingSeconds = Math.floor((timeDifference % (1000 * 60)) / 1000);

    return `${hours} hours: ${remainingMinutes} minutes: ${remainingSeconds} seconds`;

}
router.get('/weekly-report', requireLogin, async (req, res) => {
    try {
        const weeklyReport = {};
        const weeklyStartDate = new Date();
        weeklyStartDate.setDate(weeklyStartDate.getDate() - 7);

        req.user.tokens
            .filter(token => token.logoutTime && token.loginTime && new Date(token.loginTime) >= weeklyStartDate)
            .forEach(token => {
                const loginTime = new Date(token.loginTime);
                const logoutTime = new Date(token.logoutTime);
                const dateKey = loginTime.toDateString();

                if (!weeklyReport[dateKey]) {
                    weeklyReport[dateKey] = {
                        name: req.user.fullName,
                        position: req.user.Designation,
                        date: dateKey,
                        dailyReports: [],
                        workingHours: 0,
                        checkInCount: 0,
                        checkOutCount: 0,
                    };
                }

                const dailyWorkingHours = (logoutTime - loginTime) / (1000 * 60 * 60);
                weeklyReport[dateKey].workingHours += dailyWorkingHours;

                weeklyReport[dateKey].dailyReports.push({
                    loginTime: loginTime.toLocaleTimeString(),
                    logoutTime: logoutTime.toLocaleTimeString(),
                    dailyWorkingHours,
                    percentage: ((dailyWorkingHours / 24) * 100).toFixed(2) + '%',
                });

                weeklyReport[dateKey].checkInCount++;
                weeklyReport[dateKey].checkOutCount++;
            });

        Object.values(weeklyReport).forEach(entry => {
            entry.workingHours = convertDecimalHoursToTime(entry.workingHours);
            entry.dailyReports.forEach(report => {
                report.dailyWorkingHours = convertDecimalHoursToTime(report.dailyWorkingHours);
            });
        });


        const weeklyReportArray = Object.values(weeklyReport);
        return res.status(200).json({ weeklyReport: weeklyReportArray });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});
router.get('/monthly-report', requireLogin, async (req, res) => {
    try {
        const monthlyReport = {};
        const monthStartDate = new Date();
        monthStartDate.setDate(1);

        req.user.tokens
            .filter(token => token.logoutTime && token.loginTime && new Date(token.loginTime) >= monthStartDate)
            .forEach(token => {
                const loginTime = new Date(token.loginTime);
                const logoutTime = new Date(token.logoutTime);
                const dateKey = loginTime.toDateString();

                if (!monthlyReport[dateKey]) {
                    monthlyReport[dateKey] = {
                        name: req.user.fullName,
                        position: req.user.Designation,
                        date: dateKey,
                        dailyReports: [],
                        workingHours: 0,
                        checkInCount: 0,
                        checkOutCount: 0,
                    };
                }

                const dailyWorkingHours = (logoutTime - loginTime) / (1000 * 60 * 60);
                monthlyReport[dateKey].workingHours += dailyWorkingHours;

                monthlyReport[dateKey].dailyReports.push({
                    loginTime: loginTime.toLocaleTimeString(),
                    logoutTime: logoutTime.toLocaleTimeString(),
                    dailyWorkingHours,
                    percentage: ((dailyWorkingHours / 24) * 100).toFixed(2) + '%',
                });

                monthlyReport[dateKey].checkInCount++;
                monthlyReport[dateKey].checkOutCount++;
            });

        Object.values(monthlyReport).forEach(entry => {
            entry.workingHours = convertDecimalHoursToTime(entry.workingHours);
            entry.dailyReports.forEach(activity => {
                activity.dailyWorkingHours = convertDecimalHoursToTime(activity.dailyWorkingHours);
            });
        });

        const monthlyReportArray = Object.values(monthlyReport);
        return res.status(200).json({ monthlyReport: monthlyReportArray });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});
router.get('/daily-report', requireLogin, async (req, res) => {
    try {
        const dailyReport = {};
        const currentDate = new Date();
        const todayDateKey = currentDate.toDateString();

        req.user.tokens
            .filter(token => token.logoutTime && token.loginTime && new Date(token.loginTime).toDateString() === todayDateKey)
            .forEach(token => {
                const loginTime = new Date(token.loginTime);
                const logoutTime = new Date(token.logoutTime);

                if (!dailyReport[todayDateKey]) {
                    dailyReport[todayDateKey] = {
                        name: req.user.fullName,
                        position: req.user.Designation,
                        date: todayDateKey,
                        workingHours: 0,
                        checkInCount: 0,
                        checkOutCount: 0,
                    };
                }

                const dailyWorkingHours = (logoutTime - loginTime) / (1000 * 60 * 60);
                dailyReport[todayDateKey].workingHours += dailyWorkingHours;
                dailyReport[todayDateKey].checkInCount++;
                dailyReport[todayDateKey].checkOutCount++;
            });

        Object.values(dailyReport).forEach(entry => {
            entry.workingHours = convertDecimalHoursToTime(entry.workingHours);
        });


        const dailyReportArray = Object.values(dailyReport);
        return res.status(200).json({ dailyReport: dailyReportArray });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});
function convertDecimalHoursToTime(decimalHours) {
    const hours = Math.floor(decimalHours);
    const minutes = Math.floor((decimalHours % 1) * 60);
    const seconds = Math.floor((((decimalHours % 1) * 60) % 1) * 60);
    return { hours, minutes, seconds };
}
router.get('/protected-route', requireLogin, requireIdle, async (req, res) => {
    try {
        
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        
        return res.status(200).json({ user });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = router;






