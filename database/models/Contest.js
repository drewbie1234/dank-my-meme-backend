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
    contractAddress: String, // Add this line to capture the contest's smart contract address
    tokenAddress: String,
    winningSubmission: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission' }
});

const Contest = mongoose.model('Contest', contestSchema);

module.exports = Contest;
