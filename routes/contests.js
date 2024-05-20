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

// Route to fetch contest by ID and render EJS template
router.get('/:contestId', async (req, res) => {
    const { contestId } = req.params;
    try {
        const contest = await getContestById(contestId);
        if (!contest) {
            return res.status(404).send('Contest not found');
        }
        res.render('contest', { contest });
    } catch (error) {
        console.error("Error fetching contest:", error);
        res.status(500).send("Error fetching contest");
    }
});
router.post('/', createContest);
router.patch('/:contestId/end', endContest);
router.patch('/:contestId/owner', updateContestOwner);
router.post('/submissionsByWallet', getContestsByWallet);
router.post('/votedContests', getContestsByVote); 

module.exports = router;
