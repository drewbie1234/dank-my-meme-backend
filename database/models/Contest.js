const mongoose = require('mongoose');

const contestSchema = new mongoose.Schema({
    name: String,
    startDateTime: Date,
    endDateTime: Date,
    entryFee: Number,
    votingFee: Number,
    winnerPercentage: Number,
    numberOfLuckyVoters: Number,
    submissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Submission' }],
    highestVotes: Number,
    voters: [{ type: String }], // List of voter addresses
    contractAddress: String, // Smart contract address for the contest
    tokenAddress: String, // Address of the token used for fees and rewards
    winningSubmission: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission' },
    contestOwner: { type: String, required: true }, // Address of the contest owner
    contestEnded: { type: Boolean, default: false } // Flag to indicate if the contest has ended
});

const Contest = mongoose.model('Contest', contestSchema);

module.exports = Contest;
