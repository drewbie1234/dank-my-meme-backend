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

router.get('/', getContests);
router.get('/:contestId', getContestById); // This route handles fetching contest by ID
router.get('/:contestId', getContestById); // This route handles fetching contest by ID

router.post('/', createContest);
router.patch('/:contestId/end', endContest);
router.patch('/:contestId/owner', updateContestOwner);
router.post('/submissionsByWallet', getContestsByWallet);
router.post('/votedContests', getContestsByVote); 

module.exports = router;
