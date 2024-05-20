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

// Route to fetch contest by ID and return JSON data
router.get('/api/:contestId', getContestById);

// Route to render EJS template for social sharing
router.get('/:contestId', async (req, res) => {
    const { contestId } = req.params;
    try {
        const contest = await Contest.findById(contestId).lean();
        if (!contest) {
            return res.status(404).send('Contest not found');
        }
        res.render('contest', { contest });
    } catch (error) {
        console.error("Error fetching contest:", error);
        res.status(500).send("Error fetching contest");
    }
});

router.get('/', getContests);
router.post('/', createContest);
router.patch('/:contestId/end', endContest);
router.patch('/:contestId/owner', updateContestOwner);
router.post('/submissionsByWallet', getContestsByWallet);
router.post('/votedContests', getContestsByVote);

module.exports = router;
