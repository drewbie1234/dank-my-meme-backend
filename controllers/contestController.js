const Contest = require('../models/Contest');
const Vote = require('../models/Vote');
const mongoose = require('mongoose');

const getContests = async (req, res) => {
    try {
        const contests = await Contest.find({});
        res.json(contests);
    } catch (error) {
        console.error("Error fetching contests:", error);
        res.status(500).send("Error fetching contests");
    }
};

const getContestById = async (req, res) => {
    const { contestId } = req.params;
    try {
        const contest = await Contest.findById(contestId).populate('submissions');
        if (!contest) {
            return res.status(404).send('Contest not found');
        }
        res.json(contest);
    } catch (error) {
        console.error("Error fetching contest:", error);
        res.status(500).send("Error fetching contest");
    }
};

const createContest = async (req, res) => {
    try {
        const { name, startDateTime, endDateTime, entryFee, votingFee, winnerPercentage, numberOfLuckyVoters, contractAddress, tokenAddress, contestOwner, contestEnded, distributionTX } = req.body;
        if (!name || !startDateTime || !endDateTime || !entryFee || !votingFee || !winnerPercentage || !numberOfLuckyVoters || !contractAddress || !tokenAddress || !contestOwner) {
            return res.status(400).send("Missing required fields");
        }
        const newContest = new Contest({
            name, startDateTime: new Date(startDateTime), endDateTime: new Date(endDateTime),
            entryFee, votingFee, winnerPercentage, numberOfLuckyVoters, contractAddress, tokenAddress, contestOwner, contestEnded, distributionTX
        });
        await newContest.save();
        res.json(newContest);
    } catch (error) {
        console.error("Error creating contest:", error);
        res.status(500).send("Error creating contest");
    }
};

const endContest = async (req, res) => {
    const { contestId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(contestId)) {
        return res.status(400).send('Invalid contest ID');
    }
    try {
        const updatedContest = await Contest.findByIdAndUpdate(contestId, { $set: { contestEnded: true } }, { new: true });
        if (!updatedContest) {
            return res.status(404).send("Contest not found");
        }
        res.json({ message: "Contest ended successfully", contest: updatedContest });
    } catch (error) {
        console.error("Error ending contest:", error);
        res.status(500).send("Error ending contest");
    }
};

const updateContestOwner = async (req, res) => {
    const { contestId } = req.params;
    const { newOwner } = req.body;
    if (!mongoose.Types.ObjectId.isValid(contestId)) {
        return res.status(400).send('Invalid contest ID');
    }
    if (!newOwner) {
        return res.status(400).send('New owner address is required');
    }
    try {
        const updatedContest = await Contest.findByIdAndUpdate(contestId, { $set: { contestOwner: newOwner }}, { new: true });
        if (!updatedContest) {
            return res.status(404).send('Contest not found');
        }
        res.json({ message: 'Contest owner updated successfully', contest: updatedContest });
    } catch (error) {
        console.error('Failed to update contest owner:', error);
        res.status(500).send('Error updating contest owner');
    }
};

const getContestsByWallet = async (req, res) => {
    const { walletAddress } = req.params;
    try {
        const contests = await Contest.find({}).populate('submissions');
        const filteredContests = contests.map(contest => {
            const filteredSubmissions = contest.submissions.filter(submission => submission.wallet === walletAddress).map(submission => submission._id);
            return { ...contest.toObject(), submissions: filteredSubmissions };
        }).filter(contest => contest.submissions.length > 0);
        res.json(filteredContests);
    } catch (error) {
        console.error("Error fetching contests with filtered submissions:", error);
        res.status(500).send("Error fetching contests with filtered submissions");
    }
};

const getContestsByVote = async (req, res) => {
    const { walletAddress } = req.body; // Correctly getting walletAddress from req.body
    try {
        // Find all votes by the given wallet address
        const votes = await Vote.find({ voter: walletAddress }).populate('contest submission');

        // Extract unique contest IDs from the votes
        const contestIds = [...new Set(votes.map(vote => vote.contest._id))];

        // Find contests by the extracted contest IDs and populate the submissions
        const contests = await Contest.find({ _id: { $in: contestIds } }).populate('submissions');

        // Filter the submissions to include only the ones voted on by the user
        const contestsWithFilteredSubmissions = contests.map(contest => {
            const filteredSubmissions = contest.submissions
                .filter(submission => votes.some(vote => vote.submission._id.equals(submission._id)))
                .map(submission => submission._id); // Map to only submission IDs

            return { ...contest.toObject(), submissions: filteredSubmissions };
        });

        // Return the contests with filtered submission IDs
        res.json(contestsWithFilteredSubmissions);
    } catch (error) {
        console.error("Error fetching contests by vote:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    getContests,
    getContestById,
    createContest,
    endContest,
    updateContestOwner,
    getContestsByWallet,
    getContestsByVote
};
