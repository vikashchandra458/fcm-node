const express = require("express");
const bodyparser = require("body-parser");
const app = express();
app.use(bodyparser.json());
const admin = require("./firebase-config");
const path = require("path");


app.use(
    bodyparser.urlencoded({
        extended: true,
    })
);

http = require('http');
const cors = require('cors');

app.use(cors()); // Add cors middleware


app.get("/", async function (req, res) {
    res.sendFile(path.join(__dirname + "/form.html"));

})

app.post("/", async function (req, res) {

    var payload = {
        notification: {
            title: req?.body?.title || "Account Deposit",
            body: req?.body?.body || "A deposit to your savings account has just cleared."
        }
    };
    admin.messaging().sendToDevice(req?.body?.token, payload)
        .then(function (response) {
            console.log("Successfully sent message:", response.results[0].messageId);
            if (response.results[0].messageId) {
                res.sendFile(path.join(__dirname + "/thankyou.html"));
            } else (
                res.sendFile(path.join(__dirname + "/failed.html"))

            )
        })
        .catch(function (error) {
            console.log("Error sending message:", error);
            res.sendFile(path.join(__dirname + "/failed.html"))
        });

});

app.listen(4000, () => 'Server is running on port 4000');
