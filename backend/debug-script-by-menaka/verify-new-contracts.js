require('dotenv').config();
const { ethers } = require('ethers');

async function verifyContracts() {
  try {
    // Load configuration from environment variables
    const rpcUrl = process.env.RPC_URL || 'https://api.testnet.abs.xyz';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    console.log('🔍 Verifying Contract Deployments...');
    console.log(`Network: ${rpcUrl}`);
    
    // Load contract addresses from environment
    const addresses = {
      Factory: process.env.FACTORY_ADDRESS,
      BondingCurve: process.env.BONDING_CURVE_ADDRESS,
      Lock: process.env.LOCK_ADDRESS,
      TokenImplementation: process.env.TOKEN_IMPLEMENTATION_ADDRESS,
      Foundry: process.env.FOUNDRY_ADDRESS
    };
    
    // Validate that addresses are set
    const missingAddresses = Object.entries(addresses)
      .filter(([name, address]) => !address)
      .map(([name]) => name);
    
    if (missingAddresses.length > 0) {
      console.log(`❌ Missing contract addresses: ${missingAddresses.join(', ')}`);
      console.log('\n💡 Make sure to set these in your .env file:');
      missingAddresses.forEach(name => {
        console.log(`${name.toUpperCase()}_ADDRESS=0x...`);
      });
      return;
    }
    
    console.log('\n📋 Contract Addresses to Verify:');
    Object.entries(addresses).forEach(([name, address]) => {
      console.log(`${name}: ${address}`);
    });
    
    console.log('\n🔍 Checking contract deployments...');
    
    const results = {};
    
    for (const [name, address] of Object.entries(addresses)) {
      try {
        const code = await provider.getCode(address);
        const hasCode = code !== '0x';
        
        if (hasCode) {
          console.log(`✅ ${name}: Contract deployed`);
          results[name] = { deployed: true, address };
        } else {
          console.log(`❌ ${name}: No contract code found`);
          results[name] = { deployed: false, address };
        }
      } catch (error) {
        console.log(`❌ ${name}: Error checking deployment - ${error.message}`);
        results[name] = { deployed: false, address, error: error.message };
      }
    }
    
    // Special verification for Factory contract
    if (results.Factory?.deployed) {
      console.log('\n🏭 Verifying Factory Contract...');
      try {
        const factoryABI = [
          "function owner() external view returns (address)",
          "function getDeploymentFee() external view returns (uint256)",
          "function getBondingCurveImplementation() external view returns (address)",
          "function getTokenImplementation() external view returns (address)",
          "function getLockContract() external view returns (address)"
        ];
        
        const factory = new ethers.Contract(addresses.Factory, factoryABI, provider);
        
        const owner = await factory.owner();
        const deploymentFee = await factory.getDeploymentFee();
        
        console.log(`✅ Factory Owner: ${owner}`);
        console.log(`✅ Deployment Fee: ${ethers.formatEther(deploymentFee)} ETH`);
        
        if (owner === '0x0000000000000000000000000000000000000000') {
          console.log('⚠️  Factory is deployed but NOT INITIALIZED');
          console.log('   Run: node backend/initialize-working-factory.js');
        } else {
          console.log('✅ Factory is initialized and ready');
          
          // Check if the implementations match
          try {
            const bondingCurveImpl = await factory.getBondingCurveImplementation();
            const tokenImpl = await factory.getTokenImplementation();
            const lockContract = await factory.getLockContract();
            
            console.log('\n📋 Factory Configuration:');
            console.log(`Bonding Curve Implementation: ${bondingCurveImpl}`);
            console.log(`Token Implementation: ${tokenImpl}`);
            console.log(`Lock Contract: ${lockContract}`);
            
            // Verify addresses match environment
            if (bondingCurveImpl.toLowerCase() !== addresses.BondingCurve?.toLowerCase()) {
              console.log('⚠️  Warning: Factory bonding curve implementation differs from env');
            }
            if (tokenImpl.toLowerCase() !== addresses.TokenImplementation?.toLowerCase()) {
              console.log('⚠️  Warning: Factory token implementation differs from env');
            }
            if (lockContract.toLowerCase() !== addresses.Lock?.toLowerCase()) {
              console.log('⚠️  Warning: Factory lock contract differs from env');
            }
          } catch (e) {
            console.log(`⚠️  Could not verify Factory configuration: ${e.message}`);
          }
        }
      } catch (error) {
        console.log(`❌ Factory verification failed: ${error.message}`);
      }
    }
    
    // Summary
    console.log('\n📊 Verification Summary:');
    const deployedCount = Object.values(results).filter(r => r.deployed).length;
    const totalCount = Object.keys(results).length;
    
    console.log(`Deployed Contracts: ${deployedCount}/${totalCount}`);
    
    if (deployedCount === totalCount) {
      console.log('🎉 All contracts are deployed successfully!');
      
      if (results.Factory?.deployed) {
        console.log('\n🚀 Next steps:');
        console.log('1. Make sure Factory is initialized');
        console.log('2. Test admin functions: node backend/test-admin-functions.js');
        console.log('3. Start your backend server');
      }
    } else {
      console.log('❌ Some contracts are missing. Check your deployment.');
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    console.log('\n💡 Make sure your .env file is properly configured');
  }
}

verifyContracts(); 