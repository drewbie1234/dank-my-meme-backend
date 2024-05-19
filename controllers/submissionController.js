const Submission = require('../models/Submission');
const Contest = require('../models/Contest');
const mongoose = require('mongoose');

const createSubmission = async (req, res) => {
    const { contest, userAddress, ipfsHash } = req.body;
    try {
        if (!ipfsHash) {
            return res.status(400).send("No IPFS hash provided");
        }
        const newSubmission = new Submission({ contest, wallet: userAddress, image: ipfsHash });
        await newSubmission.save();
        const updatedContest = await Contest.findByIdAndUpdate(contest, { $push: { submissions: newSubmission._id } }, { new: true });
        res.json(newSubmission);
    } catch (error) {
        console.error("Error submitting to contest:", error);
        res.status(500).send("Error submitting to contest");
    }
};

const getSubmissionsByIds = async (req, res) => {
    const { submissionIds } = req.query;
    if (!submissionIds) {
        return res.status(400).send("No submission IDs provided");
    }
    const ids = submissionIds.split(',').map(id => new mongoose.Types.ObjectId(id));
    try {
        const submissions = await Submission.find({ _id: { $in: ids } });
        if (submissions.length === 0) {
            return res.status(404).send("Submissions not found");
        }
        res.json(submissions);
    } catch (error) {
        console.error("Error fetching submissions:", error);
        res.status(500).send("Error fetching submissions");
    }
};

const getSubmissionById = async (req, res) => {
    const { submissionId } = req.params;
    try {
        if (!mongoose.Types.ObjectId.isValid(submissionId)) {
            return res.status(400).json({ message: 'Invalid submission ID' });
        }
        const submission = await Submission.findById(submissionId).populate('contest');
        if (!submission) {
            return res.status(404).json({ message: 'Submission not found' });
        }
        const contest = await Contest.findById(submission.contest._id).populate('submissions');
        if (!contest) {
            return res.status(404).json({ message: 'Contest not found' });
        }
        const response = { ...contest.toObject(), submissions: [submissionId] };
        res.json(response);
    } catch (error) {
        console.error('Failed to fetch submission and contest:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getContestBySubmissionId = async (req, res) => {
    const { submissionId } = req.params;
    try {
        const submission = await Submission.findById(submissionId).populate('contest');
        if (!submission) {
            return res.status(404).send('Submission not found');
        }
        const contest = await Contest.findById(submission.contest._id).populate('submissions');
        if (!contest) {
            return res.status(404).send('Contest not found');
        }
        const response = { ...contest.toObject(), submissions: [submissionId] };
        res.json(response);
    } catch (error) {
        console.error('Failed to fetch contest by submission:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createSubmission,
    getSubmissionsByIds,
    getSubmissionById,
    getContestBySubmissionId
};
