const express = require('express');
const { param, validationResult } = require('express-validator');
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

// GET /api/bonding-curve/:address - Get bonding curve information
router.get('/:address',
  [
    param('address').isEthereumAddress().withMessage('Invalid bonding curve address')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { address } = req.params;

      // Find token by bonding curve address
      const token = await Token.findOne({ bondingCurveAddress: address.toLowerCase() });
      if (!token) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Bonding curve not found'
        });
      }

      // Get live bonding curve data
      const bondingCurveInfo = await web3Service.getBondingCurveInfo(address);

      res.json({
        success: true,
        data: {
          bondingCurve: bondingCurveInfo,
          token: {
            name: token.name,
            symbol: token.symbol,
            tokenAddress: token.tokenAddress,
            bondingCurveAddress: token.bondingCurveAddress,
            owner: token.owner
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/bonding-curve/:address/phase - Get current bonding curve phase
router.get('/:address/phase',
  [
    param('address').isEthereumAddress().withMessage('Invalid bonding curve address')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { address } = req.params;

      const token = await Token.findOne({ bondingCurveAddress: address.toLowerCase() });
      if (!token) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Bonding curve not found'
        });
      }

      const bondingCurveInfo = await web3Service.getBondingCurveInfo(address);

      const phaseNames = {
        0: 'PreBonding',
        1: 'Bonding',
        2: 'Finalized'
      };

      res.json({
        success: true,
        data: {
          currentPhase: bondingCurveInfo.currentPhase,
          phaseName: phaseNames[bondingCurveInfo.currentPhase] || 'Unknown',
          isFinalized: bondingCurveInfo.isFinalized,
          progress: {
            totalETHCollected: bondingCurveInfo.totalETHCollected,
            bondingTarget: bondingCurveInfo.settings.bondingTarget,
            progressPercentage: bondingCurveInfo.progressPercentage,
            remainingETHToTarget: bondingCurveInfo.remainingETHToTarget,
            liveProgressPercentage: bondingCurveInfo.liveProgressPercentage,
            liveRemainingETHToTarget: bondingCurveInfo.liveRemainingETHToTarget
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/bonding-curve/:address/reserves - Get current reserves
router.get('/:address/reserves',
  [
    param('address').isEthereumAddress().withMessage('Invalid bonding curve address')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { address } = req.params;

      const token = await Token.findOne({ bondingCurveAddress: address.toLowerCase() });
      if (!token) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Bonding curve not found'
        });
      }

      const bondingCurveInfo = await web3Service.getBondingCurveInfo(address);

      res.json({
        success: true,
        data: {
          ethReserve: bondingCurveInfo.ethReserve,
          tokenReserve: bondingCurveInfo.tokenReserve,
          virtualEth: bondingCurveInfo.settings.virtualEth,
          totalETHCollected: bondingCurveInfo.totalETHCollected,
          totalPreBondingContributions: bondingCurveInfo.totalPreBondingContributions
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/bonding-curve/:address/settings - Get bonding curve settings
router.get('/:address/settings',
  [
    param('address').isEthereumAddress().withMessage('Invalid bonding curve address')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { address } = req.params;

      const token = await Token.findOne({ bondingCurveAddress: address.toLowerCase() });
      if (!token) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Bonding curve not found'
        });
      }

      const bondingCurveInfo = await web3Service.getBondingCurveInfo(address);

      res.json({
        success: true,
        data: bondingCurveInfo.settings
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/bonding-curve/:address/contribution/:userAddress - Get user contribution
router.get('/:address/contribution/:userAddress',
  [
    param('address').isEthereumAddress().withMessage('Invalid bonding curve address'),
    param('userAddress').isEthereumAddress().withMessage('Invalid user address')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { address, userAddress } = req.params;

      const token = await Token.findOne({ bondingCurveAddress: address.toLowerCase() });
      if (!token) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Bonding curve not found'
        });
      }

      const contribution = await web3Service.getUserContribution(address, userAddress);

      res.json({
        success: true,
        data: {
          userAddress,
          contribution: contribution.contribution,
          tokenAllocation: contribution.tokenAllocation,
          bondingCurveAddress: address
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/bonding-curve/:address/price-impact - Calculate price impact for trade
router.get('/:address/price-impact',
  [
    param('address').isEthereumAddress().withMessage('Invalid bonding curve address')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { address } = req.params;
      const { ethAmount, tokenAmount, tradeType } = req.query;

      if (!ethAmount && !tokenAmount) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Either ethAmount or tokenAmount must be provided'
        });
      }

      if (!tradeType || !['buy', 'sell'].includes(tradeType)) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'tradeType must be either "buy" or "sell"'
        });
      }

      const token = await Token.findOne({ bondingCurveAddress: address.toLowerCase() });
      if (!token) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Bonding curve not found'
        });
      }

      const bondingCurveInfo = await web3Service.getBondingCurveInfo(address);

      // Note: In a full implementation, you'd calculate price impact using the bonding curve formula
      // This would require implementing the same math as in the smart contract
      
      res.json({
        success: true,
        data: {
          message: 'Price impact calculation would be implemented with bonding curve math',
          tradeType,
          inputAmount: ethAmount || tokenAmount,
          currentPrice: token.currentPrice,
          // In real implementation:
          // estimatedOutput: calculated_output,
          // priceImpact: calculated_impact_percentage,
          // newPrice: calculated_new_price
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/bonding-curve/active - Get all active bonding curves
router.get('/active', async (req, res, next) => {
  try {
    const activeTokens = await Token.find({ 
      isActive: true,
      currentPhase: { $in: [0, 1] } // PreBonding or Bonding phase
    })
      .select('name symbol tokenAddress bondingCurveAddress currentPhase totalETHCollected')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: {
        count: activeTokens.length,
        bondingCurves: activeTokens
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/bonding-curve/finalized - Get all finalized bonding curves
router.get('/finalized', async (req, res, next) => {
  try {
    const finalizedTokens = await Token.find({ 
      isActive: true,
      isFinalized: true 
    })
      .select('name symbol tokenAddress bondingCurveAddress uniswapPool lpTokenId totalETHCollected')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: {
        count: finalizedTokens.length,
        finalizedBondingCurves: finalizedTokens
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/bonding-curve/stats - Get bonding curve statistics
router.get('/stats', async (req, res, next) => {
  try {
    const [
      totalBondingCurves,
      activeCurves,
      finalizedCurves,
      phaseStats
    ] = await Promise.all([
      Token.countDocuments({ isActive: true }),
      Token.countDocuments({ isActive: true, currentPhase: { $in: [0, 1] } }),
      Token.countDocuments({ isActive: true, isFinalized: true }),
      Token.aggregate([
        {
          $match: { isActive: true }
        },
        {
          $group: {
            _id: '$currentPhase',
            count: { $sum: 1 },
            totalETH: { $sum: { $toDouble: '$totalETHCollected' } }
          }
        }
      ])
    ]);

    // Calculate total ETH across all bonding curves
    const totalETHStats = await Token.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $group: {
          _id: null,
          totalETHCollected: { $sum: { $toDouble: '$totalETHCollected' } },
          avgETHPerCurve: { $avg: { $toDouble: '$totalETHCollected' } }
        }
      }
    ]);

    const ethStats = totalETHStats[0] || { totalETHCollected: 0, avgETHPerCurve: 0 };

    res.json({
      success: true,
      data: {
        totalBondingCurves,
        activeCurves,
        finalizedCurves,
        totalETHCollected: ethStats.totalETHCollected.toString(),
        avgETHPerCurve: ethStats.avgETHPerCurve.toString(),
        phaseDistribution: phaseStats.map(stat => ({
          phase: stat._id,
          phaseName: ['PreBonding', 'Bonding', 'Finalized'][stat._id] || 'Unknown',
          count: stat.count,
          totalETH: stat.totalETH.toString()
        }))
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 