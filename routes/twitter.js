const express = require('express');
const crypto = require('crypto');
const OAuth = require('oauth-1.0a');
const qs = require('querystring');
const dotenv = require('dotenv');

dotenv.config();

const router = express.Router();

const consumer_key = process.env.CONSUMER_KEY;
const consumer_secret = process.env.CONSUMER_SECRET;

const oauth = OAuth({
  consumer: {
    key: consumer_key,
    secret: consumer_secret
  },
  signature_method: 'HMAC-SHA1',
  hash_function: (baseString, key) => crypto.createHmac('sha1', key).update(baseString).digest('base64')
});

const requestTokenURL = 'https://api.twitter.com/oauth/request_token?oauth_callback=oob';
const authorizeURL = new URL('https://api.twitter.com/oauth/authorize');
const accessTokenURL = 'https://api.twitter.com/oauth/access_token';

router.get('/tweet/:id', async (req, res) => {
  const tweetId = req.params.id;
  const params = `tweet.fields=attachments&expansions=attachments.media_keys&media.fields=url`;
  const endpointURL = `https://api.twitter.com/2/tweets?ids=${tweetId}&${params}`;

  async function requestToken() {
    const got = (await import('got')).default;
    const authHeader = oauth.toHeader(oauth.authorize({
      url: requestTokenURL,
      method: 'POST'
    }));

    const req = await got.post(requestTokenURL, {
      headers: {
        Authorization: authHeader["Authorization"]
      }
    });

    if (req.body) {
      return qs.parse(req.body);
    } else {
      throw new Error('Cannot get an OAuth request token');
    }
  }

  async function accessToken({ oauth_token, oauth_token_secret }, verifier) {
    const got = (await import('got')).default;
    const authHeader = oauth.toHeader(oauth.authorize({
      url: accessTokenURL,
      method: 'POST'
    }));

    const path = `https://api.twitter.com/oauth/access_token?oauth_verifier=${verifier}&oauth_token=${oauth_token}`;

    const req = await got.post(path, {
      headers: {
        Authorization: authHeader["Authorization"]
      }
    });

    if (req.body) {
      return qs.parse(req.body);
    } else {
      throw new Error('Cannot get an OAuth request token');
    }
  }

  async function getRequest({ oauth_token, oauth_token_secret }) {
    const got = (await import('got')).default;
    const token = {
      key: oauth_token,
      secret: oauth_token_secret
    };

    const authHeader = oauth.toHeader(oauth.authorize({
      url: endpointURL,
      method: 'GET'
    }, token));

    const req = await got(endpointURL, {
      headers: {
        Authorization: authHeader["Authorization"],
        'user-agent': "v2TweetLookupJS"
      }
    });

    if (req.body) {
      return JSON.parse(req.body);
    } else {
      throw new Error('Unsuccessful request');
    }
  }

  try {
    console.log('Requesting OAuth request token...');
    const oAuthRequestToken = await requestToken();
    console.log(oAuthRequestToken);

    authorizeURL.searchParams.append('oauth_token', oAuthRequestToken.oauth_token);
    // console.log('Please go here and authorize:', authorizeURL.href);

    // Simulating user providing the PIN after authorization (replace with actual implementation)
    const pin = 'user-provided-pin'; // Replace with actual PIN received after user authorization

    console.log('Requesting OAuth access token...');
    const oAuthAccessToken = await accessToken(oAuthRequestToken, pin.trim());

    // console.log('Access token obtained:', oAuthAccessToken);

    // console.log('Making request to Twitter API endpoint:', endpointURL);
    const response = await getRequest(oAuthAccessToken);
    // console.log('Tweet data received:', response);

    const media = response.includes?.media || [];
    const imageUrl = media.length > 0 ? media[0].url : null;

    if (!imageUrl) {
      console.error('No image found in the tweet');
      return res.status(404).json({ error: 'No image found in the tweet' });
    }

    res.json({ imageUrl });
  } catch (error) {
    // console.error('Error fetching tweet:', error);
    if (error.response) {
      // console.error('Error response data:', error.response.body);
    }
    res.status(500).json({ error: 'Error fetching tweet.' });
  }
});

module.exports = router;
