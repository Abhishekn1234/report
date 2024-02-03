const express = require('express');
const router = express.Router();
const Attendance = require('../models/attandance');
const authMiddleware = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const { Jwt_Secret } = require("../db");


router.post('/checkin', authMiddleware, async (req, res) => {
    try {
        const { userId, fullName, position } = req.user;
        
        const checkInTime = new Date().toLocaleTimeString();


        const attendanceRecord = {
            checkTime: checkInTime,
            isCheckOut: false,
        };


        let attendanceDetails = await Attendance.findOne({ userId });

        if (!attendanceDetails) {
            attendanceDetails = new Attendance({ Id, attendanceDetails: [attendanceRecord] });
        } else {
            attendanceDetails.attendanceDetails.push(attendanceRecord);
        }

        await attendanceDetails.save();

        res.json({
            message: 'Check-in successful.',
            user: {
                fullName,
                position,
            },
            checkTime: checkInTime.toLocaleString(),
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

router.post('/checkout', authMiddleware, async (req, res) => {
    try {
        const { userId, fullName, position } = req.user;
        const checkOutTime = new Date().toLocaleTimeString();

        const latestCheckInRecord = await Attendance.findOne({
            userId,
            'attendanceDetails.checkOutTime': null,
        }).sort({ 'attendanceDetails.checkInTime': -1 });

        if (!latestCheckInRecord || !latestCheckInRecord.attendanceDetails || latestCheckInRecord.attendanceDetails.length === 0) {
            return res.status(400).json({ message: 'Employee has not checked in yet.' });
        }

        const latestAttendanceDetails = latestCheckInRecord.attendanceDetails[0];
        latestAttendanceDetails.checkOutTime = checkOutTime;

       

        await latestCheckInRecord.save();

        const token = req.headers.authorization.split(' ')[1]; 
        jwt.verify(token, Jwt_Secret, (err, decoded) => {
            if (err) {
                console.error(err);
            } else {
                
                res.header('Authorization', ''); 
                res.json({
                    message: 'Check-out successful.',
                    user: {
                        fullName,
                        position,
                    },
                    checkOutTime,
                    
                });
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = router;
