const { ethers } = require('ethers');

// Transaction data from the error
const txData = "0x293c9b780000000000000000000000000000000000000000000000001bc16d674ec80000000000000000000000000000000000000000000000000000058d15e176280000000000000000000000000000000000000000000000000002b5e3af16b18800000000000000000000000000000000000000000000000000000000d12f0c4c60000000000000000000000000000000000000000000000000000000000000000bb800000000000000000000000000000000000000000000000000000000000000c80000000000000000000000008a487fc410689d799246fb373f15cf66cef135f60000000000000000000000001f98431c8ad98523631ae4a59f267346ea31f9840000000000000000000000004200000000000000000000000000000000000006";

// Function ABI for updateBondingCurveSettings (exact struct from IFactory.sol)
const functionABI = [
  "function updateBondingCurveSettings(tuple(uint256 virtualEth, uint256 preBondingTarget, uint256 bondingTarget, uint256 minContribution, uint24 poolFee, uint24 sellFee, address uniswapV3Factory, address positionManager, address weth, address feeTo) newSettings) external"
];

async function decodeTransaction() {
  try {
    console.log('🔍 Decoding Transaction Data');
    console.log('Raw Data:', txData);
    
    // Extract function selector (first 4 bytes)
    const functionSelector = txData.slice(0, 10);
    console.log('Function Selector:', functionSelector);
    
    const iface = new ethers.Interface(functionABI);
    
    // Try to get the function from selector
    try {
      const func = iface.getFunction(functionSelector);
      console.log('Found function:', func.name);
    } catch (e) {
      console.log('Function not found, trying manual decode...');
    }
    
    const decoded = iface.parseTransaction({ data: txData });
    
    console.log('\n📋 Function:', decoded.name);
    console.log('\n📊 Decoded Parameters:');
    
    const settings = decoded.args[0];
    console.log('- virtualEth:', ethers.formatEther(settings.virtualEth), 'ETH');
    console.log('- preBondingTarget:', ethers.formatEther(settings.preBondingTarget), 'ETH');
    console.log('- bondingTarget:', ethers.formatEther(settings.bondingTarget), 'ETH');
    console.log('- minContribution:', ethers.formatEther(settings.minContribution), 'ETH');
    console.log('- poolFee:', settings.poolFee.toString());
    console.log('- sellFee:', settings.sellFee.toString());
    console.log('- uniswapV3Factory:', settings.uniswapV3Factory);
    console.log('- positionManager:', settings.positionManager);
    console.log('- weth:', settings.weth);
    console.log('- feeTo:', settings.feeTo);
    
    // Validate the logic that would be executed in the contract
    console.log('\n🧮 Contract Validation Logic:');
    const virtualEthValue = parseFloat(ethers.formatEther(settings.virtualEth));
    const calculatedPreBondingTarget = virtualEthValue * 0.2;
    const bondingTargetValue = parseFloat(ethers.formatEther(settings.bondingTarget));
    
    console.log(`Virtual ETH: ${virtualEthValue} ETH`);
    console.log(`Contract will set preBondingTarget to: ${calculatedPreBondingTarget} ETH (20% of virtualEth)`);
    console.log(`Bonding Target: ${bondingTargetValue} ETH`);
    console.log(`Validation (bondingTarget > calculatedPreBondingTarget): ${bondingTargetValue > calculatedPreBondingTarget ? '✅ PASS' : '❌ FAIL'}`);
    
    if (bondingTargetValue <= calculatedPreBondingTarget) {
      console.log('\n❌ This would trigger InvalidDeploymentParameters() revert');
    } else {
      console.log('\n✅ Validation should pass. The issue might be elsewhere.');
    }
    
  } catch (error) {
    console.error('❌ Error decoding transaction:', error.message);
  }
}

decodeTransaction(); 