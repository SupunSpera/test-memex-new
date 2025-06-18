const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { StatusCodes } = require('http-status-codes');
const { web3Service } = require('../services/web3Service');
const Token = require('../models/Token');

const router = express.Router();

// Middleware to validate request
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};



// POST /api/trading/buy/:address - Buy tokens during bonding phase
router.post('/buy/:address',
  [
    param('address').isEthereumAddress().withMessage('Invalid bonding curve address'),
    body('ethAmount').isFloat({ min: 0.001 }).withMessage('ETH amount must be at least 0.001'),
    body('minTokens').optional().isFloat({ min: 0 }).withMessage('Invalid minimum tokens'),
    body('slippage').optional().isFloat({ min: 0, max: 50 }).withMessage('Slippage must be between 0-50%'),
    body('privateKey').notEmpty().withMessage('Private key is required')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { address } = req.params;
      const { ethAmount, minTokens = 0, slippage = 2.5, privateKey } = req.body;

      // Find token by bonding curve address
      const token = await Token.findOne({ bondingCurveAddress: address.toLowerCase() });
      if (!token) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Bonding curve not found'
        });
      }

      // Check if token is in bonding phase
      const bondingCurveInfo = await web3Service.getBondingCurveInfo(address);
      if (bondingCurveInfo.currentPhase !== 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Token is not in bonding phase. Current phase: ' + (bondingCurveInfo.currentPhase === 1 ? 'Finalized' : 'Unknown')
        });
      }

      // Get quote for buy
      const quote = await web3Service.getQuoteForBuy(address, ethAmount);
      
      // Calculate minimum tokens with slippage
      let calculatedMinTokens = parseFloat(quote.tokensOut) * (1 - slippage / 100);
      
      // Fix: Ensure calculatedMinTokens doesn't have too many decimal places
      // Truncate to 18 decimal places to avoid parseUnits overflow
      calculatedMinTokens = Math.floor(calculatedMinTokens * 1e18) / 1e18;
      
      const finalMinTokens = Math.max(minTokens, calculatedMinTokens);

      const result = await web3Service.buyTokens(address, ethAmount, finalMinTokens, privateKey);

      // Update token statistics
      const currentPrice = parseFloat(ethAmount) / parseFloat(result.tokensReceived);
      
      await Token.findByIdAndUpdate(token._id, {
        $inc: {
          'metrics.totalVolume': parseFloat(ethAmount),
          'metrics.transactionCount': 1
        },
        $set: {
          'pricing.currentPrice': currentPrice,
          'pricing.lastTrade': new Date(),
          lastActivity: new Date()
        }
      });

      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Token purchase successful',
        data: {
          transaction: result,
          quote: quote,
          slippageUsed: slippage,
          minTokensCalculated: calculatedMinTokens,
          finalMinTokens: finalMinTokens,
          token: {
            name: token.name,
            symbol: token.symbol,
            bondingCurveAddress: token.bondingCurveAddress,
            currentPrice: currentPrice,
            currentPhase: 'Bonding'
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/trading/sell/:address - Sell tokens during bonding phase
router.post('/sell/:address',
  [
    param('address').isEthereumAddress().withMessage('Invalid bonding curve address'),
    body('tokenAmount').isFloat({ min: 0.000001 }).withMessage('Token amount must be greater than 0'),
    body('slippage').optional().isFloat({ min: 0, max: 50 }).withMessage('Slippage must be between 0-50%').default(2.5),
    body('privateKey').notEmpty().withMessage('Private key is required')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { address } = req.params;
      const { tokenAmount, slippage = 2.5, privateKey } = req.body;

      // Find token by bonding curve address
      const token = await Token.findOne({ bondingCurveAddress: address.toLowerCase() });
      if (!token) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Bonding curve not found'
        });
      }

      // Check if token is in Bonding phase (phase 0)
      const bondingCurveInfo = await web3Service.getBondingCurveInfo(address);
      if (bondingCurveInfo.currentPhase !== 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Token is not in bonding phase. Current phase: ' + (bondingCurveInfo.currentPhase === 1 ? 'Finalized' : 'Unknown')
        });
      }

      // Get quote for sell
      const quote = await web3Service.getQuoteForSell(address, tokenAmount);
      
      // Calculate minimum ETH with slippage protection
      let calculatedMinEth = parseFloat(quote.ethOut) * (1 - slippage / 100);
      
      // Fix: Ensure calculatedMinEth doesn't have too many decimal places
      // Truncate to 18 decimal places to avoid parseEther overflow
      calculatedMinEth = Math.floor(calculatedMinEth * 1e18) / 1e18;

      const result = await web3Service.sellTokens(address, tokenAmount, calculatedMinEth, privateKey);

      // Update token statistics
      const currentPrice = parseFloat(result.ethReceived) / parseFloat(tokenAmount);
      
      await Token.findByIdAndUpdate(token._id, {
        $inc: {
          'metrics.totalVolume': parseFloat(result.ethReceived),
          'metrics.transactionCount': 1
        },
        $set: {
          'pricing.currentPrice': currentPrice,
          'pricing.lastTrade': new Date(),
          lastActivity: new Date()
        }
      });

      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Token sale successful',
        data: {
          transaction: result,
          quote: quote,
          slippageUsed: slippage,
          minEthCalculated: calculatedMinEth,
          token: {
            name: token.name,
            symbol: token.symbol,
            bondingCurveAddress: token.bondingCurveAddress,
            currentPrice: currentPrice
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/trading/quote/buy/:address - Get quote for buying tokens
router.get('/quote/buy/:address',
  [
    param('address').isEthereumAddress().withMessage('Invalid bonding curve address')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { address } = req.params;
      const { ethAmount } = req.query;

      if (!ethAmount || isNaN(parseFloat(ethAmount)) || parseFloat(ethAmount) < 0.001) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'ETH amount is required and must be at least 0.001'
        });
      }

      // Find token by bonding curve address
      const token = await Token.findOne({ bondingCurveAddress: address.toLowerCase() });
      if (!token) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Bonding curve not found'
        });
      }

      const quote = await web3Service.getQuoteForBuy(address, ethAmount);

      res.json({
        success: true,
        data: {
          quote,
          token: {
            name: token.name,
            symbol: token.symbol,
            bondingCurveAddress: token.bondingCurveAddress
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/trading/quote/sell/:address - Get quote for selling tokens
router.get('/quote/sell/:address',
  [
    param('address').isEthereumAddress().withMessage('Invalid bonding curve address')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { address } = req.params;
      const { tokenAmount } = req.query;

      if (!tokenAmount || isNaN(parseFloat(tokenAmount)) || parseFloat(tokenAmount) <= 0) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Token amount is required and must be greater than 0'
        });
      }

      // Find token by bonding curve address
      const token = await Token.findOne({ bondingCurveAddress: address.toLowerCase() });
      if (!token) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Bonding curve not found'
        });
      }

      const quote = await web3Service.getQuoteForSell(address, tokenAmount);

      res.json({
        success: true,
        data: {
          quote,
          token: {
            name: token.name,
            symbol: token.symbol,
            bondingCurveAddress: token.bondingCurveAddress
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/trading/balance/:tokenAddress/:userAddress - Get user token balance
router.get('/balance/:tokenAddress/:userAddress',
  [
    param('tokenAddress').isEthereumAddress().withMessage('Invalid token address'),
    param('userAddress').isEthereumAddress().withMessage('Invalid user address')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { tokenAddress, userAddress } = req.params;

      // Find token by token address
      const token = await Token.findOne({ tokenAddress: tokenAddress.toLowerCase() });
      if (!token) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Token not found'
        });
      }

      const balance = await web3Service.getUserTokenBalance(tokenAddress, userAddress);

      res.json({
        success: true,
        data: {
          userAddress,
          tokenAddress,
          balance,
          token: {
            name: token.name,
            symbol: token.symbol,
            decimals: 18
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/trading/history/:address - Get trading history for a bonding curve
router.get('/history/:address',
  [
    param('address').isEthereumAddress().withMessage('Invalid bonding curve address')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { address } = req.params;
      const { limit = 50, offset = 0, type } = req.query;

      // Find token by bonding curve address
      const token = await Token.findOne({ bondingCurveAddress: address.toLowerCase() });
      if (!token) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Bonding curve not found'
        });
      }

      // Get real trading history from blockchain events
      const history = await web3Service.getTradingHistory(address, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        type: type
      });

      res.json({
        success: true,
        data: {
          trades: history.trades,
          total: history.total,
          hasMore: history.hasMore,
          token: {
            name: token.name,
            symbol: token.symbol,
            bondingCurveAddress: token.bondingCurveAddress
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/trading/history/:address/user/:userAddress - Get user-specific trading history
router.get('/history/:address/user/:userAddress',
  [
    param('address').isEthereumAddress().withMessage('Invalid bonding curve address'),
    param('userAddress').isEthereumAddress().withMessage('Invalid user address')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { address, userAddress } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      // Find token by bonding curve address
      const token = await Token.findOne({ bondingCurveAddress: address.toLowerCase() });
      if (!token) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Bonding curve not found'
        });
      }

      // Get user-specific trading history
      const history = await web3Service.getUserTradingHistory(address, userAddress, {
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        data: {
          trades: history.trades,
          total: history.total,
          hasMore: history.hasMore,
          user: userAddress,
          token: {
            name: token.name,
            symbol: token.symbol,
            bondingCurveAddress: token.bondingCurveAddress
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/trading/recent/:address - Get recent trades for a bonding curve
router.get('/recent/:address',
  [
    param('address').isEthereumAddress().withMessage('Invalid bonding curve address')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { address } = req.params;
      const { count = 10 } = req.query;

      // Find token by bonding curve address
      const token = await Token.findOne({ bondingCurveAddress: address.toLowerCase() });
      if (!token) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Bonding curve not found'
        });
      }

      // Get recent trades
      const recentTrades = await web3Service.getRecentTrades(address, parseInt(count));

      res.json({
        success: true,
        data: {
          trades: recentTrades,
          token: {
            name: token.name,
            symbol: token.symbol,
            bondingCurveAddress: token.bondingCurveAddress
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/trading/allowance/:tokenAddress/:userAddress/:spenderAddress - Get token allowance
router.get('/allowance/:tokenAddress/:userAddress/:spenderAddress',
  [
    param('tokenAddress').isEthereumAddress().withMessage('Invalid token address'),
    param('userAddress').isEthereumAddress().withMessage('Invalid user address'),
    param('spenderAddress').isEthereumAddress().withMessage('Invalid spender address')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { tokenAddress, userAddress, spenderAddress } = req.params;

      // Find token by token address
      const token = await Token.findOne({ tokenAddress: tokenAddress.toLowerCase() });
      if (!token) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Token not found'
        });
      }

      const allowance = await web3Service.getTokenAllowance(tokenAddress, userAddress, spenderAddress);

      res.json({
        success: true,
        data: {
          userAddress,
          spenderAddress,
          tokenAddress,
          allowance,
          token: {
            name: token.name,
            symbol: token.symbol,
            decimals: 18
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/trading/approve/:tokenAddress - Approve tokens for spending
router.post('/approve/:tokenAddress',
  [
    param('tokenAddress').isEthereumAddress().withMessage('Invalid token address'),
    body('spenderAddress').isEthereumAddress().withMessage('Invalid spender address'),
    body('amount').isFloat({ min: 0.000001 }).withMessage('Amount must be greater than 0'),
    body('privateKey').notEmpty().withMessage('Private key is required')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { tokenAddress } = req.params;
      const { spenderAddress, amount, privateKey } = req.body;

      // Find token by token address
      const token = await Token.findOne({ tokenAddress: tokenAddress.toLowerCase() });
      if (!token) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Token not found'
        });
      }

      const result = await web3Service.approveTokens(tokenAddress, spenderAddress, amount, privateKey);

      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Token approval successful',
        data: {
          transaction: result,
          token: {
            name: token.name,
            symbol: token.symbol,
            tokenAddress: token.tokenAddress
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router; 