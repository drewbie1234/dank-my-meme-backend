const express = require("express");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const mongoose = require("mongoose");
require("dotenv").config();
const ethers = require('ethers');
// const setupEventListeners = require("../backend/utils/listenToContractEvents")

// Import models
const Contest = require("./database/models/Contest");
const Submission = require("./database/models/Submission");
const Vote = require("./database/models/Vote");

// MongoDB URI
const uri = process.env.MONGODB_URI;

// Async function to connect to MongoDB
async function connectToMongoDB() {
    try {
        await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
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

// Initialize event listeners
// setupEventListeners(provider);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(fileUpload());


// Import the Ethereum functionality
const { getBalance, getEnsName } = require("./utils/ethereum");
const { pinFileToIPFS } = require("./utils/pinata");

app.post("/api/contests", async (req, res) => {
    console.log("Received data for new contest:", req.body);
    try {
        const { name, startDateTime, endDateTime, entryFee, votingFee, winnerPercentage, numberOfLuckyVoters, contractAddress, tokenAddress } = req.body;
        if (!name || !startDateTime || !endDateTime || !entryFee || !votingFee || !winnerPercentage || !numberOfLuckyVoters || !contractAddress || !tokenAddress ) {
            throw new Error("Missing required fields");
        }
        const newContest = new Contest({
            name, startDateTime: new Date(startDateTime), endDateTime: new Date(endDateTime),
            entryFee, votingFee, winnerPercentage, numberOfLuckyVoters, contractAddress, tokenAddress
        });
        await newContest.save();
        console.log("Contest created:", newContest);
        res.json(newContest);
    } catch (error) {
        console.error("Error creating contest:", error);
        res.status(500).send("Error creating contest");
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
    const { contest, voter, submissionIndex, txHash } = req.body;

    // Log the parameters
    console.log("Vote Request Parameters:");
    console.log(`  Contest ID: ${contest}`);
    console.log(`  User Address: ${voter}`);
    console.log(`  Submission Index: ${submissionIndex}`);
    console.log(`  Transaction Hash: ${txHash}`);
    
    // Validate input data
    if (!contestId || !userAddress || !submissionIndex === undefined) {
        console.error("Invalid input data. Missing required fieldczasddsas.");
        return res.status(400).json({ message: "Invalid input data. Missing required fields." });
    }

    console.log(`Received vote request for contestId: ${contestId}, userAddress: ${userAddress}, submissionIndex: ${submissionIndex}, txHash: ${txHash}`);

    try {
        // Find contest by ID
        const contest = await Contest.findById(contestId);
        if (!contest) {
            console.error("Contest not found:", contestId);
            return res.status(404).json({ message: "Contest not found" });
        }

        // Find submission based on the contest ID and submission index
        const submission = await Submission.findOne({ contest: contestId, index: submissionIndex });
        if (!submission) {
            console.error("Submission not found for index:", submissionIndex);
            return res.status(404).json({ message: "Submission not found" });
        }

        // Create a new vote entry
        const vote = new Vote({
            contest: contest._id,
            submission: submission._id,
            voter: userAddress,
            transactionHash: txHash
        });
        await vote.save();
        console.log("Vote recorded for submission:", submission._id);

        // Increment submission and contest votes
        submission.votes += 1;
        await submission.save();

        contest.votes += 1;
        if (!contest.winningSubmission || submission.votes > contest.winningVotes) {
            contest.winningSubmission = submission._id;
            contest.winningVotes = submission.votes;
            console.log("Updated winning submission:", submission._id);
        }
        await contest.save();

        // Respond with success
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
    try {
        const ensName = await getEnsName(account);
        console.log(ensName);
        res.json({ ensName: ensName || "No ENS name found" });
    } catch (error) {
        console.error("Error fetching ENS name:", error);
        res.status(500).send("Error fetching ENS name");
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
