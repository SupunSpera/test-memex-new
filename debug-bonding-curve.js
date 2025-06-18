const { ethers } = require('ethers');

async function debugBondingCurve() {
  try {
    const provider = new ethers.JsonRpcProvider('https://api.testnet.abs.xyz');
    
    const bondingCurveAddress = '0x8C58Fa91774526f25E605E4a912F8d2779d7A179';
    const tokenAddress = '0x1e9D8056F7c76f951f7aE20ceB6A6F22FE7Baee2';
    
    const bondingCurveABI = [
      'function currentPhase() external view returns (uint8)',
      'function ethReserve() external view returns (uint256)',
      'function tokenReserve() external view returns (uint256)',
      'function totalETHCollected() external view returns (uint256)',
      'function token() external view returns (address)',
      'function isFinalized() external view returns (bool)',
      'function getBondingCurveSettings() external view returns (tuple(uint256 virtualEth, uint256 bondingTarget, uint256 minContribution, uint24 poolFee, uint24 sellFee, address uniswapV3Factory, address positionManager, address weth, address feeTo))'
    ];
    
    const tokenABI = [
      'function balanceOf(address account) external view returns (uint256)'
    ];
    
    const bondingCurve = new ethers.Contract(bondingCurveAddress, bondingCurveABI, provider);
    const token = new ethers.Contract(tokenAddress, tokenABI, provider);
    
    console.log('🔍 Debugging bonding curve state...');
    
    // Get bonding curve state
    const currentPhase = await bondingCurve.currentPhase();
    const ethReserve = await bondingCurve.ethReserve();
    const tokenReserve = await bondingCurve.tokenReserve();
    const totalETHCollected = await bondingCurve.totalETHCollected();
    const tokenFromContract = await bondingCurve.token();
    const isFinalized = await bondingCurve.isFinalized();
    
    // Get actual token balance
    const actualTokenBalance = await token.balanceOf(bondingCurveAddress);
    
    console.log('Contract State:');
    console.log(`- Current Phase: ${currentPhase} (${currentPhase.toString() === '0' ? 'Bonding' : 'Finalized'})`);
    console.log(`- ETH Reserve: ${ethers.formatEther(ethReserve)} ETH`);
    console.log(`- Token Reserve (contract): ${ethers.formatUnits(tokenReserve, 18)} tokens`);
    console.log(`- Token Balance (actual): ${ethers.formatUnits(actualTokenBalance, 18)} tokens`);
    console.log(`- Total ETH Collected: ${ethers.formatEther(totalETHCollected)} ETH`);
    console.log(`- Token Address in Contract: ${tokenFromContract}`);
    console.log(`- Expected Token Address: ${tokenAddress}`);
    console.log(`- Is Finalized: ${isFinalized}`);
    
    // Check if addresses match
    if (tokenFromContract.toLowerCase() === tokenAddress.toLowerCase()) {
      console.log('✅ Token addresses match');
    } else {
      console.log('❌ Token addresses DO NOT match!');
    }
    
    // The issue might be that tokenReserve is not being set correctly in initialize
    if (tokenReserve == 0n && actualTokenBalance > 0n) {
      console.log('❌ PROBLEM: tokenReserve is 0 but tokens exist in contract');
      console.log('This suggests the initialize() function did not set tokenReserve correctly');
      console.log('The contract may be using old initialization logic');
    }
    
    // Check settings
    try {
      const settings = await bondingCurve.getBondingCurveSettings();
      console.log('\nBonding Curve Settings:');
      console.log(`- Virtual ETH: ${ethers.formatEther(settings.virtualEth)} ETH`);
      console.log(`- Bonding Target: ${ethers.formatEther(settings.bondingTarget)} ETH`);
      console.log(`- Min Contribution: ${ethers.formatEther(settings.minContribution)} ETH`);
      console.log(`- Pool Fee: ${settings.poolFee}`);
      console.log(`- Sell Fee: ${settings.sellFee}`);
    } catch (e) {
      console.log('❌ Could not read settings:', e.message);
    }
    
  } catch (error) {
    console.error('Error debugging bonding curve:', error.message);
  }
}

debugBondingCurve(); 