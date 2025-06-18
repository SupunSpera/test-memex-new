# Memex Backend API

Node.js backend for the Memex bonding curve system on Abstract L2 blockchain. Provides REST API endpoints for managing Factory contracts, deploying tokens, and monitoring bonding curves.

## 🚀 Quick Start

### Environment Setup

1. Copy the environment file:
```bash
cp env.example .env
```

2. Configure your `.env` file:
```bash
# Contract Addresses (Abstract L2 Testnet - Working Deployment)
FACTORY_ADDRESS=0x8dC6856f34dD949Ab3D7B4141E3D86DC711bFB0F
BONDING_CURVE_ADDRESS=0x48e4aC21Af1781168497Aa58f780D9A780fB408a
LOCK_ADDRESS=0xF3A7c1282778AA89730089A9E7d25246fF88F3f0
TOKEN_IMPLEMENTATION_ADDRESS=0x3Fe4C492BDB603214B6b616ddADdA0ea2B773009
FOUNDRY_ADDRESS=0x21870d9fFA7428431010ef77400Fb88Be2BB2E56

# Admin Authentication (Use your mnemonic phrase or private key)
ADMIN_PRIVATE_KEY=your twelve word mnemonic phrase here
ADMIN_PASSWORD=your_secure_admin_password_here

# Network Configuration
ABSTRACT_TESTNET_RPC_URL=https://api.testnet.abs.xyz
MONGODB_URI=mongodb://127.0.0.1:27017/memex-backend

# Server Configuration
PORT=5000
```

3. Install dependencies and start:
```bash
npm install
npm start
```

## 📚 API Documentation

Base URL: `http://localhost:5000`

### 🔐 Authentication

Admin endpoints require the `X-Admin-Password` header:
```bash
-H "X-Admin-Password: your_admin_password_here"
```

---

## 👤 User Endpoints

### Get Deployment Fee
```bash
curl http://localhost:5000/user/deployment-fee
```

### Get Bonding Curve Settings
```bash
curl http://localhost:5000/user/settings
```

### Deploy New Token
```bash
curl -X POST http://localhost:5000/user/deploy-token \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Token",
    "symbol": "MTK",
    "description": "A revolutionary DeFi token",
    "privateKey": "your_private_key_here",
    "image": "https://example.com/logo.png",
    "website": "https://mytoken.com",
    "twitter": "@mytoken",
    "telegram": "@mytokengroup",
    "tags": ["defi", "utility"]
  }'
```

**Note:** The deployment fee is now automatically fetched from the contract at runtime - no need to specify it!

### Get Token Information
```bash
curl http://localhost:5000/user/tokens/0x1234567890123456789012345678901234567890
```

### Get User Contribution for Token
```bash
curl http://localhost:5000/user/tokens/0x1234567890123456789012345678901234567890/contribution/0x9876543210987654321098765432109876543210
```

### Get User's Tokens
```bash
curl http://localhost:5000/user/my-tokens/0x9876543210987654321098765432109876543210
```

### Update Token Metadata
```bash
curl -X PUT http://localhost:5000/user/tokens/0x1234567890123456789012345678901234567890/metadata \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Updated token description",
    "website": "https://mytoken.com",
    "twitter": "https://twitter.com/mytoken",
    "telegram": "https://t.me/mytoken"
  }'
```

### Validate Ethereum Address
```bash
curl http://localhost:5000/user/validate-address/0x1234567890123456789012345678901234567890
```

### Get Transaction Details
```bash
curl http://localhost:5000/user/transaction/0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
```

---

## 🏭 Factory Endpoints

### Get Factory Information
```bash
curl http://localhost:5000/factory/info
```

### Get Factory Statistics
```bash
curl http://localhost:5000/factory/stats
```

### Get Recent Deployments
```bash
curl http://localhost:5000/factory/recent-deployments?limit=10
```

### Get Top Performing Tokens
```bash
curl http://localhost:5000/factory/top-performers?limit=5&sortBy=volume
```

### Get Featured Tokens
```bash
curl http://localhost:5000/factory/featured-tokens?limit=6
```

### Get Tokens by Phase
```bash
curl http://localhost:5000/factory/tokens-by-phase?phase=0&limit=10&offset=0
```

