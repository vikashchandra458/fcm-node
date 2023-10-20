const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const admin = require('./firebase-config'); // Replace with your Firebase config
const path = require('path');
const axios = require('axios');
const cors = require('cors');
const formidable = require('formidable');
const http = require('http');
const { Server } = require('socket.io');
const port = 4000; // Set your desired port here

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

// Serve static files
app.use(express.static(__dirname));
// Create an HTTP server
const server = http.createServer(app);

// Create a Socket.IO server by passing the HTTP server
const io = new Server(server);

// Create an array to store location updates
const locationUpdates = [];

// Event handler when a client connects
io.on('connection', (socket) => {
  console.log(JSON.stringify(`A client connected from client at IP   ${socket.handshake.address.includes('ffff') ? socket.handshake.address.replace('ffff:', '  ') : socket.handshake.address}`));

  // Emit a 'deviceConnected' event to inform all connected clients
  io.emit('deviceConnected', { message: `A client connected from client at IP   ${socket.handshake.address.includes('ffff') ? socket.handshake.address.replace('ffff:', '  ') : socket.handshake.address}` });
  console.log(JSON.stringify("Socket : ",socket.handshake))
  // Send existing location updates to the newly connected client
  socket.emit('locationUpdates', locationUpdates);

  // Handle custom events from the client
  socket.on('locationUpdate', (data) => {
    if (data?.latitude && data?.longitude) {
      console.log('Latitude:', data.latitude, socket.handshake.address);
      console.log('Longitude:', data.longitude);

      // Save the location update including the client's IP
      const update = {
        ...data,
        clientIP: socket.handshake.address,
      };

      locationUpdates.push(update);

      // Broadcast the location update to all connected clients
      io.emit('locationUpdate', update);
    }
  });

  // Function to clear location updates
  function clearLocationUpdates() {
    locationUpdates.length = 0; // Clear the array
    // io.emit('clear', { message: 'Clear' });
    // setTimeout(setMessage, 2000);
  }

  function setMessage() {
    // io.emit('deviceDisconnected', { message: 'Location updates cleared.' });
  }
  socket.on('error', (msg) => {
    console.log(JSON.stringify('Unable to get location'));

    // Emit a 'deviceDisconnected' event to inform all connected clients
    io.emit('deviceDisconnected', { message: 'Unable to get location' });
    // io.emit('deviceDisconnected', { message: `Location status will be cleared in 60 seconds` });

    // setTimeout(clearLocationUpdates, 60000);
  });

  // Event handler when a client disconnects
  socket.on('disconnect', () => {
    console.log(JSON.stringify(`A client disconnected from client at IP   ${socket.handshake.address.includes('ffff') ? socket.handshake.address.replace('ffff:', '  ') : socket.handshake.address}`));

    // Emit a 'deviceDisconnected' event to inform all connected clients
    io.emit('deviceDisconnected', { message: `A client disconnected from client at IP   ${socket.handshake.address.includes('ffff') ? socket.handshake.address.replace('ffff:', '  ') : socket.handshake.address}` });
    // io.emit('deviceDisconnected', { message: `Location status will be cleared in 60 seconds` });

    // setTimeout(clearLocationUpdates, 60000);
  });
});

// Serve HTML form
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'form.html'));
});

// Handle notification and sendToDevice
app.post('/', (req, res) => {
    const payload = {
        notification: {
            title: req.body.title || 'Account Deposit',
            body: req.body.body || 'A deposit to your savings account has just cleared.',
        },
    };

    admin.messaging()
        .sendToDevice(req.body.token, payload)
        .then((response) => {
            console.log('Successfully sent message:', response.results[0].messageId);

            if (response.results[0].messageId) {
                res.sendFile(path.join(__dirname, 'thankyou.html'));
            } else {
                res.sendFile(path.join(__dirname, 'failed.html'));
            }
        })
        .catch((error) => {
            console.error('Error sending message:', error);
            res.sendFile(path.join(__dirname, 'failed.html'));
        });
});

app.get('/finpay', (req, res) => {
    res.sendFile(path.join(__dirname, 'finpay.html'));
});

// Example API request
app.get('/balance', (req, res) => {
    // res.sendFile(path.join(__dirname + "/form.html"));
    const axios = require('axios');
    let data = '';

    let config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: 'https://devo.finnet.co.id/pg/payment/card/disbursement/inquiry/07615/654321770',
        headers: {
            'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/109.0',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Referer': 'http://localhost:3000/',
            'Content-Type': 'application/json',
            'Authorization': 'Basic VEVWQzAyMDpLOE1HdUFJVEh4ZURMZDhIZ21scWNuT2h0VFdQa0RsVA==',
            'Origin': 'http://localhost:3000',
            'Connection': 'keep-alive',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'cross-site'
        },
        data: data
    };

    axios.request(config)
        .then((response) => {
            console.log(JSON.stringify(response.data));
            res.send(JSON.stringify(response.data))
        })
        .catch((error) => {
            console.log(error);
            res.send(JSON.stringify(error));
        });


})

// Serve HTML form for image upload
app.get('/upload-image', (req, res) => {
    res.sendFile(path.join(__dirname, 'uploadImages.html'));
});

// Handle multiple image uploads
app.post('/upload-image', (req, res) => {
    const form = new formidable.IncomingForm();
    const bucket = admin.storage().bucket();

    form.parse(req, (err, fields, files) => {
        if (err) {
            return res.status(500).json({ error: 'Error parsing form data' });
        }

        const uploadedFiles = files.upload;

        if (!uploadedFiles || uploadedFiles.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        // An array to store the download URLs for the uploaded images
        const imageUrls = [];

        // Function to upload a single image
        const uploadImage = (file, callback) => {
            const timestamp = new Date().getTime();
            const uniqueFileName = `${timestamp}_${file.originalFilename}`;
            const imageFile = bucket.file(uniqueFileName);

            // Upload the image
            const blobStream = imageFile.createWriteStream();

            blobStream.on('error', (uploadError) => {
                console.error('Error uploading image:', uploadError);
                callback(uploadError);
            });

            blobStream.on('finish', () => {
                console.log('Image uploaded successfully.');

                // Generate a download URL
                imageFile.getSignedUrl({ action: 'read', expires: '03-17-2024' })
                    .then((url) => {
                        console.log('Download URL:', url);
                        imageUrls.push(url);
                        callback(null);
                    })
                    .catch((urlError) => {
                        console.error('Error generating download URL:', urlError);
                        callback(urlError);
                    });
            });

            // Pipe the file to the blob stream
            const fileStream = require('fs').createReadStream(file.filepath);
            fileStream.pipe(blobStream);
        };

        // Loop through and upload each image in parallel
        const uploadPromises = uploadedFiles.map((file) => {
            return new Promise((resolve, reject) => {
                uploadImage(file, (error) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            });
        });

        // Wait for all uploads to complete
        Promise.all(uploadPromises)
            .then(() => {
                // All images uploaded successfully
                res.status(200).json({ imageUrls });
            })
            .catch((uploadError) => {
                res.status(500).json({ error: 'Error uploading images' });
            });
    });
});
app.get("/socket", async function (req, res) {
    try {
      res.sendFile(path.join(__dirname, "socket.html"));
    } catch (error) {
      console.error("Error serving socket.html:", error);
      res.status(500).send("Internal Server Error");
    }
  });


// app.listen(port, () => {
//     console.log(`Server is running on port ${port}`);
// });

server.listen(port, () => {
    console.log('Server is running on http://localhost:3000');
  });
