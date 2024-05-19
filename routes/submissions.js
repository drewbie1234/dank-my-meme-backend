const express = require('express');
const router = express.Router();
const {
    createSubmission,
    getSubmissionsByIds,
    getSubmissionById
} = require('../controllers/submissionController');

// Define the routes
router.post('/', createSubmission);
router.get('/', getSubmissionsByIds);
router.get('/:submissionId', getSubmissionById);

module.exports = router;
