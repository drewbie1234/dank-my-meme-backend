const express = require("express");
const fs = require("fs");
const https = require("https");
const cors = require("cors");
const path = require('path');
const fileUpload = require("express-fileupload");
const mongoose = require("mongoose");
require("dotenv").config();
const ethers = require('ethers');

// Load SSL certificate files
const privateKey = fs.readFileSync('/etc/letsencrypt/live/app.dankmymeme.xyz/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/app.dankmymeme.xyz/fullchain.pem', 'utf8');
const ca = fs.readFileSync('/etc/letsencrypt/live/app.dankmymeme.xyz/chain.pem', 'utf8');

const credentials = {
    key: privateKey,
    cert: certificate,
    ca: ca
  };

// Import models and other utilities as before
const Contest = require("./database/models/Contest");
const Submission = require("./database/models/Submission");
const Vote = require("./database/models/Vote");
const { getBalance, getEnsName } = require("./utils/ethereum");
const { pinFileToIPFS } = require("./utils/pinata");

// Initialize the Express application
const app = express();
const port = process.env.PORT || 443; // Standard HTTPS port is 443

// Middleware
app.use(cors());
app.use(express.json());
app.use(fileUpload());


// MongoDB URI
const uri = process.env.MONGODB_URI;

// Async function to connect to MongoDB
async function connectToMongoDB() {
    try {
        await mongoose.connect(uri);
        console.log('Successfully connected to MongoDB');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        process.exit(1); // Exit the process with an error code
    }
}

// Execute the connection function
connectToMongoDB();

// Ethereum provider setup
const url = process.env.ETH_PROVIDER_URL || 'https://turbo.magma-rpc.com';
const provider = new ethers.JsonRpcProvider(url);
console.log("Using Ethereum provider at:", url);



// Middleware to log requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log("Request headers:", req.headers);
    console.log("Request body:", req.body);
    next();
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something middleware broke!');
});

// Serve static files from the '.well-known' directory
app.use('/.well-known', express.static(path.join(__dirname, '.well-known'), {
    dotfiles: 'allow' // Important: allows serving of dotfiles such as '.well-known'
}));


app.post("/api/contests", async (req, res) => {
    console.log("Received data for new contest:", req.body);
    try {
        const { name, startDateTime, endDateTime, entryFee, votingFee, winnerPercentage, numberOfLuckyVoters, contractAddress, tokenAddress, contestOwner, contestEnded } = req.body;
        if (!name || !startDateTime || !endDateTime || !entryFee || !votingFee || !winnerPercentage || !numberOfLuckyVoters || !contractAddress || !tokenAddress || !contestOwner) {
            throw new Error("Missing required fields");
        }
        const newContest = new Contest({
            name, startDateTime: new Date(startDateTime), endDateTime: new Date(endDateTime),
            entryFee, votingFee, winnerPercentage, numberOfLuckyVoters, contractAddress, tokenAddress, contestOwner, contestEnded, distributionTX
        });
        await newContest.save();
        console.log("Contest created:", newContest);
        res.json(newContest);
    } catch (error) {
        console.error("Error creating contest:", error);
        res.status(500).send("Error creating contest");
    }
});

app.patch("/api/contests/:contestId/end", async (req, res) => {
    const { contestId } = req.params;
    try {
        // Find the contest by ID and update the contestEnded field to true
        const updatedContest = await Contest.findByIdAndUpdate(
            contestId,
            { $set: { contestEnded: true } },
            { new: true }  // Return the updated document
        );

        if (!updatedContest) {
            return res.status(404).send("Contest not found");
        }

        console.log("Contest ended successfully:", updatedContest);
        res.json({ message: "Contest ended successfully", contest: updatedContest });
    } catch (error) {
        console.error("Error ending contest:", error);
        res.status(500).send("Error ending contest");
    }
});

// PATCH request to update contest owner
app.patch('/api/contests/:contestId/owner', async (req, res) => {
    const { contestId } = req.params;
    const { newOwner } = req.body;

    if (!newOwner) {
        return res.status(400).send('New owner address is required');
    }

    try {
        const updatedContest = await Contest.findByIdAndUpdate(
            contestId,
            { $set: { contestOwner: newOwner }},
            { new: true } // options to return the updated document
        );

        if (!updatedContest) {
            return res.status(404).send('Contest not found');
        }

        console.log('Updated contest owner:', updatedContest);
        res.json({
            message: 'Contest owner updated successfully',
            contest: updatedContest
        });
    } catch (error) {
        console.error('Failed to update contest owner:', error);
        res.status(500).send('Error updating contest owner');
    }
});



app.get("/api/contests", async (req, res) => {
    try {
        const contests = await Contest.find({});
        res.json(contests);
    } catch (error) {
        console.error("Error fetching contests:", error);
        res.status(500).send("Error fetching contests");
    }
});

