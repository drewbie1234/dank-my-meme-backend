// models/Submission.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SubmissionSchema = new Schema({
    wallet: { type: String, default: 'NA' },
    image: { type: String, required: true },
    contest: { type: Schema.Types.ObjectId, ref: 'Contest', required: true },
    votes: { type: Number, default: 0 } // Keeping track of votes per submission
});

const Submission = mongoose.model('Submission', SubmissionSchema);
module.exports = Submission;
