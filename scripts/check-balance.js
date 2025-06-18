const { ethers } = require("hardhat");
const { getAbstractConfig } = require("../utils/AbstractConfig");
require('dotenv').config();

async function checkBalance(network = "testnet") {
    try {
        console.log(`\n🔍 Checking Abstract ${network} wallet balance...`);
        
        // Determine chain ID based on network
        const chainId = network === "mainnet" ? "2741" : "11124";
        const config = getAbstractConfig(chainId);
        
        console.log(`📋 Network: ${config.name}`);
        console.log(`🌐 RPC: ${config.rpcUrl}`);
        console.log(`🔍 Explorer: ${config.explorerUrl}`);
        
        // Check if mnemonic exists
        if (!process.env.MNEMONIC) {
            console.error("❌ Error: MNEMONIC not found in .env file");
            console.log("Please add your mnemonic to the .env file:");
            console.log('MNEMONIC="your twelve word mnemonic phrase here"');
            return;
        }
        
        // Create wallet from mnemonic
        const wallet = ethers.Wallet.fromPhrase(process.env.MNEMONIC);
        console.log(`\n👤 Wallet Address: ${wallet.address}`);
        
        // Create provider for Abstract network
        const provider = new ethers.JsonRpcProvider(config.rpcUrl);
        
        // Get balance
        const balance = await provider.getBalance(wallet.address);
        const balanceInEth = ethers.formatEther(balance);
        
        console.log(`💰 Balance: ${balanceInEth} ETH`);
        
        // Check if balance is sufficient for deployment
        const minBalance = ethers.parseEther("0.01");
        const recommendedBalance = ethers.parseEther("0.05");
        
        if (balance >= recommendedBalance) {
            console.log("✅ Excellent! You have sufficient ETH for deployment");
        } else if (balance >= minBalance) {
            console.log("⚠️  Warning: Low balance but should be sufficient for deployment");
        } else {
            console.log("❌ Insufficient balance for deployment!");
            console.log(`   Minimum required: 0.01 ETH`);
            console.log(`   Recommended: 0.05 ETH`);
            console.log(`   Current: ${balanceInEth} ETH`);
            
            if (network === "testnet") {
                console.log("\n🚰 Get testnet ETH from:");
                console.log("   - Abstract testnet faucets");
                console.log("   - Bridge from Ethereum Sepolia");
                console.log("   - Ask in Abstract Discord community");
            }
        }
        
        // Show network details for getting ETH
        if (network === "testnet") {
            console.log(`\n🔗 Add network to wallet:`);
            console.log(`   Network Name: ${config.name}`);
            console.log(`   RPC URL: ${config.rpcUrl}`);
            console.log(`   Chain ID: ${chainId}`);
            console.log(`   Currency: ETH`);
            console.log(`   Block Explorer: ${config.explorerUrl}`);
        }
        
        return {
            address: wallet.address,
            balance: balanceInEth,
            sufficient: balance >= minBalance
        };
        
    } catch (error) {
        console.error("❌ Error checking balance:", error.message);
        
        // Provide helpful error messages
        if (error.message.includes("could not connect")) {
            console.log("\n🔧 Possible fixes:");
            console.log("   - Check your internet connection");
            console.log("   - Try again in a few minutes");
            console.log("   - Verify Abstract RPC endpoint is working");
        }
        
        return null;
    }
}

async function checkMultipleNetworks() {
    console.log("🌐 Checking balances on both Abstract networks...\n");
    
    const testnetResult = await checkBalance("testnet");
    console.log("\n" + "=".repeat(60));
    const mainnetResult = await checkBalance("mainnet");
    
    console.log("\n📊 Summary:");
    console.log("=" .repeat(60));
    
    if (testnetResult) {
        console.log(`Testnet:  ${testnetResult.balance} ETH ${testnetResult.sufficient ? '✅' : '❌'}`);
    }
    
    if (mainnetResult) {
        console.log(`Mainnet:  ${mainnetResult.balance} ETH ${mainnetResult.sufficient ? '✅' : '❌'}`);
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    const network = args[0];
    
    if (network === "mainnet") {
        await checkBalance("mainnet");
    } else if (network === "testnet") {
        await checkBalance("testnet");
    } else if (network === "both") {
        await checkMultipleNetworks();
    } else {
        console.log("Usage:");
        console.log("  npm run check-balance testnet   # Check testnet balance");
        console.log("  npm run check-balance mainnet   # Check mainnet balance");
        console.log("  npm run check-balance both      # Check both networks");
        console.log("\nDefaulting to testnet...\n");
        await checkBalance("testnet");
    }
}

// Handle direct execution
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error("❌ Script failed:", error);
            process.exit(1);
        });
}

module.exports = { checkBalance, checkMultipleNetworks }; 