const express = require('express');
const router = express.Router();
const { recordVote } = require('../controllers/voteController');

// Define the routes
router.post('/', recordVote);

module.exports = router;
