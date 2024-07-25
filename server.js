import express from 'express';
import path from 'path';
import { config } from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import request from 'request';

config();

const app = express();
app.set('view engine', 'ejs');

// Serve static files from the root directory
app.use(express.static(path.join(process.cwd())));

// Generate a data-client-metadata-id
const dataClientMetadataId = uuidv4();

// Generate an SDK token
const options = {
  method: 'POST',
  url: 'https://api.fastlane.com/v1/oauth2/token',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  form: {
    grant_type: 'client_credentials',
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET
  }
};

let sdkClientToken;

request(options, function (error, response, body) {
  if (error) throw new Error(error);

  const data = JSON.parse(body);
  sdkClientToken = data.access_token;
});

app.get('/', (req, res) => {
  // Pass the sdkClientToken and dataClientMetadataId to your client-side code
  res.render('index', { client_id: process.env.CLIENT_ID, sdkClientToken, dataClientMetadataId });
});

app.listen(3004, () => {
  console.log('Server listening on port 3004');
});