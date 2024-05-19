const express = require('express');
const router = express.Router();
const {
    getContests,
    getContestById,
    createContest,
    endContest,
    updateContestOwner,
    getContestsByWallet,
    getContestsByVote
} = require('../controllers/contestController');

// Define the routes
router.get('/', getContests);
router.get('/:contestId', getContestById);
router.post('/', createContest);
router.patch('/:contestId/end', endContest);
router.patch('/:contestId/owner', updateContestOwner);
router.get('/submissionsByWallet/walletAddress', getContestsByWallet);
router.get('/votedContests/walletAddress', getContestsByVote);

module.exports = router;