### Search Tokens
```bash
curl "http://localhost:5000/factory/search?q=bitcoin&limit=10"
```

### Get Available Tags
```bash
curl http://localhost:5000/factory/tags
```

### Get Tokens by Tag
```bash
curl http://localhost:5000/factory/tokens-by-tag/defi?limit=10&offset=0
```

---

## 📈 Token Endpoints

### Get All Tokens
```bash
curl "http://localhost:5000/token/?page=1&limit=20&sortBy=createdAt&sortOrder=desc"
```

### Get Token Details
```bash
curl http://localhost:5000/token/0x1234567890123456789012345678901234567890
```

### Get Token Statistics
```bash
curl http://localhost:5000/token/0x1234567890123456789012345678901234567890/stats
```

### Get Token Holders
```bash
curl http://localhost:5000/token/0x1234567890123456789012345678901234567890/holders?page=1&limit=50
```

### Get Token Price History
```bash
curl "http://localhost:5000/token/0x1234567890123456789012345678901234567890/price-history?timeframe=24h&interval=1h"
```

### Get Trending Tokens
```bash
curl http://localhost:5000/token/trending?limit=10
```

### Get Top Gainers
```bash
curl http://localhost:5000/token/gainers?limit=10&timeframe=24h
```

### Get Top Losers
```bash
curl http://localhost:5000/token/losers?limit=10&timeframe=24h
```

### Get Newest Tokens
```bash
curl http://localhost:5000/token/new?limit=10
```

---

## 🌊 Bonding Curve Endpoints

### Get Bonding Curve Information
```bash
curl http://localhost:5000/bonding-curve/0x1234567890123456789012345678901234567890
```

### Get Current Phase
```bash
curl http://localhost:5000/bonding-curve/0x1234567890123456789012345678901234567890/phase
```

### Get Current Reserves
```bash
curl http://localhost:5000/bonding-curve/0x1234567890123456789012345678901234567890/reserves
```

### Get Bonding Curve Settings
```bash
curl http://localhost:5000/bonding-curve/0x1234567890123456789012345678901234567890/settings
```

### Get User Contribution
```bash
curl http://localhost:5000/bonding-curve/0x1234567890123456789012345678901234567890/contribution/0x9876543210987654321098765432109876543210
```

### Calculate Price Impact
```bash
curl "http://localhost:5000/bonding-curve/0x1234567890123456789012345678901234567890/price-impact?ethAmount=1.0&tradeType=buy"
```

### Get Active Bonding Curves
```bash
curl http://localhost:5000/bonding-curve/active
```

### Get Finalized Bonding Curves
```bash
curl http://localhost:5000/bonding-curve/finalized
```

### Get Bonding Curve Statistics
```bash
curl http://localhost:5000/bonding-curve/stats
```

---

## 💱 Trading Endpoints

### PreBonding Phase

#### Contribute to PreBonding
Contribute ETH to a token's prebonding phase before the main bonding curve starts.
```bash
curl -X POST http://localhost:5000/api/trading/prebonding/0x1234567890123456789012345678901234567890 \
  -H "Content-Type: application/json" \
  -d '{
    "ethAmount": 0.1,
    "privateKey": "your_private_key_here"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "PreBonding contribution successful",
  "data": {
    "transaction": {
      "transactionHash": "0x...",
      "blockNumber": 12345,
      "ethContributed": 0.1,
      "tokensReceived": "1000.0",
      "success": true
    },
    "token": {
      "name": "My Meme Token",
      "symbol": "MMT",
      "bondingCurveAddress": "0x...",
      "currentPhase": "PreBonding"
    }
  }
}
```

### Bonding Phase

#### Buy Tokens
Purchase tokens during the bonding curve phase.
```bash
curl -X POST http://localhost:5000/api/trading/buy/0x1234567890123456789012345678901234567890 \
  -H "Content-Type: application/json" \
  -d '{
    "ethAmount": 0.1,
    "minTokens": 950,
    "slippage": 2.5,
    "privateKey": "your_private_key_here"
  }'
```

