import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { assert, ethers, makeError } from 'ethers';
import { useWallet } from '../contexts/WalletContext';
import contractData from '../contracts/Contest.json';
import tokenData from '../contracts/Token.json';

const { abi } = contractData[0];
const tokenAbi = tokenData;

const useContest = (contest) => {
    const [contract, setContract] = useState(null);
    const { selectedAccount, isWalletConnected } = useWallet();

    // Function to initialize the contest contract on demand
    const initializeContract = useCallback(async () => {
        console.log("Attempting to initialize contract...");

        if (!window.ethereum) {
            toast.error("Ethereum wallet is not available. Please connect and select an account in MetaMask.");
            console.error("Ethereum wallet not found.");
            return null;
        }

        if (!isWalletConnected || !selectedAccount) {
            toast.info("Please connect MetaMask and select an account.");
            return null;
        }

        if (window.ethereum.selectedAddress !== selectedAccount) {
            toast.error("Selected wallet and MetaMask account do not match.");
            return null;
        }

        if (contest.contractAddress && abi) {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            console.log("Provider and signer obtained:", provider, signer);
            const contestContract = new ethers.Contract(contest.contractAddress, abi, signer);
            console.log("Contract initialized:", contestContract);
            return contestContract;
        } else {
            toast.error("Contract address or ABI is missing.");
            console.error("Contract address or ABI is missing.");
            return null;
        }
    }, [contest, selectedAccount, isWalletConnected]);

    // Function to ensure contract is initialized before performing actions
    const getOrInitializeContract = useCallback(async () => {
        if (!contract) {
            console.log("Contract not yet initialized, initializing now...");
            const initializedContract = await initializeContract();
            setContract(initializedContract);
            return initializedContract;
        }
        console.log("Contract already initialized.");
        return contract;
    }, [contract, initializeContract]);

    // Approve token for submission and voting
    const approveToken = useCallback(async () => {
        console.log("Starting token approval process...");
    
        if (!contest.tokenAddress || !tokenAbi) {
            toast.error("Token contract address or ABI is missing.");
            console.error("Error: Token contract address or ABI is missing.");
            return false;
        }
    
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            console.log("Provider:", provider);
            console.log("Signer:", signer);
    
            const tokenContract = new ethers.Contract(contest.tokenAddress, tokenAbi, signer);
            console.log("Token Contract:", tokenContract);
    
            const entryFee = ethers.parseUnits(contest.entryFee.toString(), 18);
            const votingFee = ethers.parseUnits(contest.votingFee.toString(), 18);
            const totalApprovalAmount = entryFee + votingFee;
    
            console.log("Total approval amount:", totalApprovalAmount.toString());

            const contestContract = contest.contractAddress
    
            // Check current approval amount
            const currentAllowance = await tokenContract.allowance(selectedAccount, contestContract);
            console.log("Current allowance:", currentAllowance.toString());
    
            if (currentAllowance < totalApprovalAmount) {
                console.log("Current allowance is less than required. Approving new amount...");
                const approvalTx = await tokenContract.approve(contestContract, totalApprovalAmount);
                console.log("Approval transaction:", approvalTx);
    
                const approvalReceipt = await approvalTx.wait();
                console.log("Approval receipt:", approvalReceipt);
    
                toast.success("Token approval successful!");
                return true;
            } else {
                console.log("Existing allowance is sufficient.");
                return true; // No need for a new approval transaction
            }
        } catch (error) {
            console.error("Token approval error:", error);
            toast.error(`Token approval failed: ${error.message}`);
            return false;
        }
    }, [contest, selectedAccount]);
    

    // Submit entry to the contest
    const submitEntry = useCallback(async (imageData) => {
        console.log("Starting to submit entry...");
        const contract = await getOrInitializeContract();

        if (!contract) {
            console.error("Error: Contract not initialized.");
            return;
        }

        const isApproved = await approveToken();
        if (!isApproved) {
            console.log("Token not approved. Submission aborted.");
            return;
        }

        try {
            const txResponse = await contract.submitEntry(imageData);
            console.log("Transaction response:", txResponse);

            const txReceipt = await txResponse.wait();
            console.log("Transaction receipt:", txReceipt);

            toast.success("Entry submitted successfully!");

            return txReceipt;
        } catch (error) {
            console.error("Error object:", error);
            if (error.data) {
                console.error("Revert reason:", ethers.toUtf8String(error.data));
            } else if (error.message) {
                console.error("Error message:", error.message);
            }
            toast.error("Failed to execute transaction.");
        }
    }, [contract, approveToken, selectedAccount]);

    // Adjusted voteForSubmission function
    const voteForSubmission = useCallback(async (submissionIndex) => {
        console.log(`Starting to vote for submission index: ${submissionIndex}`);
        console.log(`contest object after being passed into voteForSubmission: ${contest}`)
        
        const contract = await getOrInitializeContract();

        if (!contest) {
            console.error("Error: Contest is undefined.");
            toast.error("Unable to vote: contest data is missing.");
            return;
        }

        if (!contract) {
            console.error("Error: Contract not initialized.");
            return;
        }

        console.log(`Voting contract: ${contract}`);

        const isApproved = await approveToken();
        if (!isApproved) {
            console.log("Token not approved. Voting aborted.");
            return;
        }

        try {
            const txResponse = await contract.voteForSubmission(submissionIndex);
            console.log("Transaction response:", txResponse);

            const txReceipt = await txResponse.wait();
            console.log("Transaction receipt:", txReceipt);

            toast.success("Vote cast successfully!");

            try {
                const response = await axios.post('https://app.dankmymeme.xyz:443/api/vote', {
                    contestId: contest._id,
                    voter: selectedAccount,
                    submissionIndex,
                    txHash: txReceipt.hash // Access the hash property directly
                });
            
                // Directly check the success message
                if (response.data && response.data.message === "Vote recorded successfully") {
                    console.log('Vote recorded successfully in the database:', response.data);
                } else {
                    console.error('Error recording vote in the database:', response.data);
                }
            } catch (apiError) {
                console.error('Error recording vote to the database:', apiError);
            }
            return txReceipt;

        } catch (error) {
            console.error("Error object:", error);
            if (error.data) {
                console.error("Revert reason:", ethers.toUtf8String(error.data));
            } else if (error.message) {
                console.error("Error message:", error.message);
            }
            toast.error("Failed to execute transaction.");
        }
    }, [contract, approveToken, selectedAccount]);



    // Submit meme (IPFS + Blockchain + DB)
    const submitMeme = useCallback(async (file, selectedAccount) => {
        console.log("Starting to upload meme...");

        if (!file || !selectedAccount) {
            console.error('Invalid file or no wallet connected');
            toast.error('Invalid file or wallet not connected');
            return { success: false, message: 'Invalid file or wallet not connected' };
        }

        try {
            const formData = new FormData();
            formData.append('file', file);

            const ipfsResponse = await axios.post('https://app.dankmymeme.xyz:443/api/pinFile', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const ipfsHash = ipfsResponse.data.IpfsHash;
            console.log('IPFS Hash:', ipfsHash);
            
            const txReceipt = await submitEntry(ipfsHash);

            if (!txReceipt) {
                console.error('Transaction submission failed');
                return { success: false, message: 'Failed to record submission. Please try again later' };
            }

            console.log('Transaction receipt:', txReceipt);

            const dbResponse = await axios.post('https://app.dankmymeme.xyz:443/api/submissions', {
                contest,
                userAddress: selectedAccount,
                ipfsHash
            });

            if (dbResponse.status === 200) {
                console.log('Submission recorded successfully in the database:', dbResponse.data);
                toast.success('Submission successfully recorded in the database');
                return { success: true, message: 'Submission successfully recorded in the database' };
            } else {
                console.error('Error recording submission in the database:', dbResponse.data);
                toast.error('Error recording submission in the database');
                return { success: false, message: 'Error recording submission in the database' };
            }
        } catch (error) {
            console.error('Error submitting meme:', error);
            toast.error('Error submitting meme to blockchain or database');
            return { success: false, message: 'Error submitting meme to blockchain or database' };
        }
    }, [submitEntry]);

    const endContest = useCallback(async (contestId) => {
        const contract = await getOrInitializeContract();
    
        if (!contract) {
            return;
        }
    
        try {
            const txResponse = await contract.endContest();
            const txReceipt = await txResponse.wait();  // Wait for the transaction to be mined
            toast.success("Contest ended successfully on the blockchain!");
    
            // If the blockchain transaction is successful, update the database
            try {
                const response = await axios.patch(`https://app.dankmymeme.xyz:443/api/contests/${contestId}/end`);
                console.log('Database updated successfully:', response.data);
                toast.success("Contest ended successfully in the database!");
            } catch (dbError) {
                console.error("Error updating the database:", dbError);
                toast.error("Failed to update the contest status in the database.");
            }
    
            return txReceipt;
        } catch (error) {
            if (ethers.isCallException(error)) {
                toast.error(`Transaction failed: ${error.reason || "See console for more details."}`);
                console.error("Revert reason:", error.revert);
                console.error("Complete error object:", error);
            } else {
                toast.error("Failed to withdraw prize, An unexpected error occurred. Please try again.");
                console.error(error);
            }
        }
    }, [contract, approveToken, selectedAccount]);
    

    const withdrawUnclaimedPrize = useCallback(async () => {

        const contract = await getOrInitializeContract();

        if (!contract) {
            toast.error("Contract not initialized.");
            return;
        }

        try {
            const txResponse = await contract.withdrawUnclaimedPrize();
            const txReceipt = await txResponse.wait();
            toast.success("Unclaimed prize withdrawn successfully!");
            return txReceipt;
        } catch (error) {
            if (ethers.isCallException(error)) {
                toast.error(`Transaction failed: ${error.reason || "See console for more details."}`);
                console.error("Revert reason:", error.revert);
                console.error("Complete error object:", error);
            } else {
                toast.error("Failed to withdraw prize, An unexpected error occurred. Please try again.");
                console.error(error);
            }
        }
    }, [contract, approveToken, selectedAccount]);

    const updateContestParameters = useCallback(async (entryFee, votingFee, winnerPercentage, numberOfLuckyVoters) => {
        
        const contract = await getOrInitializeContract();
        
        if (!contract) {
            toast.error("Contract not initialized.");
            return;
        }

        try {
            const txResponse = await contract.updateContestParameters(entryFee, votingFee, winnerPercentage, numberOfLuckyVoters);
            const txReceipt = await txResponse.wait();
            toast.success("Contest parameters updated successfully!");
            return txReceipt;
        } catch (error) {
            if (ethers.isCallException(error)) {
                toast.error(`Transaction failed: ${error.reason || "See console for more details."}`);
                console.error("Revert reason:", error.revert);
                console.error("Complete error object:", error);
            } else {
                toast.error("Failed to update parameters, an unexpected error occurred. Please try again.");
                console.error(error);
            }
        }
    }, [contract]);

    return {
        submitEntry,
        voteForSubmission,
        submitMeme,
        endContest,
        withdrawUnclaimedPrize,
        updateContestParameters,
    };
};

export default useContest;
