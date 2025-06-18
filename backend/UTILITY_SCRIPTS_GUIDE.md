# Utility Scripts Guide

All utility scripts have been updated to use environment variables from a `.env` file for better maintainability and security.

## Prerequisites

1. **Create a `.env` file** in the `backend/` directory with your contract addresses:

```bash
# Network Configuration
RPC_URL=https://api.testnet.abs.xyz
CHAIN_ID=11124

# Working Contract Addresses (Abstract Testnet)
FACTORY_ADDRESS=0x8dC6856f34dD949Ab3D7B4141E3D86DC711bFB0F
BONDING_CURVE_ADDRESS=0x48e4aC21Af1781168497Aa58f780D9A780fB408a
LOCK_ADDRESS=0xF3A7c1282778AA89730089A9E7d25246fF88F3f0
TOKEN_IMPLEMENTATION_ADDRESS=0x3Fe4C492BDB603214B6b616ddADdA0ea2B773009
FOUNDRY_ADDRESS=0x21870d9fFA7428431010ef77400Fb88Be2BB2E56

# Admin Authentication (Use either mnemonic OR private key)
ADMIN_MNEMONIC=marriage trip acoustic stomach method issue glimpse sail modify copper base clock
# ADMIN_PRIVATE_KEY=0x1234567890abcdef...

# Backend Configuration
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/memex-backend
```

2. **Install dependencies** (if not already done):
```bash
cd backend
npm install
```

## Available Scripts

### 1. `test-setup.js` - Comprehensive Setup Test
Tests your entire environment configuration and contract connectivity.

```bash
node test-setup.js
```

**What it checks:**
- Environment variables
- Blockchain connection
- Wallet setup and balance
- Contract deployments
- Factory contract status

### 2. `find-deployments.js` - Contract Discovery
Finds and verifies your deployed contracts.

```bash
node find-deployments.js
```

**What it shows:**
- Contract deployment status
- Network information
- Contract code verification

### 3. `verify-new-contracts.js` - Contract Verification
Comprehensive verification of all contracts and their configuration.

```bash
node verify-new-contracts.js
```

**What it verifies:**
- All contract deployments
- Factory initialization status
- Contract configuration consistency
- Implementation addresses

### 4. `debug-ownership.js` - Ownership Debugging
Debugs ownership issues and tests admin functions.

```bash
node debug-ownership.js
```

**What it checks:**
- Factory ownership
- Admin function availability
- Contract permissions

### 5. `initialize-factory.js` - Factory Initialization
Initializes the Factory contract (if not already initialized).

```bash
node initialize-factory.js
```

**What it does:**
- Checks if Factory is already initialized
- Sets up initial bonding curve parameters
- Sets you as the Factory owner

### 6. `initialize-working-factory.js` - Working Factory Initialization
Specifically for initializing the working Factory deployment.

```bash
node initialize-working-factory.js
```

**Same as above but optimized for your current working deployment.**

### 7. `test-admin-functions.js` - Admin Function Testing
Tests all admin functions to ensure they work properly.

```bash
node test-admin-functions.js
```

**What it tests:**
- Factory ownership verification
- Deployment fee reading and updating
- Fee withdrawal capabilities
- Contract settings

## Common Usage Patterns

### Initial Setup Verification
```bash
# 1. Test your complete setup
node test-setup.js

# 2. Verify all contracts are deployed
node verify-new-contracts.js

# 3. Initialize Factory if needed
node initialize-working-factory.js

# 4. Test admin functions
node test-admin-functions.js
```

### Troubleshooting
```bash
# Check if contracts are deployed
node find-deployments.js

# Debug ownership issues
node debug-ownership.js

# Verify complete setup
node test-setup.js
```

### Regular Monitoring
```bash
# Quick admin test
node test-admin-functions.js

# Contract status check
node verify-new-contracts.js
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `RPC_URL` | No | RPC endpoint (defaults to Abstract testnet) |
| `CHAIN_ID` | No | Network chain ID |
| `FACTORY_ADDRESS` | Yes | Factory contract address |
| `BONDING_CURVE_ADDRESS` | Yes | BondingCurve implementation address |
| `LOCK_ADDRESS` | Yes | Lock contract address |
| `TOKEN_IMPLEMENTATION_ADDRESS` | Yes | Token implementation address |
| `FOUNDRY_ADDRESS` | No | Foundry contract address |
| `ADMIN_MNEMONIC` | Yes* | Admin wallet mnemonic phrase |
| `ADMIN_PRIVATE_KEY` | Yes* | Admin wallet private key |

*Either `ADMIN_MNEMONIC` or `ADMIN_PRIVATE_KEY` is required.

## Error Handling

All scripts include proper error handling and will show helpful messages if:
- Environment variables are missing
- Network connection fails
- Contract addresses are invalid
- Permissions are insufficient

## Security Notes

1. **Never commit `.env` files** to version control
2. **Use mnemonic phrases** for better security than private keys
3. **Keep your admin credentials secure**
4. **Test on testnet** before using on mainnet

## Example .env File

Copy `env.example` to `.env` and update with your values:

```bash
cp env.example .env
# Edit .env with your contract addresses and credentials
```

Then use any of the utility scripts without modification! 