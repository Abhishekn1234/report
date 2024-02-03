const express = require("express");
const app = express();
const { mongourl } = require("./db");
const mongoose = require("mongoose");
const port = 5000;
const LoginRoute = require("./routes/user");
const EmployeeRoute=require("./routes/employees");
const AttandanceRoute=require("./routes/attandace");
const cors = require("cors");

app.use(cors());
app.use(express.json());
mongoose.connect(mongourl, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log("Mongodb is connected");
    })
    .catch((err) => {
        console.log(err);
    });
app.use("",AttandanceRoute);
app.use("",EmployeeRoute);
app.use("", LoginRoute);

app.listen(port, () => {
    console.log(`Server is running on ${port}`);
});
