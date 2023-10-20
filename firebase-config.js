const admin = require("firebase-admin");
// path to service account
const serviceAccount = require("./ServiceAccount.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'v-chat-8ac16.appspot.com',
});

module.exports = admin;
