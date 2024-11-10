const Web3 = require('web3');
const axios = require('axios');

// Load environment variables
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const MONITOR_ADDRESS = process.env.MONITOR_ADDRESS.toLowerCase();
const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';

// Initialize Web3 connection
const web3 = new Web3(new Web3.providers.HttpProvider(BASE_RPC_URL));

// Minimal ERC-20 ABI to read token name
const ERC20_ABI = [
  {
    constant: true,
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    type: 'function'
  }
];

// Function to send a message to Telegram
const sendTelegramMessage = async (message) => {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await axios.post(url, { chat_id: CHAT_ID, text: message });
  } catch (error) {
    console.error('Failed to send message:', error.response?.data || error.message);
  }
};

// Function to get token name from contract address
const getTokenName = async (contractAddress) => {
  try {
    const contract = new web3.eth.Contract(ERC20_ABI, contractAddress);
    return await contract.methods.name().call();
  } catch (error) {
    console.error('Could not retrieve token name:', error);
    return 'Unknown Token';
  }
};

// Function to monitor for new token contracts
const monitorForNewTokens = async () => {
  try {
    const txCount = await web3.eth.getTransactionCount(MONITOR_ADDRESS, 'latest');
    const block = await web3.eth.getBlock('latest');
    for (let txHash of block.transactions) {
      const tx = await web3.eth.getTransaction(txHash);
      if (tx && tx.from.toLowerCase() === MONITOR_ADDRESS && !tx.to) {
        const receipt = await web3.eth.getTransactionReceipt(txHash);
        const contractAddress = receipt.contractAddress;
        if (contractAddress) {
          const tokenName = await getTokenName(contractAddress);
          const sigmaBuyLink = `https://t.me/SigmaTrading3_bot?start=buy_${contractAddress}`;
          const message = `New token contract created by ${MONITOR_ADDRESS}:\nToken Name: ${tokenName}\nContract Address: ${contractAddress}\nBuy Link: ${sigmaBuyLink}`;
          await sendTelegramMessage(message);
          console.log(message);
        }
      }
    }
  } catch (error) {
    console.error('Error in monitoring:', error);
  }
};

// Vercel handler function
module.exports = async (req, res) => {
  await monitorForNewTokens();
  res.send('Monitoring triggered');
};
