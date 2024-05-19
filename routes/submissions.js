const express = require('express');
const router = express.Router();
const {
    createSubmission,
    getSubmissionsByIds,
    getSubmissionById,
    getContestBySubmissionId
} = require('../controllers/submissionController');

// Define the routes
router.post('/', createSubmission);
router.get('/', getSubmissionsByIds);
router.get('/:submissionId', getSubmissionById);
router.get('/:submissionId/contest', getContestBySubmissionId);

module.exports = router;
