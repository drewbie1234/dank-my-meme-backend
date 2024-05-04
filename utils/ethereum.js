// ethereum.js

const { ethers } = require('ethers');

require('dotenv').config();

// Assuming you have an Alchemy API key in your .env file
const alchemyApiKey = process.env.REACT_APP_ALCHEMY_API_KEY;
const alchemyUrl = `https://eth-mainnet.alchemyapi.io/v2/${alchemyApiKey}`;
const provider = new ethers.JsonRpcProvider(alchemyUrl);

// Function to get the balance of an Ethereum account
async function getBalance(account) {
    try {
        const balanceBigInt = await provider.getBalance(account);
        return ethers.formatEther(balanceBigInt);
    } catch (error) {
        console.error('Error fetching balance:', error);
        throw error; // Rethrow the error to handle it in the calling function
    }
}

// Function to resolve an ENS name to its corresponding Ethereum address
async function getEnsName(account) {
    try {
        const ensName = await provider.lookupAddress(account);
        return ensName;
    } catch (error) {
        console.error('Error fetching ENS name:', error);
        throw error; // Rethrow the error to handle it in the calling function
    }
}

module.exports = { getBalance, getEnsName };
