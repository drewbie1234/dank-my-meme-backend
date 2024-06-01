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
  consumer: { key: consumer_key, secret: consumer_secret },
  signature_method: 'HMAC-SHA1',
  hash_function: (baseString, key) => crypto.createHmac('sha1', key).update(baseString).digest('base64'),
});

const requestTokenURL = 'https://api.twitter.com/oauth/request_token?oauth_callback=oob';
const authorizeURL = new URL('https://api.twitter.com/oauth/authorize');
const accessTokenURL = 'https://api.twitter.com/oauth/access_token';

router.get('/tweet/:id', async (req, res) => {
  const tweetId = req.params.id;
  const params = `tweet.fields=attachments&expansions=attachments.media_keys&media.fields=url`;
  const endpointURL = `https://api.twitter.com/2/tweets?ids=${tweetId}&${params}`;

  try {
    const got = (await import('got')).default; // Use dynamic import

    console.log('Requesting OAuth request token...');
    const authHeader = oauth.toHeader(oauth.authorize({ url: requestTokenURL, method: 'POST' }));
    const requestTokenResponse = await got.post(requestTokenURL, { headers: { Authorization: authHeader["Authorization"] } });
    const oAuthRequestToken = qs.parse(requestTokenResponse.body);

    authorizeURL.searchParams.append('oauth_token', oAuthRequestToken.oauth_token);
    console.log('Please go here and authorize:', authorizeURL.href);

    // Replace 'user-provided-pin' with the actual PIN provided by the user after authorization
    const pin = 'user-provided-pin'; // Placeholder for user-provided PIN

    console.log('Requesting OAuth access token...');
    const accessTokenAuthHeader = oauth.toHeader(oauth.authorize({ url: accessTokenURL, method: 'POST' }));
    const accessTokenResponse = await got.post(`${accessTokenURL}?oauth_verifier=${pin}&oauth_token=${oAuthRequestToken.oauth_token}`, { headers: { Authorization: accessTokenAuthHeader["Authorization"] } });
    const oAuthAccessToken = qs.parse(accessTokenResponse.body);

    console.log('Access token obtained:', oAuthAccessToken);

    console.log('Making request to Twitter API endpoint:', endpointURL);
    const token = { key: oAuthAccessToken.oauth_token, secret: oAuthAccessToken.oauth_token_secret };
    const finalAuthHeader = oauth.toHeader(oauth.authorize({ url: endpointURL, method: 'GET' }, token));
    const tweetResponse = await got(endpointURL, { headers: { Authorization: finalAuthHeader["Authorization"], 'user-agent': "v2TweetLookupJS" } });

    const tweetData = JSON.parse(tweetResponse.body);
    // console.log('Tweet data received:', tweetData);

    const media = tweetData.includes?.media || [];
    const imageUrl = media.length > 0 ? media[0].url : null;

    if (!imageUrl) {
      console.error('No image found in the tweet');
      return res.status(404).json({ error: 'No image found in the tweet' });
    }

    res.json({ imageUrl });
  } catch (error) {
    // console.error('Error fetching tweet:', error);
    res.status(500).json({ error: 'Error fetching tweet.' });
  }
});

module.exports = router;
