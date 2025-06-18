require('dotenv').config();
const { ethers } = require('ethers');

async function findDeployments() {
  try {
    // Load configuration from environment variables
    const rpcUrl = process.env.RPC_URL || 'https://api.testnet.abs.xyz';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    console.log('🔍 Finding Contract Deployments...');
    console.log(`Network: ${rpcUrl}`);
    
    // Contract addresses to check
    const addresses = {
      Factory: process.env.FACTORY_ADDRESS,
      BondingCurve: process.env.BONDING_CURVE_ADDRESS,
      Lock: process.env.LOCK_ADDRESS,
      TokenImplementation: process.env.TOKEN_IMPLEMENTATION_ADDRESS,
      Foundry: process.env.FOUNDRY_ADDRESS
    };
    
    console.log('\n📋 Checking Contract Deployments:');
    
    for (const [name, address] of Object.entries(addresses)) {
      if (!address) {
        console.log(`❌ ${name}: Not set in environment`);
        continue;
      }
      
      try {
        // Check if address has code (is a contract)
        const code = await provider.getCode(address);
        const hasCode = code !== '0x';
        
        if (hasCode) {
          console.log(`✅ ${name}: ${address} (Deployed)`);
          
          // Try to get additional info based on contract type
          if (name === 'Factory') {
            try {
              const factoryABI = [
                "function owner() external view returns (address)",
                "function getDeploymentFee() external view returns (uint256)"
              ];
              const factory = new ethers.Contract(address, factoryABI, provider);
              const owner = await factory.owner();
              const fee = await factory.getDeploymentFee();
              
              console.log(`    Owner: ${owner}`);
              console.log(`    Deployment Fee: ${ethers.formatEther(fee)} ETH`);
              
              if (owner === '0x0000000000000000000000000000000000000000') {
                console.log(`    ⚠️  Status: Not initialized`);
              } else {
                console.log(`    ✅ Status: Initialized`);
              }
            } catch (e) {
              console.log(`    ⚠️  Could not read Factory details: ${e.message}`);
            }
          }
          
        } else {
          console.log(`❌ ${name}: ${address} (No code - not deployed)`);
        }
        
      } catch (error) {
        console.log(`❌ ${name}: ${address} (Error: ${error.message})`);
      }
    }
    
    // If no addresses are set, provide helpful message
    const hasAnyAddress = Object.values(addresses).some(addr => addr);
    if (!hasAnyAddress) {
      console.log('\n💡 No contract addresses found in environment variables.');
      console.log('Make sure to create a .env file with:');
      console.log('FACTORY_ADDRESS=0x...');
      console.log('BONDING_CURVE_ADDRESS=0x...');
      console.log('LOCK_ADDRESS=0x...');
      console.log('TOKEN_IMPLEMENTATION_ADDRESS=0x...');
      console.log('FOUNDRY_ADDRESS=0x...');
    }
    
    // Check network info
    console.log('\n🌐 Network Information:');
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    console.log(`Network Name: ${network.name}`);
    console.log(`Chain ID: ${network.chainId}`);
    console.log(`Current Block: ${blockNumber}`);
    
  } catch (error) {
    console.error('❌ Find deployments failed:', error.message);
    console.log('\n💡 Make sure your RPC_URL is correct in the .env file');
  }
}

findDeployments(); 