**Parameters:**
- `ethAmount`: Amount of ETH to spend (required)
- `minTokens`: Minimum tokens to receive (optional, defaults to 0)
- `slippage`: Slippage tolerance in percentage (optional, defaults to 2.5%)
- `privateKey`: User's private key for transaction signing (required)

#### Sell Tokens
Sell tokens back to the bonding curve.
```bash
curl -X POST http://localhost:5000/api/trading/sell/0x1234567890123456789012345678901234567890 \
  -H "Content-Type: application/json" \
  -d '{
    "tokenAmount": 1000,
    "slippage": 2.5,
    "privateKey": "your_private_key_here"
  }'
```

**Parameters:**
- `tokenAmount`: Amount of tokens to sell (required)
- `slippage`: Slippage tolerance in percentage (optional, defaults to 2.5%)
- `privateKey`: User's private key for transaction signing (required)

**Note:** The minimum ETH amount is automatically calculated based on the current price and slippage tolerance, so users don't need to specify it manually.

### Trading Quotes

#### Get Buy Quote
Get a quote for buying tokens with a specific amount of ETH.
```bash
curl "http://localhost:5000/api/trading/quote/buy/0x1234567890123456789012345678901234567890?ethAmount=0.1"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "quote": {
      "ethAmount": 0.1,
      "tokensOut": "1000.0",
      "pricePerToken": 0.0001,
      "slippage": "2.5"
    },
    "token": {
      "name": "My Meme Token",
      "symbol": "MMT",
      "bondingCurveAddress": "0x..."
    }
  }
}
```

#### Get Sell Quote
Get a quote for selling a specific amount of tokens.
```bash
curl "http://localhost:5000/api/trading/quote/sell/0x1234567890123456789012345678901234567890?tokenAmount=1000"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "quote": {
      "tokenAmount": 1000,
      "ethOut": "0.095",
      "fee": "0.002",
      "pricePerToken": 0.000097,
      "slippage": "2.5"
    },
    "token": {
      "name": "My Meme Token",
      "symbol": "MMT",
      "bondingCurveAddress": "0x..."
    }
  }
}
```

### User Balances

#### Get User Token Balance
Get a user's token balance for a specific token.
```bash
curl http://localhost:5000/api/trading/balance/0xTOKEN_ADDRESS/0xUSER_ADDRESS
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userAddress": "0x...",
    "tokenAddress": "0x...",
    "balance": "1000.0",
    "token": {
      "name": "My Meme Token",
      "symbol": "MMT",
      "decimals": 18
    }
  }
}
```

### Trading History

#### Get Trading History
Get the trading history for a specific bonding curve.
```bash
curl "http://localhost:5000/api/trading/history/0x1234567890123456789012345678901234567890?limit=20&offset=0"
```

