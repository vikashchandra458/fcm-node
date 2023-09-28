const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const http = require('http');
const path = require("path");
const cors = require('cors');
const admin = require("../firebase-config");
const { Server } = require('socket.io');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));


// Create an HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Socket.IO server is running');
});

// Create a Socket.IO server by passing the HTTP server
const io = new Server(server);

// Create an array to store location updates
const locationUpdates = [];

// Event handler when a client connects
io.on('connection', (socket) => {
  console.log('A client connected');

  // Send existing location updates to the newly connected client
  socket.emit('locationUpdates', locationUpdates);

  // Handle custom events from the client
  socket.on('locationUpdate', (data) => {
    console.log('Received location update:');
    console.log('Latitude:', data.latitude);
    console.log('Longitude:', data.longitude);

    // Save the location update
    locationUpdates.push(data);

    // Broadcast the location update to all connected clients
    io.emit('locationUpdate', data);
  });

  // Event handler when a client disconnects
  socket.on('disconnect', () => {
    console.log('A client disconnected');
  });
});

app.get("/", async function (req, res) {
  try {
      res.sendFile(path.join(__dirname, "socket.html")); // Updated filename
  } catch (error) {
      console.error("Error serving socket.html:", error);
      res.status(500).send("Internal Server Error");
  }
});


app.post("/", async function (req, res) {
  var payload = {
    notification: {
      title: req?.body?.title || "Account Deposit",
      body: req?.body?.body || "A deposit to your savings account has just cleared."
    }
  };
  admin.messaging().sendToDevice(req?.body?.token, payload)
    .then(function (response) {
      console.log("Successfully sent message:");
      response.results.forEach((result, index) => {
        console.log(`Result ${index}:`, result.messageId);
      });

      if (response.results[0].messageId) {
        res.sendFile(path.join(__dirname, "thankyou.html"));
      } else {
        res.sendFile(path.join(__dirname, "failed.html"));
      }
    })
    .catch(function (error) {
      console.log("Error sending message:", error);
      res.sendFile(path.join(__dirname, "failed.html"));
    });
});

server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
