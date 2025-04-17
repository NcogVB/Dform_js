import Web3 from "web3";
import { ethers } from 'ethers';
import { userContractABI } from "./UserContractABI";
import { ToastPopup } from "@components/uiComponents/Toast";

const VITE_RPC_URL = import.meta.env.VITE_RPC_URL;
const VITE_PRIVATE_KEY = import.meta.env.VITE_PRIVATE_KEY;
const VITE_USER_CONTRACT = import.meta.env.VITE_USER_CONTRACT;

// Contract connection states
export const CONTRACT_STATUS = {
    NOT_INITIALIZED: 'NOT_INITIALIZED',
    INITIALIZING: 'INITIALIZING',
    CONNECTED: 'CONNECTED',
    ERROR: 'ERROR'
};

let contractStatus = CONTRACT_STATUS.NOT_INITIALIZED;
let web3Instance = null;
let userContract = null;

// Cache for user data to minimize blockchain calls
const userDataCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Transaction status tracking
export const TX_STATUS = {
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    FAILED: 'FAILED'
};

export const initializeContract = async () => {
    try {
        if (!VITE_RPC_URL || !VITE_USER_CONTRACT) {
            throw new Error("Missing RPC URL or contract address configuration");
        }

        contractStatus = CONTRACT_STATUS.INITIALIZING;
        web3Instance = new Web3(VITE_RPC_URL);
        
        // Test connection
        await web3Instance.eth.getBlockNumber();
        
        userContract = new web3Instance.eth.Contract(userContractABI, VITE_USER_CONTRACT);
        
        // Verify contract deployment
        const code = await web3Instance.eth.getCode(VITE_USER_CONTRACT);
        if (code === '0x') {
            throw new Error("No contract deployed at the specified address");
        }

        contractStatus = CONTRACT_STATUS.CONNECTED;
        return true;
    } catch (error) {
        console.error("Contract initialization error:", error);
        contractStatus = CONTRACT_STATUS.ERROR;
        ToastPopup('error', "Failed to connect to blockchain network");
        return false;
    }
};

export const getContractStatus = () => contractStatus;

export const getWeb3Instance = () => web3Instance;

export const getUserContract = async () => {
    if (contractStatus === CONTRACT_STATUS.NOT_INITIALIZED) {
        await initializeContract();
    }
    return userContract;
};

export const getPublicKeyValue = async () => {
    try {
        const accounts = await window.ncogProvider.request({ method: "ncog_accounts" });
        if (accounts?.selectedAccount?.accountAddress) {
            const encryptionPublicKey = await window.ncogProvider.request({
                method: "ncog_encryptionPublicKey"
            });
            return encryptionPublicKey?.response;
        }
        return null;
    } catch (error) {
        console.error("Error getting public key:", error);
        ToastPopup('error', "Failed to get public key");
        return null;
    }
};

export const getUserDetailsInWeb3 = async (userName, bypassCache = false) => {
    try {
        if (!userName) return null;
        
        const contract = await getUserContract();
        if (!contract) {
            throw new Error("Contract not initialized");
        }

        // Check cache first
        const cacheKey = `user_${userName}`;
        if (!bypassCache && userDataCache.has(cacheKey)) {
            const { data, timestamp } = userDataCache.get(cacheKey);
            if (Date.now() - timestamp < CACHE_DURATION) {
                return data;
            }
            userDataCache.delete(cacheKey);
        }

        const userDetails = await contract.methods.getUserByUsername(userName).call();
        
        // Update cache
        userDataCache.set(cacheKey, {
            data: userDetails,
            timestamp: Date.now()
        });

        return userDetails;
    } catch (error) {
        console.error("Error getting user details:", error);
        ToastPopup('error', "Failed to fetch user details");
        return null;
    }
}