app.post("/api/pinFile", async (req, res) => {
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send("No file uploaded");
    }
    const uploadedFile = req.files.file;
    try {
        const result = await pinFileToIPFS(uploadedFile);
        res.json(result);
    } catch (error) {
        console.error("Error in pinning file:", error);
        res.status(500).send("Error pinning file to IPFS");
    }
});

app.post("/api/submissions", async (req, res) => {
    const { contest, userAddress, ipfsHash } = req.body;
    try {
        if (!ipfsHash) {
            return res.status(400).send("No IPFS hash provided");
        }
        const newSubmission = new Submission({ contest, wallet: userAddress, image: ipfsHash });
        await newSubmission.save();
        console.log("Submission created:", newSubmission);
        const updatedContest = await Contest.findByIdAndUpdate(contest, { $push: { submissions: newSubmission._id } }, { new: true });
        res.json(newSubmission);
    } catch (error) {
        console.error("Error submitting to contest:", error);
        res.status(500).send("Error submitting to contest");
    }
});

app.get("/api/submissions", async (req, res) => {
    const { submissionIds } = req.query;
    if (!submissionIds) {
        res.status(400).send("No submission IDs provided");
        return;
    }
    const ids = submissionIds.split(',').map(id => new mongoose.Types.ObjectId(id));
    try {
        const submissions = await Submission.find({ _id: { $in: ids } });
        if (submissions.length === 0) {
            res.status(404).send("Submissions not found");
            return;
        }
        res.json(submissions);
    } catch (error) {
        console.error("Error fetching submissions:", error);
        res.status(500).send("Error fetching submissions");
    }
});

app.post("/api/vote", async (req, res) => {
    const { contestId, voter, submissionIndex, txHash } = req.body;

    if (!contestId || !voter || submissionIndex === undefined || !txHash) {
        console.error("Invalid input data. Missing required fields.");
        return res.status(400).json({ message: "Invalid input data. Missing required fields." });
    }

    try {
        // Find the contest by ID
        const contest = await Contest.findById(contestId).populate('submissions');
        if (!contest) {
            console.error("Contest not found:", contestId);
            return res.status(404).json({ message: "Contest not found" });
        }

        // Check if the voter has already voted, prevent duplicate votes if necessary
        if (contest.voters.includes(voter)) {
            return res.status(400).json({ message: "Voter has already voted." });
        }

        const submission = contest.submissions[submissionIndex];
        if (!submission) {
            console.error("Submission not found for index:", submissionIndex);
            return res.status(404).json({ message: "Submission not found" });
        }

        // Record the vote
        const vote = new Vote({
            contest: contest._id,
            submission: submission._id,
            voter,
            txHash
        });
        await vote.save();

        // Increment votes on the submission and add voter to voters list
        submission.votes += 1;
        await submission.save();

        // Push the voter to the voters array in the contest document
        contest.voters.push(voter);

        // Update the contest's winning submission and highest votes
        if (!contest.winningSubmission || submission.votes > contest.highestVotes) {
            contest.winningSubmission = submission._id;
            contest.highestVotes = submission.votes;
        }
        await contest.save();

        console.log("Vote recorded successfully:", vote);
        res.status(201).json({ message: "Vote recorded successfully", vote });
    } catch (error) {
        console.error("Error recording vote:", error);
        res.status(500).json({ message: "Error recording vote" });
    }
});




app.get("/api/getBalance", async (req, res) => {
    const { account } = req.query;
    try {
        const balance = await getBalance(account);
        res.json({ balance });
    } catch (error) {
        console.error("Error fetching balance:", error);
        res.status(500).send("Error fetching balance");
    }
});

app.get("/api/getLavaBalance", async (req, res) => {
    const { account } = req.query;
    try {
        const balance = await getBalance(account);
        console.log(balance);
        res.json({ balance });
    } catch (error) {
        console.error("Error fetching balance:", error);
        res.status(500).send("Error fetching balance");
    }
});

app.get("/api/getEns", async (req, res) => {
    const { account } = req.query;
    if (!account) {
        return res.status(400).send("Account parameter is required");
    }

    try {
        const ensName = await getEnsName(account);
        // Check if ensName exists, otherwise format the account string
        const displayName = ensName || `${account.substring(0, 6)}...${account.substring(account.length - 4)}`;
        console.log(displayName);
        res.json({ ensName: displayName });
    } catch (error) {
        console.error("Error fetching ENS name:", error);
        res.status(500).send("Error fetching ENS name");
    }
});

// Create the HTTPS server and pass in your app (Express instance)
const httpsServer = https.createServer(credentials, app);

// Listen on HTTPS
httpsServer.listen(port, () => {
    console.log(`HTTPS Server running on https://194.124.43.95:${port}`);
});


// Other routes can be defined similarly 194.124.43.95

