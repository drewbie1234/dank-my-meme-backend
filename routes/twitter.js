const express = require('express');
const router = express.Router();
const { TwitterApi } = require('twitter-api-v2');
const axios = require('axios');
const crypto = require('crypto');

// Helper function to generate the code challenge and verifier
function generateCodeChallengeAndVerifier() {
  const verifier = crypto.randomBytes(32).toString('hex');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

const twitterClient = new TwitterApi({
  clientId: process.env.TWITTER_CLIENT_ID,
  clientSecret: process.env.TWITTER_CLIENT_SECRET,
});

const callbackURL = "https://dankmymeme.xyz/api/twitter/callback"; // Replace with your actual callback URL

// Step 1: Construct an authorization URL
router.get('/login', (req, res) => {
  const { verifier, challenge } = generateCodeChallengeAndVerifier();
  req.session.codeVerifier = verifier;

  const scope = ['tweet.read', 'tweet.write', 'users.read', 'offline.access'];
  const state = crypto.randomBytes(8).toString('hex'); // Use a random string as state parameter

  const authUrl = twitterClient.generateAuthLink({
    callbackURL,
    scope,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  req.session.state = state;

  res.json({ authUrl });
});

// Step 2: Handle the callback from Twitter
router.get('/callback', async (req, res) => {
  const { state, code } = req.query;

  if (state !== req.session.state) {
    return res.status(400).json({ error: 'Invalid state' });
  }

  const codeVerifier = req.session.codeVerifier;

  try {
    const { client: loggedClient, accessToken, refreshToken, expiresIn } = await twitterClient.loginWithAuthCode({
      code,
      codeVerifier,
      redirectUri: callbackURL,
    });

    req.session.accessToken = accessToken;
    req.session.refreshToken = refreshToken;

    res.redirect('/'); // Redirect to your front-end page
  } catch (error) {
    console.error('Error during /callback:', error);
    res.status(500).json({ error: 'Error getting OAuth access token' });
  }
});

// Posting a tweet
router.post('/tweet', async (req, res) => {
  const { text, imageUrl } = req.body;
  const { accessToken } = req.session;

  if (!accessToken) {
    return res.status(403).json({ error: 'User not authenticated with Twitter' });
  }

  try {
    const userClient = new TwitterApi(accessToken);
    let tweetData = { text };

    if (imageUrl) {
      const mediaId = await userClient.v1.uploadMedia(imageUrl);
      tweetData.media_ids = [mediaId];
    }

    const tweet = await userClient.v2.tweet(tweetData);
    res.json({ tweetUrl: `https://twitter.com/i/web/status/${tweet.data.id}` });
  } catch (error) {
    console.error('Error posting tweet:', error);
    res.status(500).json({ error: 'Error posting tweet' });
  }
});

module.exports = router;
