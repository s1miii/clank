import requests
from web3 import Web3
import os

# Load environment variables
TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
CHAT_ID = os.getenv('CHAT_ID')
MONITOR_ADDRESS = os.getenv('MONITOR_ADDRESS')
BASE_RPC_URL = os.getenv('BASE_RPC_URL', 'https://mainnet.base.org')

# Initialize Web3 connection
web3 = Web3(Web3.HTTPProvider(BASE_RPC_URL))

# ERC-20 ABI to read token name
ERC20_ABI = [
    {
        "constant": True,
        "inputs": [],
        "name": "name",
        "outputs": [{"name": "", "type": "string"}],
        "type": "function",
    }
]

# Function to send a message to Telegram
def send_telegram_message(message):
    url = f'https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage'
    data = {'chat_id': CHAT_ID, 'text': message}
    response = requests.post(url, data=data)
    if response.status_code != 200:
        print(f"Failed to send message: {response.text}")

# Function to get token name from contract address
def get_token_name(contract_address):
    try:
        contract = web3.eth.contract(address=contract_address, abi=ERC20_ABI)
        return contract.functions.name().call()
    except Exception as e:
        print(f"Could not retrieve token name: {e}")
        return "Unknown Token"

# Function to monitor for new token contracts
def monitor_for_new_tokens():
    existing_tx_count = web3.eth.get_transaction_count(MONITOR_ADDRESS)
    current_tx_count = web3.eth.get_transaction_count(MONITOR_ADDRESS)

    if current_tx_count > existing_tx_count:
        for tx_index in range(existing_tx_count, current_tx_count):
            tx = web3.eth.get_transaction_by_block('latest', tx_index)
            if tx and tx['from'].lower() == MONITOR_ADDRESS.lower() and tx['to'] is None:
                receipt = web3.eth.get_transaction_receipt(tx['hash'])
                contract_address = receipt['contractAddress']
                if contract_address:
                    token_name = get_token_name(contract_address)
                    sigma_buy_link = f"https://t.me/SigmaTrading3_bot?start=buy_{contract_address}"
                    message = (
                        f"New token contract created by {MONITOR_ADDRESS}:\n"
                        f"Token Name: {token_name}\n"
                        f"Contract Address: {contract_address}\n"
                        f"Buy Link: {sigma_buy_link}"
                    )
                    send_telegram_message(message)
                    print(message)

# Vercel serverless function handler
def handler(request):
    monitor_for_new_tokens()
    return "Monitoring triggered", 200
