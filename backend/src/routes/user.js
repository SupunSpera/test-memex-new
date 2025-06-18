const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { StatusCodes } = require('http-status-codes');
const { web3Service } = require('../services/web3Service');
const Token = require('../models/Token');
const logger = require('../utils/logger');

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

// GET /api/user/deployment-fee - Get current deployment fee
router.get('/deployment-fee', async (req, res, next) => {
  try {
    const deploymentFee = await web3Service.getDeploymentFee();
    
    res.json({
      success: true,
      data: {
        deploymentFee,
        currency: 'ETH'
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/user/settings - Get bonding curve settings
router.get('/settings', async (req, res, next) => {
  try {
    const settings = await web3Service.getBondingCurveSettings();
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/user/deploy-token - Deploy a new token
router.post('/deploy-token',
  [
    body('name')
      .isLength({ min: 1, max: 100 })
      .trim()
      .withMessage('Token name must be between 1-100 characters'),
    body('symbol')
      .isLength({ min: 1, max: 20 })
      .trim()
      .toUpperCase()
      .withMessage('Token symbol must be between 1-20 characters'),
    body('description')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Description must be less than 1000 characters'),
    body('image')
      .optional()
      .isURL()
      .withMessage('Image must be a valid URL'),
    body('website')
      .optional()
      .isURL()
      .withMessage('Website must be a valid URL'),
    body('twitter')
      .optional()
      .isString()
      .withMessage('Twitter must be a string'),
    body('telegram')
      .optional()
      .isString()
      .withMessage('Telegram must be a string'),
    body('discord')
      .optional()
      .isString()
      .withMessage('Discord must be a string'),
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array'),
    body('privateKey')
      .isLength({ min: 64, max: 66 })
      .withMessage('Invalid private key format')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const {
        name,
        symbol,
        description = '',
        image = '',
        website = '',
        twitter = '',
        telegram = '',
        discord = '',
        tags = [],
        privateKey
      } = req.body;

      // Check if token with same name or symbol already exists
      const existingToken = await Token.findOne({
        $or: [
          { name: { $regex: new RegExp(`^${name}$`, 'i') } },
          { symbol: symbol.toUpperCase() }
        ]
      });

      if (existingToken) {
        return res.status(StatusCodes.CONFLICT).json({
          success: false,
          message: 'Token with this name or symbol already exists'
        });
      }

      // Deploy token through smart contract
      logger.info(`Deploying token: ${name} (${symbol})`);
      
      const deploymentResult = await web3Service.deployToken(
        name,
        symbol,
        privateKey
      );

      // Get the deployment fee that was actually used for the database record
      const deploymentFeeUsed = await web3Service.getDeploymentFee();

      // Save token to database
      const tokenData = {
        name,
        symbol: symbol.toUpperCase(),
        tokenAddress: deploymentResult.tokenAddress.toLowerCase(),
        bondingCurveAddress: deploymentResult.bondingCurveAddress.toLowerCase(),
        owner: deploymentResult.owner.toLowerCase(),
        deploymentTxHash: deploymentResult.transactionHash.toLowerCase(),
        deploymentBlockNumber: deploymentResult.blockNumber,
        deploymentFee: deploymentFeeUsed,
        description,
        image,
        website,
        twitter,
        telegram,
        discord,
        tags: tags.map(tag => tag.toLowerCase().trim()),
        currentPhase: 0, // PreBonding
        isFinalized: false,
        isActive: true
      };

      const token = new Token(tokenData);
      await token.save();

      logger.info(`Token deployed and saved: ${name} (${symbol})`, {
        tokenAddress: deploymentResult.tokenAddress,
        bondingCurveAddress: deploymentResult.bondingCurveAddress,
        transactionHash: deploymentResult.transactionHash
      });

      res.status(StatusCodes.CREATED).json({
        success: true,
        message: 'Token deployed successfully',
        data: {
          token,
          deployment: deploymentResult
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/user/tokens/:address - Get token details
router.get('/tokens/:address',
  [
    param('address').isEthereumAddress().withMessage('Invalid token address')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { address } = req.params;
      
      // Get token from database
      const token = await Token.findByAddress(address);
      if (!token) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Token not found'
        });
      }

      // Get live data from blockchain
      const [bondingCurveInfo, tokenInfo] = await Promise.all([
        web3Service.getBondingCurveInfo(token.bondingCurveAddress),
        web3Service.getTokenInfo(token.tokenAddress)
      ]);

      // Update token with live data
      await token.updateTradingStats({
        totalETHCollected: bondingCurveInfo.totalETHCollected,
        ethReserve: bondingCurveInfo.ethReserve,
        tokenReserve: bondingCurveInfo.tokenReserve,
        currentPhase: bondingCurveInfo.currentPhase,
        isFinalized: bondingCurveInfo.isFinalized
      });

      res.json({
        success: true,
        data: {
          token,
          bondingCurve: bondingCurveInfo,
          tokenInfo
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/user/tokens/:address/contribution/:userAddress - Get user contribution
router.get('/tokens/:address/contribution/:userAddress',
  [
    param('address').isEthereumAddress().withMessage('Invalid token address'),
    param('userAddress').isEthereumAddress().withMessage('Invalid user address')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { address, userAddress } = req.params;
      
      const token = await Token.findByAddress(address);
      if (!token) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Token not found'
        });
      }

      const contribution = await web3Service.getUserContribution(
        token.bondingCurveAddress,
        userAddress
      );

      res.json({
        success: true,
        data: contribution
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/user/my-tokens/:ownerAddress - Get tokens owned by user
router.get('/my-tokens/:ownerAddress',
  [
    param('ownerAddress').isEthereumAddress().withMessage('Invalid owner address'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1-50')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { ownerAddress } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const [tokens, total] = await Promise.all([
        Token.findByOwner(ownerAddress)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Token.countDocuments({ owner: ownerAddress.toLowerCase() })
      ]);

      res.json({
        success: true,
        data: {
          tokens,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/user/tokens/:address/metadata - Update token metadata
router.put('/tokens/:address/metadata',
  [
    param('address').isEthereumAddress().withMessage('Invalid token address'),
    body('description')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Description must be less than 1000 characters'),
    body('image')
      .optional()
      .isURL()
      .withMessage('Image must be a valid URL'),
    body('website')
      .optional()
      .isURL()
      .withMessage('Website must be a valid URL'),
    body('twitter')
      .optional()
      .isString()
      .withMessage('Twitter must be a string'),
    body('telegram')
      .optional()
      .isString()
      .withMessage('Telegram must be a string'),
    body('discord')
      .optional()
      .isString()
      .withMessage('Discord must be a string'),
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array'),
    body('ownerAddress')
      .isEthereumAddress()
      .withMessage('Invalid owner address')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { address } = req.params;
      const { ownerAddress, ...updates } = req.body;

      const token = await Token.findByAddress(address);
      if (!token) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Token not found'
        });
      }

      // Check if the requester is the owner
      if (token.owner.toLowerCase() !== ownerAddress.toLowerCase()) {
        return res.status(StatusCodes.FORBIDDEN).json({
          success: false,
          message: 'Only token owner can update metadata'
        });
      }

      // Update allowed fields
      const allowedUpdates = ['description', 'image', 'website', 'twitter', 'telegram', 'discord', 'tags'];
      allowedUpdates.forEach(field => {
        if (updates[field] !== undefined) {
          if (field === 'tags' && Array.isArray(updates[field])) {
            token[field] = updates[field].map(tag => tag.toLowerCase().trim());
          } else {
            token[field] = updates[field];
          }
        }
      });

      await token.save();

      logger.info(`Token metadata updated: ${address}`, { updates });

      res.json({
        success: true,
        message: 'Token metadata updated successfully',
        data: token
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/user/validate-address/:address - Validate if address is a valid Ethereum address
router.get('/validate-address/:address',
  [
    param('address').isString().withMessage('Address must be a string')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { address } = req.params;
      const isValid = web3Service.isValidAddress(address);

      res.json({
        success: true,
        data: {
          address,
          isValid
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/user/transaction/:hash - Get transaction status
router.get('/transaction/:hash',
  [
    param('hash').isLength({ min: 66, max: 66 }).withMessage('Invalid transaction hash')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { hash } = req.params;
      
      const receipt = await web3Service.getTransactionReceipt(hash);
      
      if (!receipt) {
        return res.json({
          success: true,
          data: {
            hash,
            status: 'pending',
            receipt: null
          }
        });
      }

      res.json({
        success: true,
        data: {
          hash,
          status: receipt.status === 1 ? 'success' : 'failed',
          receipt: {
            blockNumber: receipt.blockNumber,
            blockHash: receipt.blockHash,
            gasUsed: receipt.gasUsed.toString(),
            effectiveGasPrice: receipt.effectiveGasPrice?.toString(),
            confirmations: await web3Service.getBlockNumber() - receipt.blockNumber
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/user/register-token - Register a token that was deployed from frontend
router.post('/register-token',
  [
    body('name')
      .isLength({ min: 1, max: 100 })
      .trim()
      .withMessage('Token name must be between 1-100 characters'),
    body('symbol')
      .isLength({ min: 1, max: 20 })
      .trim()
      .toUpperCase()
      .withMessage('Token symbol must be between 1-20 characters'),
    body('tokenAddress')
      .isEthereumAddress()
      .withMessage('Invalid token address'),
    body('bondingCurveAddress')
      .isEthereumAddress()
      .withMessage('Invalid bonding curve address'),
    body('owner')
      .isEthereumAddress()
      .withMessage('Invalid owner address'),
    body('deploymentTxHash')
      .isLength({ min: 66, max: 66 })
      .withMessage('Invalid deployment transaction hash'),
    body('deploymentBlockNumber')
      .isInt({ min: 1 })
      .withMessage('Invalid deployment block number'),
    body('description')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Description must be less than 1000 characters'),
    body('image')
      .optional()
      .isURL()
      .withMessage('Image must be a valid URL'),
    body('website')
      .optional()
      .isURL()
      .withMessage('Website must be a valid URL'),
    body('twitter')
      .optional()
      .isString()
      .withMessage('Twitter must be a string'),
    body('telegram')
      .optional()
      .isString()
      .withMessage('Telegram must be a string'),
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array')
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const {
        name,
        symbol,
        tokenAddress,
        bondingCurveAddress,
        owner,
        deploymentTxHash,
        deploymentBlockNumber,
        description = '',
        image = '',
        website = '',
        twitter = '',
        telegram = '',
        tags = []
      } = req.body;

      // Check if token already exists
      const existingToken = await Token.findOne({
        $or: [
          { tokenAddress: tokenAddress.toLowerCase() },
          { bondingCurveAddress: bondingCurveAddress.toLowerCase() }
        ]
      });

      if (existingToken) {
        return res.status(StatusCodes.CONFLICT).json({
          success: false,
          message: 'Token with this address already exists'
        });
      }

      // Verify the deployment transaction exists and is valid
      const receipt = await web3Service.getTransactionReceipt(deploymentTxHash);
      if (!receipt || receipt.status !== 1) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Invalid or failed deployment transaction'
        });
      }

      // Get the deployment fee for the database record
      const deploymentFeeUsed = await web3Service.getDeploymentFee();

      // Save token to database
      const tokenData = {
        name,
        symbol: symbol.toUpperCase(),
        tokenAddress: tokenAddress.toLowerCase(),
        bondingCurveAddress: bondingCurveAddress.toLowerCase(),
        owner: owner.toLowerCase(),
        deploymentTxHash: deploymentTxHash.toLowerCase(),
        deploymentBlockNumber,
        deploymentFee: deploymentFeeUsed,
        description,
        image,
        website,
        twitter,
        telegram,
        tags: tags.map(tag => tag.toLowerCase().trim()),
        currentPhase: 0, // PreBonding
        isFinalized: false,
        isActive: true
      };

      const token = new Token(tokenData);
      await token.save();

      logger.info(`Frontend-deployed token registered: ${name} (${symbol})`, {
        tokenAddress,
        bondingCurveAddress,
        deploymentTxHash
      });

      res.status(StatusCodes.CREATED).json({
        success: true,
        message: 'Token registered successfully',
        data: token
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router; 