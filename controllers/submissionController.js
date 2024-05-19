const Submission = require('../models/Submission');
const Contest = require('../models/Contest');
const mongoose = require('mongoose');

/**
 * Create a new submission.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
const createSubmission = async (req, res) => {
    const { contest, userAddress, ipfsHash } = req.body;
    try {
        // Log the request body
        console.log("Creating submission with data:", JSON.stringify(req.body, null, 2));

        if (!ipfsHash) {
            console.error("No IPFS hash provided.");
            return res.status(400).send("No IPFS hash provided");
        }

        const newSubmission = new Submission({ contest, wallet: userAddress, image: ipfsHash });
        await newSubmission.save();

        // Update the contest with the new submission
        const updatedContest = await Contest.findByIdAndUpdate(
            contest, 
            { $push: { submissions: newSubmission._id } }, 
            { new: true }
        );

        console.log("New submission created:", newSubmission);
        res.json(newSubmission);
    } catch (error) {
        console.error("Error submitting to contest:", error);
        res.status(500).send("Error submitting to contest");
    }
};

/**
 * Get submissions by their IDs.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
const getSubmissionsByIds = async (req, res) => {
    const { submissionIds } = req.query;

    // Log the request query parameters
    console.log("Fetching submissions with IDs:", submissionIds);

    if (!submissionIds) {
        console.error("No submission IDs provided.");
        return res.status(400).send("No submission IDs provided");
    }

    const ids = submissionIds.split(',').map(id => new mongoose.Types.ObjectId(id));

    try {
        const submissions = await Submission.find({ _id: { $in: ids } });

        if (submissions.length === 0) {
            console.error("Submissions not found.");
            return res.status(404).send("Submissions not found");
        }

        console.log("Fetched submissions:", submissions);
        res.json(submissions);
    } catch (error) {
        console.error("Error fetching submissions:", error);
        res.status(500).send("Error fetching submissions");
    }
};

/**
 * Get a submission by its ID.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
const getSubmissionById = async (req, res) => {
    const { submissionId } = req.params;

    // Log the request params
    console.log("Fetching submission with ID:", submissionId);

    try {
        if (!mongoose.Types.ObjectId.isValid(submissionId)) {
            console.error("Invalid submission ID.");
            return res.status(400).json({ message: 'Invalid submission ID' });
        }

        const submission = await Submission.findById(submissionId).populate('contest');

        if (!submission) {
            console.error("Submission not found.");
            return res.status(404).json({ message: 'Submission not found' });
        }

        const contest = await Contest.findById(submission.contest._id).populate('submissions');

        if (!contest) {
            console.error("Contest not found.");
            return res.status(404).json({ message: 'Contest not found' });
        }

        const response = { ...contest.toObject(), submissions: [submissionId] };

        console.log("Fetched submission and associated contest:", response);
        res.json(response);
    } catch (error) {
        console.error('Failed to fetch submission and contest:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createSubmission,
    getSubmissionsByIds,
    getSubmissionById
};
