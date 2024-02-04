const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },

    attendanceDetails: [
        {
            checkInTime: {
                type: String,
                default: () => new Date().toLocaleTimeString(),
            },
            checkOutTime: {
                type: String,
                default: () => new Date().toLocaleTimeString(),
            },
        },
    ],
});

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
