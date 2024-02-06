const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Attendance = require('../models/attandance');
const User = require('../models/user');
const requireLogin = require('../middleware/auth');

const jwt = require('jsonwebtoken');
const { Jwt_Secret } = require("../db");
router.post('/checkin', requireLogin, async (req, res) => {
    try {
        const { userId, fullName, position } = req.user;
        const checkInTime = new Date();

        const attendanceDetails = await Attendance.findOne({ userId });

        if (!attendanceDetails) {

            const newAttendance = new Attendance({
                userId,
                attendanceDetails: [{ checkInTime }],
            });
            await newAttendance.save();
        } else {
            
            attendanceDetails.attendanceDetails.push({ checkInTime });
            await attendanceDetails.save();
        }

        res.json({
            message: 'Check-in successful.',
            user: {
                fullName,
                position,
            },
            checkInTime: checkInTime.toLocaleTimeString(),
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

router.post('/checkout', requireLogin, async (req, res) => {
    try {
        const { userId, fullName, position } = req.user;
        const checkOutTime = new Date();

        const attendanceDetails = await Attendance.findOne({ userId });

        if (!attendanceDetails || !attendanceDetails.attendanceDetails || attendanceDetails.attendanceDetails.length === 0) {
            console.log('No open check-in record found.');
            return res.status(400).json({ message: 'Employee has not checked in yet.' });
        }


        const lastCheckInRecord = attendanceDetails.attendanceDetails.pop();


        lastCheckInRecord.checkOutTime = checkOutTime;


        await attendanceDetails.save();

        res.json({
            message: 'Check-out successful.',
            user: {
                fullName,
                position,
            },
            checkOutTime: checkOutTime.toLocaleTimeString(),
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
const calculateWorkingHours = (checkInTime, checkOutTime) => {
    const timeDiff = Math.abs(checkOutTime - checkInTime) / 1000;
    const hours = Math.floor(timeDiff / 3600);
    const minutes = Math.floor((timeDiff % 3600) / 60);
    const seconds = Math.floor(timeDiff % 60);

    return { hours, minutes, seconds };
};
router.get('/working-hours/:userId', requireLogin, async (req, res) => {
    const userId = req.params.userId;

    try {
        const user = req.user;

        const attendanceDetails = await Attendance.findOne({ userId })
            .sort({ 'attendanceDetails.checkInTime': 1 });

        console.log('Attendance Details:', attendanceDetails);

        if (!attendanceDetails || !attendanceDetails.attendanceDetails || attendanceDetails.attendanceDetails.length < 2) {
            console.log('Not enough check-in and check-out records.');
            return res.status(400).json({ message: 'Not enough check-in and check-out records.' });
        }

        attendanceDetails.attendanceDetails.sort((a, b) => new Date(a.checkOutTime).getTime() - new Date(b.checkInTime).getTime());
        console.log('Attendance Details:', attendanceDetails.attendanceDetails);
        const workingHoursArray = [];
        let totalCheckIns = 0;
        let totalCheckOuts = 0;

        for (let i = 0; i < attendanceDetails.attendanceDetails.length - 1; i += 2) {

            const checkInTimeString = attendanceDetails.attendanceDetails[i].checkInTime;
            const checkOutTimeString = attendanceDetails.attendanceDetails[i + 1].checkOutTime;




           
            const convertTimeStringToDate = (timeString) => {
                const [time, period] = timeString.split(' ');
                const [hours, minutes, seconds] = time.split(':');
                const parsedHours = parseInt(hours, 10) + (period.toLowerCase() === 'pm' ? 12 : 0);
                return new Date(0, 0, 0, parsedHours, parseInt(minutes, 10), parseInt(seconds, 10));
            };




            const checkInTime = convertTimeStringToDate(checkInTimeString);
            const checkOutTime = convertTimeStringToDate(checkOutTimeString);

            console.log(checkInTime);
            console.log(checkOutTime);

            if (isNaN(checkInTime.getTime()) || isNaN(checkOutTime.getTime())) {
                console.log('Invalid date format in check-in or check-out time.');

                return res.status(400).json({ message: 'Invalid date format in check-in or check-out time.' });
            }

            const workingHours = calculateWorkingHours(checkInTime, checkOutTime);
            console.log(workingHours);
            workingHoursArray.push({
                checkInTime: checkInTime.toLocaleTimeString(),
                checkOutTime: checkOutTime.toLocaleTimeString(),
                workingHours,
            });

           
            totalCheckIns += 1;
            totalCheckOuts += 1;
        }
        console.log(workingHoursArray);

        res.json({
            user: {
                userId: user.userId,
                fullName: user.fullName,
                position: user.position,
            },
            workingHoursArray,
            totalCheckIns,
            totalCheckOuts,
        });

    } catch (error) {
        console.error('Error generating working hours:', error);
       
        if (!res.headersSent) {
            res.status(500).send('Internal Server Error');
        }
    }
});
router.get('/latest-checkinout/:userId', requireLogin, async (req, res) => {
    const userId = req.params.userId;

    try {
        const attendanceDetails = await Attendance.findOne({ userId });

        console.log('Attendance Details:', attendanceDetails);

        if (!attendanceDetails || !attendanceDetails.attendanceDetails || attendanceDetails.attendanceDetails.length === 0) {
            console.log('No attendance records found.');
            return res.status(400).json({ message: 'No attendance records found.' });
        }

        const checkInTimes = attendanceDetails.attendanceDetails.map(record => record.checkInTime);
        const checkOutTimes = attendanceDetails.attendanceDetails.map(record => record.checkOutTime);

        console.log('Check-In Times:', checkInTimes);
        console.log('Check-Out Times:', checkOutTimes);

      
        const convertTimeStringToDate = (timeString) => {
            const [hours, minutes, seconds] = timeString.split(':');
            return new Date(0, 0, 0, parseInt(hours, 10), parseInt(minutes, 10), parseInt(seconds, 10));
        };

        const latestCheckInTime = new Date(Math.max(...checkInTimes.map(timeString => convertTimeStringToDate(timeString))));
        const latestCheckOutTime = new Date(Math.max(...checkOutTimes.map(timeString => convertTimeStringToDate(timeString))));

      
        if (isNaN(latestCheckInTime.getTime()) || isNaN(latestCheckOutTime.getTime())) {
            console.log('Invalid date format in check-in or check-out time.');
            return res.status(400).json({ message: 'Invalid date format in check-in or check-out time.' });
        }

        res.json({
            latestCheckInTime: latestCheckInTime.toLocaleTimeString(),
            latestCheckOutTime: latestCheckOutTime.toLocaleTimeString(),
        });

    } catch (error) {
        console.error('Error retrieving latest check-in and check-out:', error);
       
        if (!res.headersSent) {
            res.status(500).send('Internal Server Error');
        }
    }
});






module.exports = router;
