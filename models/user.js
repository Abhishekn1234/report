const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    Id: {
        type: Number,
        required: true,
        unique: true,
    },
    Designation: {
        type: String,
        required: true,
    },
    jobMethod: {
        type: String,
        required: true,
    },
    number: {
        type: mongoose.Schema.Types.Mixed,
        unique: true,
        sparse: true,
    },
    fullName: {
        type: String,
        required: true,
    },
    confirmPassword: {
        type: String,
        required: function () {
            return this.isNew || this.isModified("password");
        },
    },
    tokens: [{
        token: {
            type: String,
            required: true
        },
        loginTime: {
            type: Date
        },
        logoutTime: {
            type: Date
        },
    }],
});

const UserSchema = mongoose.model("User", userSchema);
module.exports = UserSchema;
