const Vote = require('../models/Vote');
const Contest = require('../models/Contest');
const Submission = require('../models/Submission');

const recordVote = async (req, res) => {
    const { contestId, voter, submissionIndex, txHash } = req.body;
    if (!contestId || !voter || submissionIndex === undefined || !txHash) {
        return res.status(400).json({ message: "Invalid input data. Missing required fields." });
    }
    try {
        const contest = await Contest.findById(contestId).populate('submissions');
        if (!contest) {
            return res.status(404).json({ message: "Contest not found" });
        }
        if (contest.voters.includes(voter)) {
            return res.status(400).json({ message: "Voter has already voted." });
        }
        const submission = contest.submissions[submissionIndex];
        if (!submission) {
            return res.status(404).json({ message: "Submission not found" });
        }
        const vote = new Vote({ contest: contest._id, submission: submission._id, voter, txHash });
        await vote.save();
        submission.votes += 1;
        await submission.save();
        contest.voters.push(voter);
        if (!contest.winningSubmission || submission.votes > contest.highestVotes) {
            contest.winningSubmission = submission._id;
            contest.highestVotes = submission.votes;
        }
        await contest.save();
        res.status(201).json({ message: "Vote recorded successfully", vote });
    } catch (error) {
        console.error("Error recording vote:", error);
        res.status(500).json({ message: "Error recording vote" });
    }
};

module.exports = {
    recordVote
};
