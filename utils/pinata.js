const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
require('dotenv').config(); // Make sure to require dotenv to access environment variables

const JWT = process.env.PINATA_JWT; // Accessing JWT from environment variables

async function pinFileToIPFS(file) {
    const pinataSDK = require('@pinata/sdk');
    const pinata = new pinataSDK({ pinataJWTKey: JWT});
    const res = await pinata.testAuthentication()
    console.log(res)
    // "message": "Congratulations! You are communicating with the Pinata API"!"

    const formData = new FormData();
    formData.append('file', file.data, file.name);  // Assuming 'file.data' is the buffer and 'file.name' is the filename
    
    // Additional Pinata metadata and options
    const pinataMetadata = JSON.stringify({ name: file.name });
    formData.append('pinataMetadata', pinataMetadata);

    const pinataOptions = JSON.stringify({ cidVersion: 0 });
    formData.append('pinataOptions', pinataOptions);

    try {
        const response = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
            headers: {
                'Authorization': `Bearer ${JWT}`,
                ...formData.getHeaders()
            }
        });
        console.log(response.data.IpfsHash)
        return response.data;
    } catch (error) {
        console.error('Error pinning file to IPFS:', error);
        throw error;
    }
}

// Usage example: pinFileToIPFS('path/to/file.png', 'optionalFileName.png');

module.exports = { pinFileToIPFS };