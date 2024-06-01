const express = require('express');
const { TwitterApi } = require('twitter-api-v2');
const dotenv = require('dotenv');

dotenv.config();

const router = express.Router();

const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

router.get('/tweet/:id', async (req, res) => {
  const tweetId = req.params.id;

  try {
    const tweet = await twitterClient.v2.singleTweet(tweetId, {
      expansions: ['attachments.media_keys'],
      'media.fields': ['url']
    });

    const media = tweet.includes?.media || [];
    const imageUrl = media.length > 0 ? media[0].url : null;

    if (!imageUrl) {
      return res.status(404).json({ error: 'No image found in the tweet' });
    }

    res.json({ imageUrl });
  } catch (error) {
    console.error('Error fetching tweet:', error);
    res.status(500).json({ error: 'Error fetching tweet.' });
  }
});

module.exports = router;
