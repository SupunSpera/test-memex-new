const { ethers } = require("hardhat");
const { getAbstractConfig } = require("../utils/AbstractConfig");

async function main() {
    const chainId = await ethers.provider.getNetwork().then(n => n.chainId);
    console.log(`\n🚀 Deploying to Abstract L2 (Chain ID: ${chainId})`);
    
    // Check if we're on Abstract
    if (chainId != 2741 && chainId != 11124) {
        console.error("❌ Not connected to Abstract network!");
        console.log("Expected Chain IDs: 2741 (mainnet) or 11124 (testnet)");
        console.log(`Current Chain ID: ${chainId}`);
        return;
    }
    
    // Load Abstract configuration
    const config = getAbstractConfig(chainId.toString());
    console.log(`📋 Network: ${config.name}`);
    console.log(`🌐 RPC: ${config.rpcUrl}`);
    console.log(`🔍 Explorer: ${config.explorerUrl}`);
    
    // Get deployer account
    const [deployer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(deployer.address);
    
    console.log(`\n👤 Deployer: ${deployer.address}`);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
    
    // Check minimum balance required
    const minBalance = ethers.parseEther("0.01"); // 0.01 ETH minimum
    if (balance < minBalance) {
        console.warn(`⚠️  Warning: Low balance! Consider getting more ETH`);
        console.log(`   Recommended: At least 0.01 ETH for deployment`);
    }
    
    console.log(`\n✅ Abstract L2 deployment environment ready!`);
    console.log(`\n🔧 Uniswap V3 Configuration:`);
    console.log(`   Factory: ${config.uniswapV3.factory}`);
    console.log(`   Position Manager: ${config.uniswapV3.positionManager}`);
    console.log(`   WETH: ${config.weth}`);
    
    console.log(`\n📝 Next steps:`);
    console.log(`   1. Run: npm run abstract-testnet:deploy`);
    console.log(`   2. Run: npm run abstract-testnet:verify`);
    console.log(`   3. Check deployments in: deployments/abstract-testnet/`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(`❌ Error:`, error);
        process.exit(1);
    }); 