**Parameters:**
- `limit`: Number of trades to return (default: 50)
- `offset`: Number of trades to skip for pagination (default: 0)
- `type`: Filter by trade type - `prebonding`, `buy`, `sell` (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "trades": [
      {
        "id": "0xabc123...-1",
        "type": "buy",
        "user": "0x1234567890123456789012345678901234567890",
        "ethAmount": "0.1",
        "tokenAmount": "1000.0",
        "fee": "0",
        "timestamp": "2024-01-01T12:00:00.000Z",
        "transactionHash": "0xabc123...",
        "blockNumber": 12345
      },
      {
        "id": "0xdef456...-2",
        "type": "prebonding",
        "user": "0x9876543210987654321098765432109876543210",
        "ethAmount": "0.05",
        "tokenAmount": "500.0",
        "fee": "0",
        "timestamp": "2024-01-01T11:30:00.000Z",
        "transactionHash": "0xdef456...",
        "blockNumber": 12340
      }
    ],
    "total": 25,
    "hasMore": true,
    "token": {
      "name": "My Meme Token",
      "symbol": "MMT",
      "bondingCurveAddress": "0x..."
    }
  }
}
```

#### Get User Trading History
Get trading history for a specific user on a bonding curve.
```bash
curl "http://localhost:5000/api/trading/history/0x1234567890123456789012345678901234567890/user/0x9876543210987654321098765432109876543210?limit=10&offset=0"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "trades": [
      {
        "id": "0xabc123...-1",
        "type": "buy",
        "ethAmount": "0.1",
        "tokenAmount": "1000.0",
        "fee": "0",
        "timestamp": "2024-01-01T12:00:00.000Z",
        "transactionHash": "0xabc123...",
        "blockNumber": 12345
      }
    ],
    "total": 3,
    "hasMore": false,
    "user": "0x9876543210987654321098765432109876543210",
    "token": {
      "name": "My Meme Token",
      "symbol": "MMT",
      "bondingCurveAddress": "0x..."
    }
  }
}
```

#### Get Recent Trades
Get the most recent trades for a bonding curve.
```bash
curl "http://localhost:5000/api/trading/recent/0x1234567890123456789012345678901234567890?count=5"
```

**Parameters:**
- `count`: Number of recent trades to return (default: 10, max: 50)

### Real-Time Blockchain Data

The trading history endpoints now fetch **real data from the blockchain** by querying contract events:

- **PreBondingContribution events** - Early contribution phase
- **TokensPurchased events** - Token buy transactions  
- **TokensSold events** - Token sell transactions

**Features:**
- ✅ Real blockchain event parsing
- ✅ Automatic pagination and sorting
- ✅ Filter by trade type
- ✅ User-specific history
- ✅ Block number and timestamp data
- ✅ Fee calculation for sells
- ✅ Error handling for failed events

**Performance Notes:**
- Queries last 10,000 blocks for recent activity
- Events are sorted by timestamp (newest first)
- Large queries may take longer due to blockchain RPC limits
- Consider caching for high-traffic applications

### Trading Phases

The Memex protocol operates in three distinct phases:

1. **PreBonding Phase (Phase 0)**: 
   - Users can contribute ETH to the prebonding pool
   - Token allocations are determined pro-rata based on contributions
   - Must reach the prebonding target to advance to bonding phase

2. **Bonding Phase (Phase 1)**:
   - Users can buy and sell tokens through the bonding curve
   - Price increases with each purchase and decreases with each sale
   - Must reach the bonding target to finalize and create LP

3. **Finalized Phase (Phase 2)**:
   - Liquidity pool is created on Uniswap V3
   - Tokens can be traded on the open market
   - Bonding curve becomes inactive

### Important Notes

- **Private Key Security**: Never expose private keys in production. Use environment variables or secure key management systems.
- **Slippage Protection**: Always set appropriate slippage tolerance to protect against MEV attacks.
- **Phase Validation**: The API automatically validates that trades are only executed in the correct phase.
- **Minimum Amounts**: Check the bonding curve settings for minimum contribution amounts.
- **Gas Fees**: Ensure your wallet has sufficient ETH for both the trade amount and gas fees.

---

## 📊 Analytics Endpoints

### Get Overview Analytics
```bash
curl "http://localhost:5000/analytics/overview?timeframe=7d&granularity=day"
```

### Get Tokens by Date
```bash
curl "http://localhost:5000/analytics/tokens-by-date?startDate=2024-01-01&endDate=2024-01-31&granularity=day"
```

### Get Volume by Date
```bash
curl "http://localhost:5000/analytics/volume-by-date?startDate=2024-01-01&endDate=2024-01-31"
```

### Get Top Performers
```bash
curl "http://localhost:5000/analytics/top-performers?timeframe=7d&limit=10&metric=volume"
```

### Get Phase Transition Analytics
```bash
curl "http://localhost:5000/analytics/phase-transition?timeframe=30d"
```

### Get Market Metrics
```bash
curl "http://localhost:5000/analytics/market-metrics?timeframe=24h"
```

### Get User Behavior Analytics
```bash
curl "http://localhost:5000/analytics/user-behavior?timeframe=7d"
```

---

## 🔧 Admin Endpoints

**Note:** All admin endpoints require authentication via `X-Admin-Password` header.

### Get Admin Dashboard
```bash
curl http://localhost:5000/admin/dashboard \
  -H "X-Admin-Password: your_admin_password_here"
```

### Get Current Factory Settings
```bash
curl http://localhost:5000/admin/settings \
  -H "X-Admin-Password: your_admin_password_here"
