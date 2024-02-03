const express = require('express');
const router = express.Router();
const Employee = require('../models/employees');
const authMiddleware = require('../middleware/auth');
router.get('/employees', authMiddleware, async (req, res) => {
    try {
        
        const employees = await Employee.find({ userId: req.user.userId });
        res.json(employees);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});
router.get('/employees/:id', authMiddleware, async (req, res) => {
    try {
        const employee = await Employee.findOne({ _id: req.params.id, userId: req.user.userId });
        
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        res.json(employee);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

router.post('/employees', authMiddleware, async (req, res) => {
    try {
        const { name, position, department } = req.body;
        const newEmployee = new Employee({ name, position, department, userId: req.user.userId });
        await newEmployee.save();
        res.status(201).json({ message: 'Employee added successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});


router.put('/employees/:id', authMiddleware, async (req, res) => {
    try {
        const employeeId = req.params.id;
        const { name, position, department } = req.body;

        const employee = await Employee.findOne({ _id: employeeId, userId: req.user.userId });

        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        employee.name = name;
        employee.position = position;
        employee.department = department;

        const updatedEmployee = await employee.save();

        return res.status(200).json({ message: 'Employee updated successfully', data: updatedEmployee });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});


router.delete('/employees/:id', authMiddleware, async (req, res) => {
    try {
        const employeeId = req.params.id;

        const deletedEmployee = await Employee.findOneAndDelete({ _id: employeeId, userId: req.user.userId });

        if (!deletedEmployee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        return res.status(200).json({ message: 'Employee deleted successfully', data: deletedEmployee });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});


router.patch('/employees/:id', authMiddleware, async (req, res) => {
    try {
        const employeeId = req.params.id;
        const { name, position, department } = req.body;
        const employee = await Employee.findOne({ _id: employeeId, userId: req.user.userId });

        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        if (name) {
            employee.name = name;
        }
        if (position) {
            employee.position = position;
        }
        if (department) {
            employee.department = department;
        }

        const updatedEmployee = await employee.save();

        return res.status(200).json({ message: 'Employee updated successfully', data: updatedEmployee });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = router;
