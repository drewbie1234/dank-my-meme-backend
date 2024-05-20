const express = require('express');
const router = express.Router();
const { renderToString } = require('react-dom/server');
const React = require('react');
const App = require('../server').default; // Adjust the path to your App component
const {
    createSubmission,
    getSubmissionsByIds,
    getSubmissionById,
    getContestBySubmissionId,
    fetchSubmissionById // Import the fetch function
} = require('../controllers/submissionController');

// Define the routes
router.post('/', createSubmission);
router.get('/', getSubmissionsByIds);

// Update the existing route to render with EJS
router.get('/:submissionId', async (req, res) => {
    const { submissionId } = req.params;
    try {
        const submission = await fetchSubmissionById(submissionId); // Fetch submission data
        if (!submission) {
            return res.status(404).send('Submission not found');
        }

        // const htmlContent = renderToString(<App submission={submission} />);
        res.render('index', {
            title: submission.title || 'Dank My Meme',
            ogTitle: submission.title || 'Dank My Meme',
            ogDescription: submission.description || 'Create and share the funniest memes with Dank My Meme.',
            ogImage: submission.image || 'https://www.dankmymeme.xyz/default.png',
            ogUrl: `https://app.dankmymeme.xyz/submissions/${submissionId}`,
            twitterTitle: submission.title || 'Dank My Meme',
            twitterDescription: submission.description || 'Create and share the funniest memes with Dank My Meme.',
            twitterImage: submission.image || 'https://www.dankmymeme.xyz/default.png',
            // content: htmlContent
        });
    } catch (error) {
        console.error('Error fetching submission:', error);
        res.status(500).send('Server error');
    }
});

router.get('/:submissionId/contest', getContestBySubmissionId);

module.exports = router;
