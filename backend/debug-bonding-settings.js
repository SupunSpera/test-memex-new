const { ethers } = require('ethers');
require('dotenv').config();

async function debugBondingSettings() {
  const rpcUrl = process.env.RPC_URL || process.env.ABSTRACT_TESTNET_RPC_URL || 'https://api.testnet.abs.xyz';
  console.log('Using RPC URL:', rpcUrl);
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const factoryABI = [
    'function owner() external view returns (address)',
    'function getBondingCurveSettings() external view returns (tuple(uint256 virtualEth, uint256 preBondingTarget, uint256 bondingTarget, uint256 minContribution, uint24 poolFee, uint24 sellFee, address feeTo, address uniswapV3Factory, address weth, address positionManager))'
  ];
  
  const factory = new ethers.Contract(process.env.FACTORY_ADDRESS, factoryABI, provider);
  
  try {
    console.log('🔍 Debugging Factory Contract');
    console.log('Factory Address:', process.env.FACTORY_ADDRESS);
    
    const owner = await factory.owner();
    console.log('Current Owner:', owner);
    
    // Get wallet from mnemonic or private key
    const adminKey = process.env.ADMIN_PRIVATE_KEY || process.env.ADMIN_MNEMONIC;
    const wallet = adminKey.includes(' ') ? 
      ethers.Wallet.fromPhrase(adminKey) : 
      new ethers.Wallet(adminKey);
    console.log('Admin Wallet:', wallet.address);
    console.log('Owner Match:', owner.toLowerCase() === wallet.address.toLowerCase());
    
    // Get current settings
    const settings = await factory.getBondingCurveSettings();
    console.log('\n📊 Current Settings:');
    console.log('- virtualEth:', ethers.formatEther(settings.virtualEth));
    console.log('- preBondingTarget:', ethers.formatEther(settings.preBondingTarget));
    console.log('- bondingTarget:', ethers.formatEther(settings.bondingTarget));
    console.log('- minContribution:', ethers.formatEther(settings.minContribution));
    console.log('- poolFee:', settings.poolFee.toString());
    console.log('- sellFee:', settings.sellFee.toString());
    console.log('- feeTo:', settings.feeTo);
    console.log('- uniswapV3Factory:', settings.uniswapV3Factory);
    console.log('- weth:', settings.weth);
    console.log('- positionManager:', settings.positionManager);
    
    // Test the validation logic
    console.log('\n🧮 Validation Check:');
    const virtualEth = 2.0;
    const calculatedPreBondingTarget = virtualEth * 0.2;
    const bondingTarget = 50.0;
    console.log(`virtualEth: ${virtualEth} ETH`);
    console.log(`calculated preBondingTarget: ${calculatedPreBondingTarget} ETH (20% of virtualEth)`);
    console.log(`bondingTarget: ${bondingTarget} ETH`);
    console.log(`Validation (bondingTarget > preBondingTarget): ${bondingTarget > calculatedPreBondingTarget ? '✅ PASS' : '❌ FAIL'}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code) {
      console.error('Error Code:', error.code);
    }
  }
}

debugBondingSettings().catch(console.error); 