// eventListeners.js
const { ethers } = require('ethers');
const Submission = require("./database/models/Submission");
const Vote = require("./database/models/Vote");
const contractData = require('./contracts/Contest.json');
const abi = contractData[0].abi;
const contractAddress = "0x7c0EDC302f539f91465Bf3381983DD39A36D6AE9";

function setupEventListeners(provider) {
  const contract = new ethers.Contract(contractAddress, abi, provider);
  console.log("listeners active")

  // Listening to events and handling them
  contract.on('SubmissionMade', async (participant, image, timestamp, event) => {
    console.log(`New entry from ${participant}: ${image} at ${timestamp}`);
    try {
      const newSubmission = new Submission({
        wallet: participant,
        image: image,
        timestamp: new Date(timestamp * 1000),
        transactionHash: transactionHash
      });
      await newSubmission.save();
      console.log('Submission saved to MongoDB:', newSubmission);
    } catch (error) {
      console.error('Error saving to MongoDB:', error);
    }
  });

  contract.on('VoteCasted', async (voter, submissionIndex, timestamp, event) => {
    console.log(`Vote casted by ${voter} for submission ${submissionIndex} at ${timestamp}`);
    try {
      const submission = await Submission.findById(submissionIndex);
      if (!submission) {
        console.log('Submission not found:', submissionIndex);
        return;
      }
      submission.votes += 1;
      await submission.save();

      const newVote = new Vote({
        voter: voter,
        submission: submission._id,
        timestamp: new Date(timestamp * 1000)
      });
      await newVote.save();
      console.log('Vote saved to MongoDB:', newVote);
    } catch (error) {
      console.error('Error processing vote:', error);
    }
  });

  contract.on('ContestEnded', async (winner, winnerPrize, luckyVoterPrize, timestamp, event) => {
    console.log(`Contest ended with winner ${winner} at ${timestamp}`);
    // Additional logic to handle contest end, such as updating contest status in database
  });

}

module.exports = setupEventListeners;
