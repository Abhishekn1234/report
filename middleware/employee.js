const jwt = require("jsonwebtoken");
const { Jwt_Secret } = require("../db");
const Employee = require("../models/employees");

const authEmployee = async (req, res, next) => {
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
            const employee = await Employee.findById(payload.employeeId);

            if (!employee) {
                return res.status(404).json({ error: "Employee not found" });
            }

            req.employee = employee;
            req.token = token;
            next();
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    });
};
