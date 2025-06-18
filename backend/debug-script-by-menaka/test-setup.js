require('dotenv').config();
const { ethers } = require('ethers');

async function testSetup() {
  try {
    console.log('🧪 Testing Backend Setup...\n');
    
    // Check environment variables
    console.log('📋 Environment Variables:');
    console.log(`- NODE_ENV: ${process.env.NODE_ENV || '❌ Not set'}`);
    console.log(`- PORT: ${process.env.PORT || '❌ Not set'}`);
    console.log(`- MongoDB URI: ${process.env.MONGODB_URI ? '✅ Set' : '❌ Not set'}`);
    console.log(`- RPC URL: ${process.env.RPC_URL || 'Using default: https://api.testnet.abs.xyz'}`);
    console.log(`- Chain ID: ${process.env.CHAIN_ID || '❌ Not set'}`);
    console.log(`- Factory Address: ${process.env.FACTORY_ADDRESS ? '✅ Set' : '❌ Not set'}`);
    console.log(`- Admin Mnemonic: ${process.env.ADMIN_MNEMONIC ? '✅ Set' : '❌ Not set'}`);
    console.log(`- Admin Private Key: ${process.env.ADMIN_PRIVATE_KEY ? '✅ Set' : '❌ Not set'}`);
    
    if (!process.env.ADMIN_MNEMONIC && !process.env.ADMIN_PRIVATE_KEY) {
      console.log('\n❌ Error: Either ADMIN_MNEMONIC or ADMIN_PRIVATE_KEY must be set');
      return;
    }
    
    if (!process.env.FACTORY_ADDRESS) {
      console.log('\n❌ Error: FACTORY_ADDRESS must be set');
      return;
    }
    
    // Test blockchain connection
    console.log('\n🔗 Testing Blockchain Connection:');
    const rpcUrl = process.env.RPC_URL || 'https://api.testnet.abs.xyz';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    try {
      const network = await provider.getNetwork();
      const blockNumber = await provider.getBlockNumber();
      console.log(`✅ Connected to ${network.name} (Chain ID: ${network.chainId})`);
      console.log(`✅ Current block: ${blockNumber}`);
    } catch (error) {
      console.log(`❌ Blockchain connection failed: ${error.message}`);
      return;
    }
    
    // Test wallet setup
    console.log('\n🔑 Testing Wallet Setup:');
    const adminMnemonic = process.env.ADMIN_MNEMONIC || process.env.ADMIN_PRIVATE_KEY;
    const wallet = adminMnemonic.includes(' ') 
      ? ethers.Wallet.fromPhrase(adminMnemonic, provider)
      : new ethers.Wallet(adminMnemonic, provider);
    
    console.log(`✅ Wallet address: ${wallet.address}`);
    
    const balance = await provider.getBalance(wallet.address);
    console.log(`✅ Wallet balance: ${ethers.formatEther(balance)} ETH`);
    
    if (balance < ethers.parseEther("0.001")) {
      console.log('⚠️  Warning: Low balance (< 0.001 ETH)');
    }
    
    // Test contract addresses
    console.log('\n📋 Contract Addresses:');
    const contracts = {
      'Factory': process.env.FACTORY_ADDRESS,
      'BondingCurve': process.env.BONDING_CURVE_ADDRESS,
      'Lock': process.env.LOCK_ADDRESS,
      'TokenImplementation': process.env.TOKEN_IMPLEMENTATION_ADDRESS,
      'Foundry': process.env.FOUNDRY_ADDRESS
    };
    
    for (const [name, address] of Object.entries(contracts)) {
      if (address) {
        try {
          const code = await provider.getCode(address);
          const hasCode = code !== '0x';
          console.log(`${hasCode ? '✅' : '❌'} ${name}: ${address} ${hasCode ? '(Has code)' : '(No code)'}`);
        } catch (error) {
          console.log(`❌ ${name}: ${address} (Error: ${error.message})`);
        }
      } else {
        console.log(`❌ ${name}: Not set`);
      }
    }
    
    // Test Factory contract
    console.log('\n🏭 Testing Factory Contract:');
    if (process.env.FACTORY_ADDRESS) {
      const factoryABI = [
        "function owner() external view returns (address)",
        "function getDeploymentFee() external view returns (uint256)"
      ];
      
      try {
        const factory = new ethers.Contract(process.env.FACTORY_ADDRESS, factoryABI, provider);
        const owner = await factory.owner();
        const fee = await factory.getDeploymentFee();
        
        console.log(`✅ Factory owner: ${owner}`);
        console.log(`✅ Deployment fee: ${ethers.formatEther(fee)} ETH`);
        console.log(`✅ You are owner: ${owner.toLowerCase() === wallet.address.toLowerCase() ? 'YES' : 'NO'}`);
        
      } catch (error) {
        console.log(`❌ Factory test failed: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Setup test complete!');
    
  } catch (error) {
    console.error('❌ Setup test failed:', error.message);
    console.log('\n💡 Make sure to create a .env file in the backend directory with all required variables.');
  }
}

testSetup(); 