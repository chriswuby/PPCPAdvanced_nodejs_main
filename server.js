import express from 'express';
import path from 'path';
import paypal from '@paypal/checkout-server-sdk';
import { config } from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';

config();

const app = express();
const env = new paypal.core.LiveEnvironment(
  process.env.PAYPAL_CLIENT_ID,
  process.env.PAYPAL_CLIENT_SECRET
);
const client = new paypal.core.PayPalHttpClient(env);

// Get the current directory path
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Middleware to parse request body
app.use(express.json());

// Set the views directory and view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Serve static files from the root directory
app.use(express.static(path.join(process.cwd(), 'public')));

// Routes
app.get('/', (req, res) => {
  res.render('index');
});

// Generate a data-client-metadata-id
const dataClientMetadataId = uuidv4();

// Declare sdkClientToken in the outer scope
let sdkClientToken;

// Generate an SDK token
const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET
  })
};

fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', options)
  .then(response => response.json())
  .then(data => {
    sdkClientToken = data.access_token;
  })
  .catch(error => {
    console.error('Error:', error);
  });

app.get('/', (req, res) => {
  // Pass the sdkClientToken and dataClientMetadataId to your client-side code
  res.render('index', { client_id: process.env.CLIENT_ID, sdkClientToken, dataClientMetadataId });
});

// Create order endpoint
app.post('/create-order', async (req, res) => {
  const request = new paypal.orders.OrdersCreateRequest();
  const total = req.body.total; // Get the total amount from the request body
  const currency = 'USD'; // Set the currency code

  const value = total;
  request.prefer('return=representation');
  request.requestBody({
    intent: 'CAPTURE',
    purchase_units: [
      {
        amount: {
          currency_code: currency,
          value: value,
        },
      },
    ],
  });

  try {
    const order = await client.execute(request);
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Capture order endpoint
app.post('/capture-order', async (req, res) => {
  const orderId = req.body.orderId; // Get the order ID from the request body

  const request = new paypal.orders.OrdersCaptureRequest(orderId);
  request.prefer('return=representation');

  try {
    const capturedOrder = await client.execute(request);
    res.json(capturedOrder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3004;
app.listen(3004, () => {
  console.log('Server listening on port 3004');
});
