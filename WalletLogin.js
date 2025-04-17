import { ToastPopup } from "@components/uiComponents/Toast";

// Wallet connection states
export const WALLET_STATES = {
    DISCONNECTED: 'DISCONNECTED',
    CONNECTING: 'CONNECTING',
    CONNECTED: 'CONNECTED',
    ERROR: 'ERROR'
};

let walletState = WALLET_STATES.DISCONNECTED;
let currentAccount = null;

// Event listeners storage
const eventListeners = new Map();

export const getCurrentWalletState = () => walletState;
export const getCurrentAccount = () => currentAccount;

const handleAccountsChanged = async (accounts) => {
    if (!accounts?.selectedAccount?.accountAddress) {
        walletState = WALLET_STATES.DISCONNECTED;
        currentAccount = null;
        ToastPopup('info', "Wallet disconnected");
        return;
    }
    
    if (currentAccount !== accounts.selectedAccount.accountAddress) {
        currentAccount = accounts.selectedAccount.accountAddress;
        walletState = WALLET_STATES.CONNECTED;
        ToastPopup('success', "Wallet account changed");
    }
};

const setupWalletListeners = () => {
    if (!window?.ncogProvider) return;
    
    // Remove existing listeners to prevent duplicates
    eventListeners.forEach((listener, event) => {
        window.ncogProvider.removeListener(event, listener);
    });
    eventListeners.clear();

    // Set up new listeners
    const listeners = {
        accountsChanged: handleAccountsChanged,
        disconnect: () => {
            walletState = WALLET_STATES.DISCONNECTED;
            currentAccount = null;
            ToastPopup('info', "Wallet disconnected");
        },
        connect: () => {
            walletState = WALLET_STATES.CONNECTED;
            ToastPopup('success', "Wallet connected");
        },
        error: (error) => {
            console.error('Wallet error:', error);
            walletState = WALLET_STATES.ERROR;
            ToastPopup('error', error.message || "Wallet error occurred");
        }
    };

    // Register new listeners
    Object.entries(listeners).forEach(([event, handler]) => {
        window.ncogProvider.on(event, handler);
        eventListeners.set(event, handler);
    });
};

const validateProvider = () => {
    if (!window?.ncogProvider) {
        ToastPopup('error', "Please install DWallet extension");
        return false;
    }
    return true;
};

export async function connectWallet() {
    try {
        if (!validateProvider()) return null;

        walletState = WALLET_STATES.CONNECTING;
        
        // Request wallet connection
        const accounts = await window.ncogProvider.request({ 
            method: 'ncog_accounts',
            params: [{ requestVisible: true }] // Request visible connection prompt
        });

        if (accounts?.selectedAccount?.accountAddress) {
            currentAccount = accounts.selectedAccount.accountAddress;
            walletState = WALLET_STATES.CONNECTED;
            
            // Setup event listeners only on successful connection
            setupWalletListeners();
            
            return currentAccount;
        } else {
            walletState = WALLET_STATES.ERROR;
            ToastPopup('error', "No accounts found");
            return null;
        }
    } catch (error) {
        console.error("Wallet connection error:", error);
        walletState = WALLET_STATES.ERROR;
        ToastPopup('error', error.message || "Failed to connect wallet");
        return null;
    }
}

export async function disconnectWallet() {
    try {
        if (!validateProvider()) return false;

        if (currentAccount) {
            await window.ncogProvider.request({ method: 'ncog_disconnect' });
            walletState = WALLET_STATES.DISCONNECTED;
            currentAccount = null;
            return true;
        }
        return false;
    } catch (error) {
        console.error("Wallet disconnection error:", error);
        ToastPopup('error', "Failed to disconnect wallet");
        return false;
    }
}

// Initialize wallet state if provider exists
if (window?.ncogProvider) {
    window.ncogProvider.request({ method: 'ncog_accounts' })
        .then(accounts => {
            if (accounts?.selectedAccount?.accountAddress) {
                currentAccount = accounts.selectedAccount.accountAddress;
                walletState = WALLET_STATES.CONNECTED;
                setupWalletListeners();
            }
        })
        .catch(console.error);
}
