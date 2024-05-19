const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const VoteSchema = new Schema({
    contest: {
        type: Schema.Types.ObjectId,
        ref: 'Competition', // Adjusted to the correct contest model name if different
        required: true
    },
    submission: {
        type: Schema.Types.ObjectId,
        ref: 'Submission', // Ensure this is the correct submission model name
        required: true
    },
    voter: {
        type: String,
        required: true
    },
    voteDate: {
        type: Date,
        default: Date.now
    },
    txHash: {
        type: String,
        default: ''  // Keep this if you intend to store transaction hashes
    },
});

const Vote = mongoose.model('Vote', VoteSchema);
module.exports = Vote;
