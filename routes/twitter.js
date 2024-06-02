const express = require('express');
const crypto = require('crypto');
const OAuth = require('oauth-1.0a');
const qs = require('querystring');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const router = express.Router();

const consumer_key = process.env.CONSUMER_KEY;
const consumer_secret = process.env.CONSUMER_SECRET;
const callback_url = process.env.CALLBACK_URL; // Ensure you have CALLBACK_URL in your .env

console.log('Consumer Key:', consumer_key);
console.log('Consumer Secret:', consumer_secret);

const oauth = OAuth({
  consumer: {
    consumer_key: consumer_key,
    consumer_secret: consumer_secret
  },
  signature_method: 'HMAC-SHA1',
  hash_function: (baseString, key) => crypto.createHmac('sha1', key).update(baseString).digest('base64')
});

const requestTokenURL = 'https://api.twitter.com/oauth/request_token';
const authorizeURL = 'https://api.twitter.com/oauth/authorize';
const accessTokenURL = 'https://api.twitter.com/oauth/access_token';

router.get('/request_token', async (req, res) => {
  const requestData = {
    url: requestTokenURL,
    method: 'POST',
    data: {
      oauth_callback: callback_url
    }
  };

  const authHeader = oauth.toHeader(oauth.authorize(requestData));

  try {
    const response = await axios.post(requestTokenURL, qs.stringify(requestData.data), {
      headers: {
        Authorization: authHeader.Authorization,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const responseData = qs.parse(response.data);
    console.log('Request Token Response:', responseData);

    res.json({ authUrl: `${authorizeURL}?oauth_token=${responseData.oauth_token}` });
  } catch (error) {
    console.error('Error fetching request token:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Cannot get an OAuth request token' });
  }
});

router.get('/callback', async (req, res) => {
  const { oauth_token, oauth_verifier } = req.query;

  const oAuthRequestToken = {
    key: oauth_token,
    secret: '' // You should store the oauth_token_secret in a secure place (e.g., session or database)
  };

  const requestData = {
    url: accessTokenURL,
    method: 'POST',
    data: {
      oauth_verifier
    }
  };

  const authHeader = oauth.toHeader(oauth.authorize(requestData, oAuthRequestToken));

  try {
    const response = await axios.post(accessTokenURL, qs.stringify(requestData.data), {
      headers: {
        Authorization: authHeader.Authorization,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const responseData = qs.parse(response.data);
    console.log('Access Token Response:', responseData);

    // Here you would save the access token and secret in a secure place, e.g., a session or database
    res.json({ access_token: responseData.oauth_token, access_token_secret: responseData.oauth_token_secret });
  } catch (error) {
    console.error('Error fetching access token:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Cannot get an OAuth access token' });
  }
});

module.exports = router;
