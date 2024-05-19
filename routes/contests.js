const express = require('express');
const router = express.Router();
const {
    createContest,
    getAllContests,
    getContestBySubmission,
    getContestsByWallet,
    getContestsByVote
} = require('../controllers/contestController');

// Route to create a new contest
router.post('/', createContest);

// Route to get all contests
router.get('/', getAllContests);

// Route to get contest by submission ID
router.get('/submission/:submissionId', getContestBySubmission);

// Route to get all contests with submissions filtered by wallet address
router.get('/submissionsByWallet/:walletAddress', getContestsByWallet);

// Route to get contests by vote
router.post('/votedContests', getContestsByVote); // Changed to POST

module.exports = router;