export const getUserDetailsForWallet = async (walletAddress, bypassCache = false) => {
    try {
        if (!walletAddress) return [];

        const contract = await getUserContract();
        if (!contract) {
            throw new Error("Contract not initialized");
        }

        // Check cache first
        const cacheKey = `wallet_${walletAddress}`;
        if (!bypassCache && userDataCache.has(cacheKey)) {
            const { data, timestamp } = userDataCache.get(cacheKey);
            if (Date.now() - timestamp < CACHE_DURATION) {
                return data;
            }
            userDataCache.delete(cacheKey);
        }

        const userDetails = await contract.methods.getUserDetailsForWallet(walletAddress).call();
        
        // Update cache
        if (userDetails?.length) {
            userDataCache.set(cacheKey, {
                data: userDetails,
                timestamp: Date.now()
            });
            return userDetails;
        }
        return [];
    } catch (error) {
        console.error('Error fetching user details from wallet:', error);
        ToastPopup('error', "Failed to fetch wallet details");
        return [];
    }
}

const waitForTransaction = async (provider, txHash, maxAttempts = 50) => {
    try {
        let attempts = 0;
        while (attempts < maxAttempts) {
            const receipt = await provider.waitForTransaction(txHash);
            if (receipt) {
                return receipt.status === 1;
            }
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between attempts
        }
        throw new Error("Transaction timeout");
    } catch (error) {
        console.error("Transaction wait error:", error);
        return false;
    }
};

const getSenderAddress = async () => {
    try {
        const accounts = await window.ncogProvider.request({ method: "ncog_accounts" });
        return accounts?.selectedAccount?.accountAddress;
    } catch (error) {
        console.error("Error getting sender address:", error);
        throw new Error("Failed to get sender address");
    }
};

export const transactionAction = async (contract, functionName, functionParams, organizationId = null) => {
    let txHash;
    let status = TX_STATUS.PENDING;

    try {
        const provider = new ethers.JsonRpcProvider(VITE_RPC_URL);

        // Get gas price and estimate gas limit
        const gasPrice = await web3.eth.getGasPrice();
        const gasLimit = Math.floor(await contract.methods[functionName](...functionParams).estimateGas() * 1.2);

        if (organizationId) {
            const senderWallet = new ethers.Wallet(VITE_PRIVATE_KEY, provider);
            const contractWithWallet = new ethers.Contract(VITE_USER_CONTRACT, userContractABI, senderWallet);

            try {
                const tx = await contractWithWallet[functionName](...functionParams);
                txHash = tx.hash;
                ToastPopup('info', "Transaction pending...");
                
                const success = await waitForTransaction(provider, txHash);
                status = success ? TX_STATUS.CONFIRMED : TX_STATUS.FAILED;
                
                // Clear cache for updated data
                userDataCache.clear();
                
                if (success) {
                    ToastPopup('success', "Transaction confirmed!");
                    return txHash;
                } else {
                    ToastPopup('error', "Transaction failed");
                    return null;
                }
            } catch (error) {
                console.error("Transaction failed:", error);
                ToastPopup('error', error.message || "Transaction failed");
                status = TX_STATUS.FAILED;
                return null;
            }
        } else {
            try {
                const transaction = await contract.methods[functionName](...functionParams)
                    .send({ 
                        from: await getSenderAddress(), 
                        gas: gasLimit,
                        gasPrice 
                    });

                txHash = transaction.transactionHash;
                ToastPopup('info', "Transaction pending...");
                
                const success = await waitForTransaction(provider, txHash);
                status = success ? TX_STATUS.CONFIRMED : TX_STATUS.FAILED;
                
                // Clear cache for updated data
                userDataCache.clear();
                
                if (success) {
                    ToastPopup('success', "Transaction confirmed!");
                    return txHash;
                } else {
                    ToastPopup('error', "Transaction failed");
                    return null;
                }
            } catch (error) {
                console.error("Transaction failed:", error);
                ToastPopup('error', error.message || "Transaction failed");
                status = TX_STATUS.FAILED;
                return null;
            }
        }
    } catch (error) {
        console.error("Error in transaction action:", error);
        ToastPopup('error', "Transaction failed");
        return null;
    }
};
