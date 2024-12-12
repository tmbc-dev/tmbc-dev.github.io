let web3, contract, userAddress;

async function connectToMetaMask() {
    const connectingElement = document.getElementById("connecting");
    const containerElement = document.querySelector(".container");
    const walletStatusElement = document.getElementById("wallet-status");

    if (typeof window.ethereum !== "undefined") {
        try {
            web3 = new Web3(window.ethereum);

            await switchToHoleskyNetwork();

            const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
            userAddress = accounts[0];

            contract = new web3.eth.Contract(contractABI, contractAddress);

            updateUIOnAccountChange();

            await fetchUserData();

            connectingElement.style.display = "none";
            containerElement.style.display = "flex";

            // Set up account change listener
            window.ethereum.on("accountsChanged", handleAccountChange);
        } catch (error) {
            console.error("Error connecting to MetaMask:", error);
            connectingElement.textContent = "Failed to connect to MetaMask. Please try again.";
        }
    } else {
        connectingElement.textContent = "MetaMask is not installed. Please install it to continue.";
    }
}

async function handleAccountChange(accounts) {
    if (accounts.length === 0) {
        alert("MetaMask is disconnected. Please connect an account.");
        window.location.reload();
    } else {
        userAddress = accounts[0];
        updateUIOnAccountChange();
        await fetchUserData();
    }
}

function updateUIOnAccountChange() {
    const walletStatusElement = document.getElementById("wallet-status");
    const shortAddress = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
    walletStatusElement.textContent = `🟢 ${shortAddress}`;
}

async function switchToHoleskyNetwork() {
    const holeskyChainId = "0x38";
    const holeskyParams = {
        chainId: holeskyChainId,
        chainName: "Binance Smart Chain",
        nativeCurrency: {
            name: "Binance Coin",
            symbol: "BNB",
            decimals: 18
        },
        rpcUrls: ["https://binance.llamarpc.com"],
        blockExplorerUrls: ["https://www.bscscan.com/"],
    };

    try {
        await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: holeskyChainId }],
        });
    } catch (error) {
        if (error.code === 4902) {
            try {
                await window.ethereum.request({
                    method: "wallet_addEthereumChain",
                    params: [holeskyParams],
                });
            } catch (addError) {
                console.error("Error adding BSC network:", addError);
                throw new Error("Failed to add BSC network to MetaMask.");
            }
        } else {
            console.error("Error switching to BSC network:", error);
            throw new Error("Failed to switch to BSC network.");
        }
    }
}

async function fetchUserData() {
    try {
        const userData = await contract.methods.users(userAddress).call();
        const miningLvl = Number(userData.minerLvl);
        const referralEarnings = Number(userData.referralEarnings);

        document.getElementById("mining-lvl").textContent = miningLvl;
        document.getElementById("mining-rate").textContent = `${(miningLvl * 0.001).toFixed(3)} TMBC/s`;
        document.getElementById("earned-by-referrals").textContent = `${(referralEarnings * 0.0005).toFixed(5)} BNB`;
    } catch (error) {
        console.error("Error fetching user data:", error);
    }
}

async function upgradeMiner() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const referrer = urlParams.get("r") || "0x0000000000000000000000000000000000000000";

        const tx = await contract.methods.upgradeMiner(referrer).send({
            from: userAddress,
            value: web3.utils.toWei("0.001", "ether"),
        });
        await fetchUserData();
    } catch (error) {
        console.error("Error upgrading miner:", error);
    }
}

function copyReferralUrl() {
    const referralUrl = `${window.location.origin}?r=${userAddress}`;
    navigator.clipboard.writeText(referralUrl).then(() => {
        alert("Referral URL copied to clipboard!");
    }).catch(err => {
        console.error("Failed to copy referral URL:", err);
    });
}

window.addEventListener("load", connectToMetaMask);
