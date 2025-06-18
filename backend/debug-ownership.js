require('dotenv').config();
const { ethers } = require('ethers');

async function debugOwnership() {
  try {
    // Load configuration from environment variables
    const rpcUrl = process.env.RPC_URL || 'https://api.testnet.abs.xyz';
    const adminMnemonic = process.env.ADMIN_MNEMONIC || process.env.ADMIN_PRIVATE_KEY;
    const factoryAddress = process.env.FACTORY_ADDRESS;
    
    if (!adminMnemonic) {
      throw new Error('❌ ADMIN_MNEMONIC or ADMIN_PRIVATE_KEY must be set in .env file');
    }
    
    if (!factoryAddress) {
      throw new Error('❌ FACTORY_ADDRESS must be set in .env file');
    }
    
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = adminMnemonic.includes(' ') 
      ? ethers.Wallet.fromPhrase(adminMnemonic, provider)
      : new ethers.Wallet(adminMnemonic, provider);
    
    console.log('🔗 Connected to Abstract testnet');
    console.log(`Network: ${rpcUrl}`);
    console.log(`Factory: ${factoryAddress}`);
    
    const factoryABI = [
      "function owner() external view returns (address)",
      "function pendingOwner() external view returns (address)",
      "function getDeploymentFee() external view returns (uint256)",
      "function updateDeploymentFee(uint256 newFee) external"
    ];
    
    const factory = new ethers.Contract(factoryAddress, factoryABI, provider);
    
    console.log('\n📋 Contract Ownership Info:');
    
    try {
      const currentOwner = await factory.owner();
      console.log(`Current Owner: ${currentOwner}`);
      
      try {
        const pendingOwner = await factory.pendingOwner();
        console.log(`Pending Owner: ${pendingOwner}`);
      } catch (e) {
        console.log('Pending Owner: Not available (function may not exist)');
      }
      
      console.log('\n🔑 Your Wallet Info:');
      console.log(`Your Wallet Address: ${wallet.address}`);
      
      console.log('\n✅ Ownership Check:');
      const isOwner = currentOwner.toLowerCase() === wallet.address.toLowerCase();
      console.log(`Are you the owner? ${isOwner ? '✅ YES' : '❌ NO'}`);
      
      if (isOwner) {
        console.log('\n🎉 Great! You are the owner. Testing admin functions...');
        
        // Test if we can read the deployment fee
        const deploymentFee = await factory.getDeploymentFee();
        console.log(`Current Deployment Fee: ${ethers.formatEther(deploymentFee)} ETH`);
        
        // Test if the function exists by checking the interface
        const factoryWithWallet = factory.connect(wallet);
        
        console.log("Let's check if the contract has the updateDeploymentFee function...");
        try {
          // Just estimate gas, don't actually call
          await factoryWithWallet.updateDeploymentFee.estimateGas(deploymentFee);
          console.log('✅ Function exists and should work');
        } catch (error) {
          console.log(`❌ Function test failed: ${error.message}`);
        }
        
        console.log('\n📊 Additional Contract Info:');
        console.log(`Current Deployment Fee: ${ethers.formatEther(deploymentFee)} ETH`);
        
      } else {
        console.log('\n❌ You are not the owner of this contract.');
        console.log(`Expected: ${wallet.address}`);
        console.log(`Actual: ${currentOwner}`);
      }
      
    } catch (error) {
      console.log(`❌ Failed to get ownership info: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    if (error.message.includes('.env')) {
      console.log('\n💡 Make sure to create a .env file in the backend directory with:');
      console.log('FACTORY_ADDRESS=0x8dC6856f34dD949Ab3D7B4141E3D86DC711bFB0F');
      console.log('ADMIN_MNEMONIC=your twelve word mnemonic phrase here');
    }
  }
}

debugOwnership(); 