const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log(`\n👤 Initializing Factory with deployer: ${deployer.address}`);

    // Contract addresses from deployment
    const factoryAddress = "0xeE1B71D2d449b9E8F5e24aD50C5D42461A062b62";
    const tokenImplAddress = "0xEED4e5a7C2eCF1037cD793BA7a7af1FAF4A625AB";
    const bondingCurveImplAddress = "0x9E8e04F56a8fCeeAbE739e76b1FfA1Bbb36B73BA";
    const lockContractAddress = "0xc5aC86338B9e77483351641C390561E16055e743";

    // Get the deployed Factory contract
    const factory = await ethers.getContractAt("Factory", factoryAddress);
    console.log(`📋 Factory address: ${factoryAddress}`);

    // Get the deployed implementation contracts
    const tokenImpl = await ethers.getContractAt("TokenImplementation", tokenImplAddress);
    const bondingCurveImpl = await ethers.getContractAt("BondingCurve", bondingCurveImplAddress);
    const lockContract = await ethers.getContractAt("Lock", lockContractAddress);

    console.log(`\n🔧 Implementation addresses:`);
    console.log(`Token Implementation: ${tokenImplAddress}`);
    console.log(`Bonding Curve Implementation: ${bondingCurveImplAddress}`);
    console.log(`Lock Contract: ${lockContractAddress}`);

    // Check if already initialized
    try {
        const owner = await factory.owner();
        if (owner !== '0x0000000000000000000000000000000000000000') {
            console.log(`✅ Factory already initialized with owner: ${owner}`);
            const deploymentFee = await factory.getDeploymentFee();
            console.log(`✅ Current deployment fee: ${ethers.formatEther(deploymentFee)} ETH`);
            return;
        }
    } catch (e) {
        console.log('Factory not initialized yet, proceeding...');
    }

    // Initialize Factory with settings
    const initialSettings = {
        virtualEth: ethers.parseEther("1.0"),        // 1 ETH virtual liquidity
        bondingTarget: ethers.parseEther("2.4"),     // 2.4 ETH bonding target  
        minContribution: ethers.parseEther("0.00003"), // 0.00003 ETH minimum contribution
        poolFee: 3000,                               // 0.3% pool fee
        sellFee: 100,                                // 1% sell fee
        uniswapV3Factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984", // Uniswap V3 Factory
        positionManager: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",   // Uniswap V3 Position Manager
        weth: "0x4200000000000000000000000000000000000006",  // WETH on Abstract testnet
        feeTo: deployer.address                      // Fee recipient
    };

    console.log('\n🚀 Initializing Factory with:');
    console.log(`- Factory Fee: 0.0001 ETH`);
    console.log(`- Owner: ${deployer.address}`);
    console.log(`- Virtual ETH: ${ethers.formatEther(initialSettings.virtualEth)} ETH`);
    console.log(`- Bonding Target: ${ethers.formatEther(initialSettings.bondingTarget)} ETH`);
    console.log(`- Min Contribution: ${ethers.formatEther(initialSettings.minContribution)} ETH`);

    // Initialize the Factory
    const tx = await factory.initialize(
        ethers.parseEther("0.0001"), // 0.0001 ETH deployment fee
        deployer.address,            // Owner
        tokenImplAddress,
        bondingCurveImplAddress,
        lockContractAddress,
        initialSettings
    );

    console.log(`\n📤 Transaction sent: ${tx.hash}`);
    console.log('⏳ Waiting for confirmation...');

    const receipt = await tx.wait();
    console.log(`✅ Factory initialized! Block: ${receipt.blockNumber}`);

    // Verify initialization
    const owner = await factory.owner();
    const deploymentFee = await factory.getDeploymentFee();

    console.log('\n🎉 Initialization Complete!');
    console.log(`✅ Factory Owner: ${owner}`);
    console.log(`✅ Deployment Fee: ${ethers.formatEther(deploymentFee)} ETH`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Error:', error);
        process.exit(1);
    }); 