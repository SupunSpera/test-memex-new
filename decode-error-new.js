const { ethers } = require('ethers');

async function checkNewToken() {
  try {
    const provider = new ethers.JsonRpcProvider('https://api.testnet.abs.xyz');
    
    // New token info from logs
    const bondingCurveAddress = '0x8C58Fa91774526f25E605E4a912F8d2779d7A179';
    const tokenAddress = '0x1e9D8056F7c76f951f7aE20ceB6A6F22FE7Baee2';
    
    console.log('🔍 Checking new token deployment...');
    console.log('Token Address:', tokenAddress);
    console.log('Bonding Curve Address:', bondingCurveAddress);
    
    // Check if this is the old or new contract by checking available functions
    const bondingCurveABI = [
      'function currentPhase() external view returns (uint8)',
      'function ethReserve() external view returns (uint256)',
      'function tokenReserve() external view returns (uint256)',
      'function totalETHCollected() external view returns (uint256)',
      'function totalPreBondingContributions() external view returns (uint256)', // Old contract
      'function getBondingCurveSettings() external view returns (tuple(uint256 virtualEth, uint256 preBondingTarget, uint256 bondingTarget, uint256 minContribution, uint24 poolFee, uint24 sellFee, address uniswapV3Factory, address positionManager, address weth, address feeTo))', // Old
      'function getBondingCurveSettings() external view returns (tuple(uint256 virtualEth, uint256 bondingTarget, uint256 minContribution, uint24 poolFee, uint24 sellFee, address uniswapV3Factory, address positionManager, address weth, address feeTo))' // New
    ];
    
    const contract = new ethers.Contract(bondingCurveAddress, bondingCurveABI, provider);
    
    try {
      // Try to call old contract function
      const oldContributions = await contract.totalPreBondingContributions();
      console.log('❌ This is an OLD contract! totalPreBondingContributions:', ethers.formatEther(oldContributions));
      console.log('❌ You need to redeploy the contracts with the new simplified code');
      
      const phase = await contract.currentPhase();
      console.log('Current Phase:', phase.toString(), phase.toString() === '0' ? '(PreBonding)' : phase.toString() === '1' ? '(Bonding)' : '(Finalized)');
      
    } catch (e) {
      console.log('✅ This appears to be a NEW contract (no totalPreBondingContributions function)');
      
      const phase = await contract.currentPhase();
      console.log('Current Phase:', phase.toString(), phase.toString() === '0' ? '(Bonding)' : '(Finalized)');
      
      const ethReserve = await contract.ethReserve();
      const tokenReserve = await contract.tokenReserve();
      
      console.log('ETH Reserve:', ethers.formatEther(ethReserve), 'ETH');
      console.log('Token Reserve:', ethers.formatUnits(tokenReserve, 18), 'tokens');
    }
    
  } catch (error) {
    console.error('Error checking token:', error.message);
  }
}

checkNewToken(); 