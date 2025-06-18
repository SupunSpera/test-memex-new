require('dotenv').config();
const { ethers } = require('ethers');

async function initializeFactory() {
  try {
    // Load configuration from environment variables
    const rpcUrl = process.env.RPC_URL || 'https://api.testnet.abs.xyz';
    const adminMnemonic = process.env.ADMIN_MNEMONIC || process.env.ADMIN_PRIVATE_KEY;
    
    if (!adminMnemonic) {
      throw new Error('❌ ADMIN_MNEMONIC or ADMIN_PRIVATE_KEY must be set in .env file');
    }
    
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = adminMnemonic.includes(' ') 
      ? ethers.Wallet.fromPhrase(adminMnemonic, provider)
      : new ethers.Wallet(adminMnemonic, provider);
    
    console.log('🔧 Initializing Factory contract...');
    console.log(`Network: ${rpcUrl}`);
    console.log(`Your address: ${wallet.address}`);
    
    // Load contract addresses from environment
    const addresses = {
      Factory: process.env.FACTORY_ADDRESS,
      BondingCurve: process.env.BONDING_CURVE_ADDRESS,
      Lock: process.env.LOCK_ADDRESS,
      TokenImplementation: process.env.TOKEN_IMPLEMENTATION_ADDRESS,
      Foundry: process.env.FOUNDRY_ADDRESS
    };
    
    // Validate required addresses
    if (!addresses.Factory) {
      throw new Error('❌ FACTORY_ADDRESS must be set in .env file');
    }
    if (!addresses.BondingCurve) {
      throw new Error('❌ BONDING_CURVE_ADDRESS must be set in .env file');
    }
    if (!addresses.Lock) {
      throw new Error('❌ LOCK_ADDRESS must be set in .env file');
    }
    if (!addresses.TokenImplementation) {
      throw new Error('❌ TOKEN_IMPLEMENTATION_ADDRESS must be set in .env file');
    }
    
    console.log(`\n📋 Using Contract Addresses:`);
    console.log(`Factory: ${addresses.Factory}`);
    console.log(`BondingCurve: ${addresses.BondingCurve}`);
    console.log(`Lock: ${addresses.Lock}`);
    console.log(`TokenImplementation: ${addresses.TokenImplementation}`);
    console.log(`Foundry: ${addresses.Foundry || 'Not set'}`);
    
    const factoryABI = [
      "function initialize(uint256 factoryFees, address owner, address tokenImpl, address bondingCurveImpl, address lockContractAddr, tuple(uint256 virtualEth, uint256 preBondingTarget, uint256 bondingTarget, uint256 minContribution, uint24 poolFee, uint24 sellFee, address uniswapV3Factory, address positionManager, address weth, address feeTo) initialSettings) external",
      "function owner() external view returns (address)",
      "function getDeploymentFee() external view returns (uint256)"
    ];
    
    const factory = new ethers.Contract(addresses.Factory, factoryABI, wallet);
    
    // Check if already initialized
    try {
      const currentOwner = await factory.owner();
      if (currentOwner !== '0x0000000000000000000000000000000000000000') {
        console.log(`✅ Factory already initialized with owner: ${currentOwner}`);
        const deploymentFee = await factory.getDeploymentFee();
        console.log(`Current deployment fee: ${ethers.formatEther(deploymentFee)} ETH`);
        return;
      }
    } catch (e) {
      console.log('Factory not initialized yet, proceeding...');
    }
    
    // Initial settings for bonding curve (you can adjust these)
    const initialSettings = {
      virtualEth: ethers.parseEther("1.0"),        // 1 ETH virtual liquidity
      preBondingTarget: ethers.parseEther("0.2"),  // Will be calculated as 20% of virtualEth
      bondingTarget: ethers.parseEther("24.0"),    // 24 ETH bonding target
      minContribution: ethers.parseEther("0.001"), // 0.001 ETH minimum contribution
      poolFee: 3000,                               // 0.3% pool fee (3000 = 0.3%)
      sellFee: 100,                                // 1% sell fee (100 = 1%)
      uniswapV3Factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984", // Uniswap V3 Factory
      positionManager: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",   // Uniswap V3 Position Manager on Abstract testnet
      weth: "0x4200000000000000000000000000000000000006",  // WETH on Abstract testnet
      feeTo: wallet.address                        // Fee recipient (your address)
    };
    
    console.log('\n🚀 Initializing Factory with:');
    console.log(`- Factory Fee: 0.001 ETH`);
    console.log(`- Owner: ${wallet.address}`);
    console.log(`- Token Implementation: ${addresses.TokenImplementation}`);
    console.log(`- Bonding Curve Implementation: ${addresses.BondingCurve}`);
    console.log(`- Lock Contract: ${addresses.Lock}`);
    console.log(`- Virtual ETH: ${ethers.formatEther(initialSettings.virtualEth)} ETH`);
    console.log(`- Bonding Target: ${ethers.formatEther(initialSettings.bondingTarget)} ETH`);
    console.log(`- Min Contribution: ${ethers.formatEther(initialSettings.minContribution)} ETH`);
    
    // Call initialize function
    const tx = await factory.initialize(
      ethers.parseEther("0.001"), // 0.001 ETH deployment fee
      wallet.address,              // Owner
      addresses.TokenImplementation,
      addresses.BondingCurve,
      addresses.Lock,
      initialSettings
    );
    
    console.log(`\n📤 Transaction sent: ${tx.hash}`);
    console.log('⏳ Waiting for confirmation...');
    
    const receipt = await tx.wait();
    console.log(`✅ Factory initialized! Block: ${receipt.blockNumber}`);
    
    // Verify initialization
    const newOwner = await factory.owner();
    const deploymentFee = await factory.getDeploymentFee();
    
    console.log('\n🎉 Initialization Complete!');
    console.log(`✅ Factory Owner: ${newOwner}`);
    console.log(`✅ Deployment Fee: ${ethers.formatEther(deploymentFee)} ETH`);
    console.log(`✅ You are the owner: ${newOwner.toLowerCase() === wallet.address.toLowerCase()}`);
    
    console.log('\n📝 Ready for backend integration!');
    
  } catch (error) {
    console.error('❌ Initialization failed:', error.message);
    if (error.message.includes('.env')) {
      console.log('\n💡 Make sure to create a .env file in the backend directory with:');
      console.log('FACTORY_ADDRESS=0x8dC6856f34dD949Ab3D7B4141E3D86DC711bFB0F');
      console.log('BONDING_CURVE_ADDRESS=0x48e4aC21Af1781168497Aa58f780D9A780fB408a');
      console.log('LOCK_ADDRESS=0xF3A7c1282778AA89730089A9E7d25246fF88F3f0');
      console.log('TOKEN_IMPLEMENTATION_ADDRESS=0x3Fe4C492BDB603214B6b616ddADdA0ea2B773009');
      console.log('ADMIN_MNEMONIC=your twelve word mnemonic phrase here');
    }
    if (error.data) {
      console.error('Error data:', error.data);
    }
  }
}

initializeFactory(); 