```

### Update Deployment Fee
```bash
curl -X PUT http://localhost:5000/admin/settings/deployment-fee \
  -H "Content-Type: application/json" \
  -H "X-Admin-Password: your_admin_password_here" \
  -d '{
    "fee": "0.002"
  }'
```

### Update Bonding Curve Settings
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

**Important Notes:**
- `preBondingTarget` is auto-calculated as 20% of `virtualEth`
- `bondingTarget` must be greater than the calculated `preBondingTarget`
- `poolFee` must be between 100-10000 (0.01%-1%)
- `sellFee` must be between 0-1000 (0%-10%)

### Withdraw Collected Fees
```bash
curl -X POST http://localhost:5000/admin/withdraw-fees \
  -H "Content-Type: application/json" \
  -H "X-Admin-Password: your_admin_password_here" \
  -d '{
    "recipient": "0x8b3CA5BaB7E1ff6092F30F4063a3305bf3983a7c"
  }'
```

### Get All Tokens (Admin View)
```bash
curl "http://localhost:5000/admin/tokens?page=1&limit=50&status=all&sortBy=createdAt&sortOrder=desc" \
  -H "X-Admin-Password: your_admin_password_here"
```

### Update Token Status
```bash
curl -X PUT http://localhost:5000/admin/tokens/0x1234567890123456789012345678901234567890/status \
  -H "Content-Type: application/json" \
  -H "X-Admin-Password: your_admin_password_here" \
  -d '{
    "isActive": false,
    "reason": "Violation of terms"
  }'
```

---

## 🛠️ Utility Scripts

The backend includes several utility scripts for testing and debugging:

### Test Admin Functions
```bash
node test-admin-functions.js
```

### Debug Contract Ownership
```bash
node debug-ownership.js
```

### Debug Bonding Settings
```bash
node debug-bonding-settings.js
```

### Initialize Factory Contract
```bash
node initialize-working-factory.js
```

### Find Contract Deployments
```bash
node find-deployments.js
```

### Verify New Contracts
```bash
node verify-new-contracts.js
```

For detailed information about utility scripts, see: [UTILITY_SCRIPTS_GUIDE.md](./UTILITY_SCRIPTS_GUIDE.md)

---

## 📋 Response Format

All endpoints return JSON responses in this format:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data here
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    // Validation errors (if applicable)
  ]
}
```

---

## 🔄 Status Codes

- `200` - Success
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid admin password)
- `404` - Not Found
- `500` - Internal Server Error

---

## 🌐 Network Information

**Abstract L2 Testnet:**
- Chain ID: 11124
- RPC URL: https://api.testnet.abs.xyz
- Native Token: ETH

**Working Contract Addresses:**
- Factory: `0x8dC6856f34dD949Ab3D7B4141E3D86DC711bFB0F`
- BondingCurve: `0x48e4aC21Af1781168497Aa58f780D9A780fB408a`
- Lock: `0xF3A7c1282778AA89730089A9E7d25246fF88F3f0`
- TokenImplementation: `0x3Fe4C492BDB603214B6b616ddADdA0ea2B773009`
- Foundry: `0x21870d9fFA7428431010ef77400Fb88Be2BB2E56`

---

## 🚀 Features

- ✅ **Factory Management** - Deploy and configure bonding curve systems
- ✅ **Token Operations** - Create, manage, and monitor ERC20 tokens
- ✅ **Bonding Curves** - Support for pre-bonding, bonding, and finalization phases
- ✅ **Analytics** - Comprehensive trading and user behavior analytics
- ✅ **Admin Tools** - Secure admin panel for system management
- ✅ **User Dashboard** - Portfolio management and trading interface
- ✅ **Real-time Data** - Live bonding curve statistics and price tracking
- ✅ **Security** - Password-based admin authentication with private key isolation

---

## 🔧 Development

### Running Tests
```bash
npm test
```

### Environment Variables
See `env.example` for all required environment variables.

### Database
MongoDB is required for storing token metadata and analytics data.

### Logs
Application logs are stored in the `logs/` directory.

---

## 📖 Additional Resources

- [Smart Contract Documentation](../README.md)
- [Abstract L2 Deployment Guide](../ABSTRACT_DEPLOYMENT.md)
- [Utility Scripts Guide](./UTILITY_SCRIPTS_GUIDE.md) 