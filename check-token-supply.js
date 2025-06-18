const { ethers } = require('ethers');

async function checkTokenSupply() {
  try {
    const provider = new ethers.JsonRpcProvider('https://api.testnet.abs.xyz');
    
    // Token addresses
    const bondingCurveAddress = '0x8C58Fa91774526f25E605E4a912F8d2779d7A179';
    const tokenAddress = '0x1e9D8056F7c76f951f7aE20ceB6A6F22FE7Baee2';
    
    const tokenABI = [
      'function name() external view returns (string)',
      'function symbol() external view returns (string)',
      'function totalSupply() external view returns (uint256)',
      'function balanceOf(address account) external view returns (uint256)'
    ];
    
    const token = new ethers.Contract(tokenAddress, tokenABI, provider);
    
    console.log('🔍 Checking token supply distribution...');
    
    const name = await token.name();
    const symbol = await token.symbol();
    const totalSupply = await token.totalSupply();
    const bondingCurveBalance = await token.balanceOf(bondingCurveAddress);
    
    console.log(`Token: ${name} (${symbol})`);
    console.log(`Total Supply: ${ethers.formatUnits(totalSupply, 18)} tokens`);
    console.log(`Bonding Curve Balance: ${ethers.formatUnits(bondingCurveBalance, 18)} tokens`);
    console.log(`Missing Tokens: ${ethers.formatUnits(totalSupply - bondingCurveBalance, 18)} tokens`);
    
    if (bondingCurveBalance == 0n) {
      console.log('❌ PROBLEM: No tokens in bonding curve! The minting failed.');
      console.log('This means the mintTotalSupply call in deployment failed.');
    } else if (bondingCurveBalance == totalSupply) {
      console.log('✅ All tokens are correctly in the bonding curve');
    } else {
      console.log('⚠️  Some tokens are missing from bonding curve');
    }
    
  } catch (error) {
    console.error('Error checking token supply:', error.message);
  }
}

checkTokenSupply(); 