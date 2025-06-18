# Memex Contracts - Abstract L2 Deployment Guide

This guide will help you deploy the Memex bonding curve meme coin launchpad contracts to Abstract L2.

## Prerequisites

1. **Node.js** (v16 or higher)
2. **Wallet with ETH** on Abstract testnet/mainnet
3. **API Keys** for block explorer verification (optional)

## Abstract Network Information

### Abstract Mainnet
- **Chain ID**: 2741
- **RPC URL**: https://api.mainnet.abs.xyz
- **Explorer**: https://abscan.org
- **Currency**: ETH

### Abstract Testnet  
- **Chain ID**: 11124
- **RPC URL**: https://api.testnet.abs.xyz
- **Explorer**: https://sepolia.abscan.org
- **Currency**: ETH

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory with the following variables:

```bash
# Wallet Configuration
MNEMONIC="your twelve word mnemonic phrase here"

# Abstract Block Explorer API Key (for contract verification)
ABSTRACT_SCAN_KEY="your_abstract_scan_api_key"

# Other Network API Keys (optional)
ETHERSCAN_KEY="your_etherscan_api_key"
BSCSCAN_KEY="your_bscscan_api_key"
ARBISCAN_KEY="your_arbiscan_api_key"
BASESCAN_KEY="your_basescan_api_key"
BLASTSCAN_KEY="your_blastscan_api_key"
LINEASCAN_KEY="your_lineascan_api_key"

# RPC Provider Keys (optional, for backup RPC endpoints)
INFURA_KEY="your_infura_project_id"
ANKR_KEY="your_ankr_api_key"

# Gas Reporting (optional)
CMCKEY="your_coinmarketcap_api_key"
```

### 3. Deploy to Abstract Testnet
```bash
npm run abstract-testnet:deploy
```

### 4. Verify Contracts on Abstract Testnet
```bash
npm run abstract-testnet:verify
```

### 5. Deploy to Abstract Mainnet (when ready)
```bash
npm run abstract:deploy
npm run abstract:verify
```

## Contract Addresses on Abstract

### 🚀 Current Working Deployment (Abstract Testnet)

**Status**: ✅ **DEPLOYED & FUNCTIONAL**

```bash
FACTORY_ADDRESS=0x8dC6856f34dD949Ab3D7B4141E3D86DC711bFB0F
BONDING_CURVE_ADDRESS=0x48e4aC21Af1781168497Aa58f780D9A780fB408a
LOCK_ADDRESS=0xF3A7c1282778AA89730089A9E7d25246fF88F3f0
TOKEN_IMPLEMENTATION_ADDRESS=0x3Fe4C492BDB603214B6b616ddADdA0ea2B773009
FOUNDRY_ADDRESS=0x21870d9fFA7428431010ef77400Fb88Be2BB2E56
```

**Owner**: `0x8b3CA5BaB7E1ff6092F30F4063a3305bf3983a7c`  
**Deployment Fee**: 0.0001 ETH  
**Network**: Abstract Testnet (Chain ID: 11124)

**Important Notes**:
- Factory contract required modification (commented out `_disableInitializers()`)
- All contracts are initialized and ready for use
- Admin functions are working properly
- Ready for production frontend integration

### Deployment Files Location
- `deployments/abstract-testnet/` (for testnet)
- `deployments/abstract/` (for mainnet)

## Key Features Configured for Abstract

✅ **Uniswap V3 Integration**: Configured with Abstract's official Uniswap V3 deployment
✅ **WETH Support**: Uses Abstract's wrapped ETH contract
✅ **Bonding Curve**: Automated market making with constant product formula
✅ **LP Locking**: 10-year LP token locking for security
✅ **Fee Collection**: Platform fee collection for administrators
✅ **Gas Optimization**: Optimized for Abstract's lower gas costs

## Configuration Details

### Bonding Curve Parameters
- **Virtual ETH**: 5 ETH
- **Pre-bonding Target**: 5 ETH
- **Bonding Target**: 30 ETH
- **Minimum Contribution**: 0.001 ETH
- **Sell Fee**: 3%
- **Pool Fee**: 0.3% (3000)

### Deployment Fees
- **Testnet**: 0.0001 ETH per token deployment
- **Mainnet**: 0.001 ETH per token deployment

## Testing

Run the test suite to ensure everything works:
```bash
npm run test
```

## Troubleshooting

### Common Issues

1. **"Insufficient funds" error**
   - Ensure your wallet has enough ETH for deployment
   - Testnet ETH can be obtained from Abstract faucets

2. **"Network not supported" error**
   - Check your `.env` configuration
   - Ensure you're using the correct RPC URLs

3. **Contract verification fails**
   - Check your `ABSTRACT_SCAN_KEY` in `.env`
   - Try verification again after a few minutes

### Getting Abstract Testnet ETH
1. Visit Abstract testnet faucets
2. Bridge ETH from Ethereum Sepolia testnet
3. Use Abstract's official bridge

## Next Steps

After successful deployment:

1. **Update DApp**: Copy deployment files to your frontend application
2. **Test Functionality**: Create test tokens and verify bonding curve behavior
3. **Configure Frontend**: Update contract addresses in your UI
4. **Set Platform Fees**: Configure your desired fee collection

## Support

For issues specific to Abstract L2:
- Abstract Documentation: https://docs.abs.xyz
- Abstract Discord: [Link to Abstract community]

For Memex contract issues:
- Create an issue in the repository
- Check existing documentation

## Contract Architecture

The system deploys these contracts:
- **Foundry**: Main factory deployer
- **Factory**: Creates token and bonding curve instances  
- **TokenImplementation**: ERC20 token template
- **BondingCurve**: Handles token trading and bonding curve logic
- **Lock**: Manages LP token locking for security 