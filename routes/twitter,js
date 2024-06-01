const express = require('express');
const router = express.Router();
const { TwitterApi } = require('twitter-api-v2');
const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_APP_KEY,
  appSecret: process.env.TWITTER_APP_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

const callbackURL = "https://dankmymeme.xyz/api/twitter/callback"; // Replace with your actual callback URL

// Step 1: Request token
router.get('/reverse', async (req, res) => {
  try {
    const { oauth_token, oauth_token_secret } = await twitterClient.generateAuthLink(callbackURL);
    req.session.oauthToken = oauth_token;
    req.session.oauthTokenSecret = oauth_token_secret;
    res.json({ oauth_token });
  } catch (error) {
    console.error('Error during /reverse:', error);
    res.status(500).json({ error: 'Error getting OAuth request token' });
  }
});

// Step 2: Callback with verifier
router.get('/callback', async (req, res) => {
  const { oauth_token, oauth_verifier } = req.query;
  const { oauthToken, oauthTokenSecret } = req.session;

  if (!oauth_token || !oauth_verifier || oauth_token !== oauthToken) {
    return res.status(400).json({ error: 'Invalid OAuth token or verifier' });
  }

  try {
    const { client: userClient, accessToken, accessSecret } = await twitterClient.login(oauthToken, oauthTokenSecret, oauth_verifier);
    req.session.accessToken = accessToken;
    req.session.accessSecret = accessSecret;
    res.redirect('/'); // Redirect to your front-end page
  } catch (error) {
    console.error('Error during /callback:', error);
    res.status(500).json({ error: 'Error getting OAuth access token' });
  }
});

// Posting a tweet
router.post('/tweet', async (req, res) => {
  const { text, imageUrl } = req.body;
  const { accessToken, accessSecret } = req.session;

  if (!accessToken || !accessSecret) {
    return res.status(403).json({ error: 'User not authenticated with Twitter' });
  }

  try {
    const userClient = new TwitterApi({ accessToken, accessSecret });
    let tweetData = { status: text };

    if (imageUrl) {
      const mediaId = await userClient.v1.uploadMedia(imageUrl);
      tweetData.media_ids = [mediaId];
    }

    const tweet = await userClient.v1.tweet(tweetData);
    res.json({ tweetUrl: `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}` });
  } catch (error) {
    console.error('Error posting tweet:', error);
    res.status(500).json({ error: 'Error posting tweet' });
  }
});

module.exports = router;
