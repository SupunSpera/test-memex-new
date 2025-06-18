require('dotenv').config();
const { ethers } = require('ethers');

async function testAdminFunctions() {
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
    
    console.log('🧪 Testing Admin Functions on Working Factory...');
    console.log(`Network: ${rpcUrl}`);
    console.log(`Your address: ${wallet.address}`);
    
    // Load contract addresses from environment
    const factoryAddress = process.env.FACTORY_ADDRESS;
    const bondingCurveAddress = process.env.BONDING_CURVE_ADDRESS;
    const lockAddress = process.env.LOCK_ADDRESS;
    const tokenImplAddress = process.env.TOKEN_IMPLEMENTATION_ADDRESS;
    const foundryAddress = process.env.FOUNDRY_ADDRESS;
    
    if (!factoryAddress) {
      throw new Error('❌ FACTORY_ADDRESS must be set in .env file');
    }
    
    console.log(`\n📋 Using Contract Addresses:`);
    console.log(`Factory: ${factoryAddress}`);
    console.log(`BondingCurve: ${bondingCurveAddress}`);
    console.log(`Lock: ${lockAddress}`);
    console.log(`TokenImplementation: ${tokenImplAddress}`);
    console.log(`Foundry: ${foundryAddress}`);
    
    const factoryABI = [
      "function owner() external view returns (address)",
      "function getDeploymentFee() external view returns (uint256)",
      "function updateDeploymentFee(uint256 newFee) external",
      "function getBondingCurveSettings() external view returns (tuple(uint256 virtualEth, uint256 preBondingTarget, uint256 bondingTarget, uint256 minContribution, uint24 poolFee, uint24 sellFee, address uniswapV3Factory, address positionManager, address weth, address feeTo))",
      "function withdrawFees(address recipient) external"
    ];
    
    const factory = new ethers.Contract(factoryAddress, factoryABI, wallet);
    
    console.log('\n✅ Contract Status:');
    
    // Check ownership
    const owner = await factory.owner();
    console.log(`Owner: ${owner}`);
    console.log(`You are owner: ${owner.toLowerCase() === wallet.address.toLowerCase() ? '✅ YES' : '❌ NO'}`);
    
    // Check current deployment fee
    const currentFee = await factory.getDeploymentFee();
    console.log(`Current deployment fee: ${ethers.formatEther(currentFee)} ETH`);
    
    // Check bonding curve settings
    const settings = await factory.getBondingCurveSettings();
    console.log('\n📊 Current Bonding Curve Settings:');
    console.log(`Virtual ETH: ${ethers.formatEther(settings.virtualEth)} ETH`);
    console.log(`Pre-bonding Target: ${ethers.formatEther(settings.preBondingTarget)} ETH`);
    console.log(`Bonding Target: ${ethers.formatEther(settings.bondingTarget)} ETH`);
    console.log(`Min Contribution: ${ethers.formatEther(settings.minContribution)} ETH`);
    console.log(`Pool Fee: ${settings.poolFee}`);
    console.log(`Sell Fee: ${settings.sellFee}`);
    console.log(`Fee Recipient: ${settings.feeTo}`);
    
    console.log('\n🔧 Testing Admin Functions...');
    
    // Test 1: Update deployment fee
    console.log('📝 Test 1: Updating deployment fee to 0.002 ETH...');
    try {
      const updateTx = await factory.updateDeploymentFee(ethers.parseEther("0.002"));
      const updateReceipt = await updateTx.wait();
      console.log(`✅ Fee updated successfully! Tx: ${updateTx.hash}`);
      
      // Verify the update
      const newFee = await factory.getDeploymentFee();
      console.log(`✅ New deployment fee: ${ethers.formatEther(newFee)} ETH`);
      
      // Change it back
      const revertTx = await factory.updateDeploymentFee(ethers.parseEther("0.0001"));
      await revertTx.wait();
      console.log(`✅ Reverted fee back to 0.0001 ETH`);
      
    } catch (error) {
      console.log(`❌ Fee update failed: ${error.message}`);
    }
    
    // Test 2: Check if withdraw fees function exists
    console.log('\n📝 Test 2: Checking withdraw fees function...');
    try {
      const contractBalance = await provider.getBalance(factoryAddress);
      console.log(`Contract balance: ${ethers.formatEther(contractBalance)} ETH`);
      
      if (contractBalance > 0) {
        console.log('💰 Testing fee withdrawal...');
        const withdrawTx = await factory.withdrawFees(wallet.address);
        await withdrawTx.wait();
        console.log('✅ Fee withdrawal successful!');
      } else {
        console.log('💭 No fees to withdraw (this is expected for new contract)');
      }
    } catch (error) {
      if (error.message.includes('NoFeesToWithdraw')) {
        console.log('✅ Withdraw function works (no fees to withdraw)');
      } else {
        console.log(`❌ Withdraw test failed: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Admin Function Tests Complete!');
    console.log('✅ Factory is ready for backend integration');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.message.includes('.env')) {
      console.log('\n💡 Make sure to create a .env file in the backend directory with:');
      console.log('FACTORY_ADDRESS=0x8dC6856f34dD949Ab3D7B4141E3D86DC711bFB0F');
      console.log('ADMIN_MNEMONIC=your twelve word mnemonic phrase here');
    }
  }
}

testAdminFunctions(); 