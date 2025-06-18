# Bonding Curve Smart Contracts

This repository contains the smart contracts for a decentralized bonding curve system with pre-bonding capabilities and eventual migration to Uniswap V3, featuring LP NFT locking for security.

## 🚀 Current Deployment Status

**Abstract Testnet - Working Deployment:**
- Factory: `0x8dC6856f34dD949Ab3D7B4141E3D86DC711bFB0F` ✅ Initialized & Owner Set
- BondingCurve: `0x48e4aC21Af1781168497Aa58f780D9A780fB408a` ✅ Implementation Ready
- Lock: `0xF3A7c1282778AA89730089A9E7d25246fF88F3f0` ✅ Deployed
- TokenImplementation: `0x3Fe4C492BDB603214B6b616ddADdA0ea2B773009` ✅ Ready
- Foundry: `0x21870d9fFA7428431010ef77400Fb88Be2BB2E56` ✅ Available

**Owner:** `0x8b3CA5BaB7E1ff6092F30F4063a3305bf3983a7c`  
**Network:** Abstract Testnet (Chain ID: 11124)  
**Deployment Fee:** 0.0001 ETH

## Overview

The system implements a bonding curve mechanism with the following key features:

-   Pre-bonding phase for initial token distribution
-   Active trading phase with constant product AMM formula
-   Automatic migration to Uniswap V3
-   LP NFT locking for long-term security
-   Minimal proxy pattern (EIP-1167) for gas-efficient deployment

## System Architecture

### Core Contracts

-   **Foundry**: Main deployer contract that manages system deployment
-   **Factory**: Handles deployment of token and bonding curve instances
-   **TokenImplementation**: ERC20 token with one-time mint capability
-   **BondingCurve**: Implements the bonding curve mechanism
-   **Lock**: Manages Uniswap V3 LP NFT locking and fee claims

### Libraries

-   **BondingMath**: Handles price calculations and fee computations
-   **UniswapPoolCreator**: Manages Uniswap V3 pool creation and position management

## Setup

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Copy the environment file:

```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:

-   Set deployment accounts and private keys
-   Add API keys for various networks
-   Configure network-specific variables

## Testing

Run the test suite:

```bash
npm run test
```

For gas reporting:

```bash
npm run test:gas
```

For coverage report:

```bash
npm run test:coverage
```

## Deployment

The system supports deployment to multiple networks. Use the appropriate command for your target network:

```bash
# Sepolia Testnet
npm run sepolia:deploy
npm run sepolia:verify

# BSC
npm run bsc:deploy
npm run bsc:verify

# Base
npm run base:deploy
npm run base:verify

# Blast
npm run blast:deploy
npm run blast:verify

# Linea
npm run linea:deploy
npm run linea:verify

# Arbitrum
npm run arbitrum:deploy
npm run arbitrum:verify
```

## DApp Integration

The contracts are designed to work with the Memex DApp ([GitHub Repository](https://github.com/scriptoshi/memex)).

After deployment:

1. Run the export command to generate DApp-compatible files:

```bash
npm run done
```

2. This will create contract ABIs and addresses in the `/build` directory

3. To update the DApp:
    - Copy all files from `/build` to `/evm` in the DApp directory
    - Run `npm build` in the DApp directory to update the UI

For detailed DApp documentation, visit: [https://docs.memex.dcriptoshi.com](https://docs.memex.dcriptoshi.com)

## Backend API Usage

The backend provides admin endpoints for managing the Factory contract settings. Make sure your backend is running and properly configured with the working contract addresses.

### Admin Authentication

All admin endpoints require authentication using the `X-Admin-Password` header with the password set in your `.env` file.

### Update Deployment Fee

```bash
curl -X PUT http://localhost:5000/admin/settings/deployment-fee \
  -H "Content-Type: application/json" \
  -H "X-Admin-Password: your_admin_password_here" \
  -d '{"fee": "0.002"}'
```

### Update Bonding Curve Settings

**Important**: The `preBondingTarget` is automatically calculated by the smart contract as 20% of `virtualEth`. You must include it in your request, but the contract will override it with the calculated value. The validation requires `bondingTarget` > `preBondingTarget` (calculated value).

```bash
curl -X PUT http://localhost:5000/admin/settings/bonding-curve \
  -H "Content-Type: application/json" \
  -H "X-Admin-Password: your_admin_password_here" \
  -d '{
    "virtualEth": "2.0",
    "preBondingTarget": "0.4",
    "bondingTarget": "50.0",
    "minContribution": "0.00023",
    "poolFee": 3000,
    "sellFee": 200,
    "uniswapV3Factory": "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    "positionManager": "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
    "weth": "0x4200000000000000000000000000000000000006",
    "feeTo": "0x8a487fC410689D799246fB373F15CF66CEF135f6"
  }'
```

**Validation Rules:**
- `preBondingTarget` is auto-calculated as `virtualEth * 20%`
- `bondingTarget` must be greater than the calculated `preBondingTarget`
- `poolFee` must be between 100-10000 (0.01%-1%)
- `sellFee` must be between 0-1000 (0%-10%)

### Get Current Settings

```bash
# Get deployment fee
curl http://localhost:5000/admin/settings/deployment-fee \
  -H "X-Admin-Password: your_admin_password_here"

# Get bonding curve settings
curl http://localhost:5000/admin/settings/bonding-curve \
  -H "X-Admin-Password: your_admin_password_here"
```

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a `.env` file with your contract addresses:
```bash
FACTORY_ADDRESS=0x8dC6856f34dD949Ab3D7B4141E3D86DC711bFB0F
BONDING_CURVE_ADDRESS=0x48e4aC21Af1781168497Aa58f780D9A780fB408a
LOCK_ADDRESS=0xF3A7c1282778AA89730089A9E7d25246fF88F3f0
TOKEN_IMPLEMENTATION_ADDRESS=0x3Fe4C492BDB603214B6b616ddADdA0ea2B773009
FOUNDRY_ADDRESS=0x21870d9fFA7428431010ef77400Fb88Be2BB2E56

ADMIN_MNEMONIC=your twelve word mnemonic phrase here
ADMIN_PASSWORD=your_secure_admin_password
RPC_URL=https://api.testnet.abs.xyz
MONGODB_URI=mongodb://127.0.0.1:27017/memex-backend
```

3. Install dependencies and start the server:
```bash
npm install
npm start
```

4. Test your admin functions:
```bash
node test-admin-functions.js
```

## System Parameters

-   Initial Virtual ETH: 5 ETH
-   Pre-bonding Target: 5 ETH
-   Total Bonding Target: 30 ETH
-   Token Supply: 1,000,000,000
-   Lock Duration: 10 years
-   Trading Fee: Configurable by platform admin

## Security Features

-   LP NFT locking mechanism to prevent rug pulls
-   One-time mint restriction on tokens
-   No owner control after initialization
-   Fee collection mechanisms
-   Built on OpenZeppelin contracts
-   Comprehensive test coverage

## License

MIT License

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## Support

For technical support or questions, please refer to:

-   Documentation: [https://docs.memex.dcriptoshi.com](https://docs.memex.dcriptoshi.com)
-   GitHub Issues: Create an issue in the repository
