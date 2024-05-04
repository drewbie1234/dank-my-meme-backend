require('dotenv').config();
const ethers = require('ethers');

// Magma testnet RPC URL and LAVA token contract address from environment variables
const url = 'https://turbo.magma-rpc.com';
const lavaTokenContractAddress = process.env.LAVA_TOKEN_CONTRACT_ADDRESS;

const provider = new ethers.JsonRpcProvider(url);

// ERC20 Token ABI for the balanceOf function
const erc20Abi = ["function balanceOf(address owner) view returns (uint256)"];

// Function to get the LAVA token balance
async function getLavaBalance(account) {
    try {
        // Create a contract instance for the LAVA token
        const tokenContract = new ethers.Contract(lavaTokenContractAddress, erc20Abi, provider);

        // Fetch LAVA ERC20 token balance
        const balanceBigInt = await tokenContract.balanceOf(account);
        const balance = ethers.utils.formatEther(balanceBigInt); // Convert the balance to a readable format
        console.log(`LAVA Token Balance for ${account}: ${balance}`);
        
        return balance;
    } catch (error) {
        console.error('Error fetching LAVA balance:', error);
        throw error; // Rethrow the error to handle it in the calling function
    }
}

module.exports = { getLavaBalance };
