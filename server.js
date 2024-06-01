const express = require("express");
const fs = require("fs");
const https = require("https");
const cors = require("cors");
const path = require("path");
const fileUpload = require("express-fileupload");
const mongoose = require("mongoose");
require("dotenv").config();
const ethers = require("ethers");
const helmet = require("helmet");
const winston = require("winston");
const session = require('express-session');

// Load SSL certificate files
const privateKey = fs.readFileSync('/etc/letsencrypt/live/app.dankmymeme.xyz/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/app.dankmymeme.xyz/fullchain.pem', 'utf8');
const ca = fs.readFileSync('/etc/letsencrypt/live/app.dankmymeme.xyz/chain.pem', 'utf8');

const credentials = {
  key: privateKey,
  cert: certificate,
  ca: ca
};

// Import route modules
const contestsRouter = require('./routes/contests');
const submissionsRouter = require('./routes/submissions');
const votesRouter = require('./routes/votes');
const twitterRouter = require('./routes/twitter');
const { getBalance, getEnsName } = require("./utils/ethereum");
const { pinFileToIPFS } = require("./utils/pinata");

// Initialize the Express application
const app = express();
const port = process.env.PORT || 443;

// Middleware
app.use(cors());
app.use(express.json());
app.use(fileUpload());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true }
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Set up Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

// MongoDB URI
const uri = process.env.MONGODB_URI;

// Async function to connect to MongoDB
async function connectToMongoDB() {
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Successfully connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
}

// Execute the connection function
connectToMongoDB();

// Ethereum provider setup
const url = process.env.ETH_PROVIDER_URL || 'https://turbo.magma-rpc.com';
const provider = new ethers.JsonRpcProvider(url);
console.log("Using Ethereum provider at:", url);

// Middleware to log requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log("Request headers:", req.headers);
  console.log("Request body:", JSON.stringify(req.body, null, 2));  // Log the request body
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ message: 'Server error' });
});

// Serve static files from the '.well-known' directory
app.use('/.well-known', express.static(path.join(__dirname, '.well-known'), { dotfiles: 'allow' }));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Custom Helmet settings for social media meta tags
app.use((req, res, next) => {
  res.locals.helmet = helmet({
    meta: {
      'og:image': `https://app.dankmymeme.xyz/public/images/dank_my_meme.PNG`,
      'twitter:image': `https://app.dankmymeme.xyz/public/images/dank_my_meme.PNG`,
      'og:image:type': 'image/PNG',
      'og:image:width': '1200',
      'og:image:height': '630',
      'og:url': `https://app.dankmymeme.xyz${req.originalUrl}`,
      'og:title': 'Dank My Meme - Explore the best memes!',
      'og:description': 'Join and explore the most entertaining memes on the internet. Participate in contests and win prizes!',
      'og:type': 'website'
    }
  });
  next();
});

// Use the routes
app.use('/api/contests', contestsRouter);
app.use('/api/submissions', submissionsRouter);
app.use('/api/votes', votesRouter);
app.use('/api/twitter', twitterRouter);


// Route to pin a file to IPFS
app.post("/api/pinFile", async (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send("No file uploaded");
  }
  const uploadedFile = req.files.file;
  try {
    const result = await pinFileToIPFS(uploadedFile);
    res.json(result);
  } catch (error) {
    console.error("Error in pinning file:", error);
    res.status(500).send("Error pinning file to IPFS");
  }
});

// Route to get Ethereum balance
app.get("/api/getBalance", async (req, res) => {
  const { account } = req.query;
  try {
    const balance = await getBalance(account);
    res.json({ balance });
  } catch (error) {
    console.error("Error fetching balance:", error);
    res.status(500).send("Error fetching balance");
  }
});

// Route to get Lava balance
app.get("/api/getLavaBalance", async (req, res) => {
  const { account } = req.query;
  try {
    const balance = await getBalance(account);
    res.json({ balance });
  } catch (error) {
    console.error("Error fetching balance:", error);
    res.status(500).send("Error fetching balance");
  }
});

// Route to get ENS name
app.get("/api/getEns", async (req, res) => {
  const { account } = req.query;
  if (!account) {
    return res.status(400).send("Account parameter is required");
  }
  try {
    const ensName = await getEnsName(account);
    const displayName = ensName || `${account.substring(0, 6)}...${account.substring(account.length - 4)}`;
    res.json({ ensName: displayName });
  } catch (error) {
    console.error("Error fetching ENS name:", error);
    res.status(500).send("Error fetching ENS name");
  }
});

// Create the HTTPS server and pass in your app (Express instance)
const httpsServer = https.createServer(credentials, app);

// Listen on HTTPS
httpsServer.listen(port, () => {
  console.log(`HTTPS Server running on https://app.dankmymeme.xyz:${port}`);
});
