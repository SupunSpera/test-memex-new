const { ethers } = require('ethers');
const logger = require('../utils/logger');

// Contract ABIs (simplified for essential functions)
const FACTORY_ABI = [
  "function getDeploymentFee() external view returns (uint256)",
  "function deployBondingCurveSystem(string calldata name, string calldata symbol) external payable returns (address tokenAddress, address bondingCurveAddress)",
  "function getBondingCurveSettings() external view returns (tuple(uint256 virtualEth, uint256 bondingTarget, uint256 minContribution, uint24 poolFee, uint24 sellFee, address uniswapV3Factory, address positionManager, address weth, address feeTo))",
  "function updateBondingCurveSettings(tuple(uint256 virtualEth, uint256 bondingTarget, uint256 minContribution, uint24 poolFee, uint24 sellFee, address uniswapV3Factory, address positionManager, address weth, address feeTo) newSettings) external",
  "event BondingCurveSystemDeployed(address indexed bondingCurveAddress, address indexed tokenAddress, address indexed owner, string name, string symbol)"
];

const BONDING_CURVE_ABI = [
  "function buyTokens(uint256 minTokens) external payable returns (uint256 tokensToReceive)",
  "function sellTokens(uint256 tokenAmount, uint256 minETH) external returns (uint256 ethToReceive, uint256 fee)",
  "function finalizeCurve() external",
  "function token() external view returns (address)",
  "function currentPhase() external view returns (uint8)",
  "function ethReserve() external view returns (uint256)",
  "function tokenReserve() external view returns (uint256)",
  "function totalETHCollected() external view returns (uint256)",
  "function isFinalized() external view returns (bool)",
  "function getBondingCurveSettings() external view returns (tuple(uint256 virtualEth, uint256 bondingTarget, uint256 minContribution, uint24 poolFee, uint24 sellFee, address uniswapV3Factory, address positionManager, address weth, address feeTo))",
  "event TokensPurchased(address indexed user, uint256 ethAmount, uint256 tokensOut)",
  "event TokensSold(address indexed user, uint256 tokensIn, uint256 ethOut, uint256 fee)",
  "event CurveFinalized(address indexed pool, uint256 lpTokenId)"
];

const TOKEN_ABI = [
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)",
  "function totalSupply() external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) external returns (bool)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
];

class Web3Service {
  constructor() {
    this.provider = null;
    this.factoryContract = null;
    this.bondingCurveContract = null;
    this.isInitialized = false;
  }

  // Helper function to create wallet from either private key or mnemonic
  createWallet(keyOrMnemonic) {
    try {
      // Remove '0x' prefix if present and clean the input
      const cleanInput = keyOrMnemonic.trim().replace(/^0x/, '');
      
      // Check if it's a private key (64 hex characters)
      if (/^[a-fA-F0-9]{64}$/.test(cleanInput)) {
        return new ethers.Wallet('0x' + cleanInput, this.provider);
      }
      
      // If not a private key, treat as mnemonic
      const words = cleanInput.split(' ').filter(word => word.length > 0);
      if (words.length >= 12) {
        // It's a mnemonic phrase
        const wallet = ethers.Wallet.fromPhrase(cleanInput, this.provider);
        logger.info(`Created wallet from mnemonic. Address: ${wallet.address}`);
        return wallet;
      }
      
      throw new Error('Invalid private key or mnemonic phrase format');
    } catch (error) {
      logger.error('Error creating wallet:', error.message);
      throw new Error(`Invalid private key or mnemonic: ${error.message}`);
    }
  }

  async initializeWeb3() {
    try {
      // Initialize provider (using testnet since contracts are deployed there)
      const rpcUrl = process.env.ABSTRACT_TESTNET_RPC_URL || 'https://api.testnet.abs.xyz';
      this.provider = new ethers.JsonRpcProvider(rpcUrl);

      // Test the connection
      const network = await this.provider.getNetwork();
      logger.info(`Connected to Abstract L2 - Chain ID: ${network.chainId}`);

      // Initialize factory contract
      const factoryAddress = process.env.FACTORY_ADDRESS;
      if (!factoryAddress) {
        throw new Error('Factory address not provided in environment variables');
      }

      this.factoryContract = new ethers.Contract(factoryAddress, FACTORY_ABI, this.provider);

      logger.info(`Factory contract initialized at: ${factoryAddress}`);
      this.isInitialized = true;

      return true;
    } catch (error) {
      logger.error('Failed to initialize Web3 service:', error);
      throw error;
    }
  }

  // Admin functions
  async getDeploymentFee() {
    try {
      const fee = await this.factoryContract.getDeploymentFee();
      return ethers.formatEther(fee);
    } catch (error) {
      logger.error('Error getting deployment fee:', error);
      throw error;
    }
  }

  async updateDeploymentFee(newFeeInEth, adminPrivateKey) {
    try {
      const wallet = this.createWallet(adminPrivateKey);
      const factoryWithSigner = this.factoryContract.connect(wallet);
      
      const feeInWei = ethers.parseEther(newFeeInEth.toString());
      const tx = await factoryWithSigner.updateDeploymentFee(feeInWei);
      
      logger.info(`Deployment fee update transaction: ${tx.hash}`);
      const receipt = await tx.wait();
      
      return {
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        success: true
      };
    } catch (error) {
      logger.error('Error updating deployment fee:', error);
      throw error;
    }
  }

  async getBondingCurveSettings() {
    try {
      const settings = await this.factoryContract.getBondingCurveSettings();
      return {
        virtualEth: ethers.formatEther(settings.virtualEth),
        bondingTarget: ethers.formatEther(settings.bondingTarget),
        minContribution: ethers.formatEther(settings.minContribution),
        poolFee: settings.poolFee.toString(),
        sellFee: settings.sellFee.toString(),
        uniswapV3Factory: settings.uniswapV3Factory,
        positionManager: settings.positionManager,
        weth: settings.weth,
        feeTo: settings.feeTo
      };
    } catch (error) {
      logger.error('Error getting bonding curve settings:', error);
      throw error;
    }
  }

  async updateBondingCurveSettings(newSettings, adminPrivateKey) {
    try {
      const wallet = this.createWallet(adminPrivateKey);
      const factoryWithSigner = this.factoryContract.connect(wallet);

      // Convert settings to proper format
      const settingsStruct = {
        virtualEth: ethers.parseEther(newSettings.virtualEth.toString()),
        bondingTarget: ethers.parseEther(newSettings.bondingTarget.toString()),
        minContribution: ethers.parseEther(newSettings.minContribution.toString()),
        poolFee: newSettings.poolFee,
        sellFee: newSettings.sellFee,
        uniswapV3Factory: newSettings.uniswapV3Factory,
        positionManager: newSettings.positionManager,
        weth: newSettings.weth,
        feeTo: newSettings.feeTo
      };

      const tx = await factoryWithSigner.updateBondingCurveSettings(settingsStruct);
      
      logger.info(`Bonding curve settings update transaction: ${tx.hash}`);
      const receipt = await tx.wait();
      
      return {
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        success: true
      };
    } catch (error) {
      logger.error('Error updating bonding curve settings:', error);
      throw error;
    }
  }

  async withdrawFees(recipient, adminPrivateKey) {
    try {
      const wallet = this.createWallet(adminPrivateKey);
      const factoryWithSigner = this.factoryContract.connect(wallet);
      
      const tx = await factoryWithSigner.withdrawFees(recipient);
      
      logger.info(`Fee withdrawal transaction: ${tx.hash}`);
      const receipt = await tx.wait();
      
      return {
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        success: true
      };
    } catch (error) {
      logger.error('Error withdrawing fees:', error);
      throw error;
    }
  }

  // User functions
  async deployToken(name, symbol, userPrivateKey) {
    try {
      const wallet = this.createWallet(userPrivateKey);
      const factoryWithSigner = this.factoryContract.connect(wallet);
      
      // Automatically fetch the current deployment fee from the contract
      const currentFee = await this.factoryContract.getDeploymentFee();
      logger.info(`Auto-fetched deployment fee: ${ethers.formatEther(currentFee)} ETH`);
      
      const tx = await factoryWithSigner.deployBondingCurveSystem(name, symbol, {
        value: currentFee
      });
      
      logger.info(`Token deployment transaction: ${tx.hash}`);
      const receipt = await tx.wait();
      
      // Parse events to get deployed addresses
      const event = receipt.logs.find(log => {
        try {
          const parsed = this.factoryContract.interface.parseLog(log);
          return parsed.name === 'BondingCurveSystemDeployed';
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = this.factoryContract.interface.parseLog(event);
        return {
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          tokenAddress: parsed.args.tokenAddress,
          bondingCurveAddress: parsed.args.bondingCurveAddress,
          owner: parsed.args.owner,
          name: parsed.args.name,
          symbol: parsed.args.symbol,
          success: true
        };
      }

      throw new Error('Deployment event not found in transaction receipt');
    } catch (error) {
      logger.error('Error deploying token:', error);
      throw error;
    }
  }

  // Bonding curve functions
  getBondingCurveContract(bondingCurveAddress) {
    return new ethers.Contract(bondingCurveAddress, BONDING_CURVE_ABI, this.provider);
  }

  getTokenContract(tokenAddress) {
    return new ethers.Contract(tokenAddress, TOKEN_ABI, this.provider);
  }

  async getBondingCurveInfo(bondingCurveAddress) {
    try {
      const contract = this.getBondingCurveContract(bondingCurveAddress);
      
      const [
        currentPhase,
        ethReserve,
        tokenReserve,
        totalETHCollected,
        isFinalized,
        settings
      ] = await Promise.all([
        contract.currentPhase(),
        contract.ethReserve(),
        contract.tokenReserve(),
        contract.totalETHCollected(),
        contract.isFinalized(),
        contract.getBondingCurveSettings()
      ]);

      const totalCollectedEth = parseFloat(ethers.formatEther(totalETHCollected));
      const bondingTargetEth = parseFloat(ethers.formatEther(settings.bondingTarget));
      const progressPercentage = bondingTargetEth === 0 ? 0 : Math.min((totalCollectedEth / bondingTargetEth) * 100, 100);

      const ethReserveEth = parseFloat(ethers.formatEther(ethReserve));
      const virtualEth = parseFloat(ethers.formatEther(settings.virtualEth));
      const netEthInCurve = Math.max(ethReserveEth - virtualEth, 0);
      const liveProgressPercentage = bondingTargetEth === 0 ? 0 : Math.min((netEthInCurve / bondingTargetEth) * 100, 100);
      const liveRemainingETHToTarget = (bondingTargetEth - netEthInCurve).toString();

      return {
        currentPhase: parseInt(currentPhase.toString()),
        ethReserve: ethers.formatEther(ethReserve),
        tokenReserve: ethers.formatUnits(tokenReserve, 18),
        totalETHCollected: totalCollectedEth.toString(),
        isFinalized,
        progressPercentage: progressPercentage,
        remainingETHToTarget: (bondingTargetEth - totalCollectedEth).toString(),
        liveProgressPercentage: liveProgressPercentage,
        liveRemainingETHToTarget: liveRemainingETHToTarget,
        settings: {
          virtualEth: ethers.formatEther(settings.virtualEth),
          bondingTarget: bondingTargetEth.toString(),
          minContribution: ethers.formatEther(settings.minContribution),
          poolFee: settings.poolFee.toString(),
          sellFee: settings.sellFee.toString(),
          uniswapV3Factory: settings.uniswapV3Factory,
          positionManager: settings.positionManager,
          weth: settings.weth,
          feeTo: settings.feeTo
        }
      };
    } catch (error) {
      logger.error('Error getting bonding curve info:', error);
      throw error;
    }
  }

  async getTokenInfo(tokenAddress) {
    try {
      const contract = this.getTokenContract(tokenAddress);
      
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.decimals(),
        contract.totalSupply()
      ]);

      return {
        name,
        symbol,
        decimals: parseInt(decimals.toString()),
        totalSupply: ethers.formatUnits(totalSupply, decimals)
      };
    } catch (error) {
      logger.error('Error getting token info:', error);
      throw error;
    }
  }

  async getUserContribution(bondingCurveAddress, userAddress) {
    // This function is no longer applicable since we removed prebonding contributions
    // All tokens are now directly traded through buyTokens/sellTokens
    return {
      contribution: '0',
      tokenAllocation: '0'
    };
  }

  // Transaction monitoring
  async getTransactionReceipt(txHash) {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      return receipt;
    } catch (error) {
      logger.error('Error getting transaction receipt:', error);
      throw error;
    }
  }

  async getBlockNumber() {
    try {
      return await this.provider.getBlockNumber();
    } catch (error) {
      logger.error('Error getting block number:', error);
      throw error;
    }
  }

  // Utility functions
  isValidAddress(address) {
    return ethers.isAddress(address);
  }

  formatEther(value) {
    return ethers.formatEther(value);
  }

  parseEther(value) {
    // Fix: Ensure value doesn't have too many decimal places
    let valueFixed = parseFloat(value.toString());
    // Truncate to 18 decimal places to avoid parseEther overflow
    valueFixed = Math.floor(valueFixed * 1e18) / 1e18;
    return ethers.parseEther(valueFixed.toString());
  }

  // Trading functions
  async buyTokens(bondingCurveAddress, ethAmount, minTokens, userPrivateKey) {
    try {
      const wallet = this.createWallet(userPrivateKey);
      const contract = this.getBondingCurveContract(bondingCurveAddress);
      const contractWithSigner = contract.connect(wallet);

      // Fix: Ensure ethAmount doesn't have too many decimal places
      let ethAmountFixed = parseFloat(ethAmount.toString());
      // Truncate to 18 decimal places to avoid parseEther overflow
      ethAmountFixed = Math.floor(ethAmountFixed * 1e18) / 1e18;
      const value = ethers.parseEther(ethAmountFixed.toString());
      
      const minTokensWei = ethers.parseUnits(minTokens.toString(), 18);
      
      const tx = await contractWithSigner.buyTokens(minTokensWei, {
        value: value
      });

      logger.info(`Buy tokens transaction: ${tx.hash}`);
      const receipt = await tx.wait();

      // Parse events to get actual tokens received
      let tokensReceived = '0';
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed.name === 'TokensPurchased') {
            tokensReceived = ethers.formatUnits(parsed.args.tokensOut, 18);
            break;
          }
        } catch (e) {
          // Ignore parsing errors for other events
        }
      }

      return {
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        buyer: wallet.address,
        ethSpent: ethAmount,
        tokensReceived,
        success: true
      };
    } catch (error) {
      logger.error('Error buying tokens:', error);
      throw error;
    }
  }

  async sellTokens(bondingCurveAddress, tokenAmount, minEth, userPrivateKey) {
    try {
      const wallet = this.createWallet(userPrivateKey);
      const contract = this.getBondingCurveContract(bondingCurveAddress);
      const contractWithSigner = contract.connect(wallet);

      // Get the token address from the bonding curve
      const tokenAddress = await contract.token();
      const tokenContract = this.getTokenContract(tokenAddress);
      const tokenWithSigner = tokenContract.connect(wallet);

      const tokenAmountWei = ethers.parseUnits(tokenAmount.toString(), 18);
      
      // Fix: Ensure minEth doesn't have too many decimal places
      let minEthFixed = parseFloat(minEth.toString());
      // Truncate to 18 decimal places to avoid parseEther overflow
      minEthFixed = Math.floor(minEthFixed * 1e18) / 1e18;
      const minEthWei = ethers.parseEther(minEthFixed.toString());

      // Check current allowance
      const currentAllowance = await tokenContract.allowance(wallet.address, bondingCurveAddress);
      
      // If allowance is insufficient, approve the tokens first
      if (currentAllowance < tokenAmountWei) {
        logger.info(`Current allowance: ${ethers.formatUnits(currentAllowance, 18)} GTH`);
        logger.info(`Required amount: ${ethers.formatUnits(tokenAmountWei, 18)} GTH`);
        logger.info('Insufficient allowance. Approving tokens...');
        
        // Approve the bonding curve to spend tokens
        const approveTx = await tokenWithSigner.approve(bondingCurveAddress, tokenAmountWei);
        logger.info(`Token approval transaction: ${approveTx.hash}`);
        await approveTx.wait();
        logger.info('Token approval confirmed');
      }
      
      const tx = await contractWithSigner.sellTokens(tokenAmountWei, minEthWei);

      logger.info(`Sell tokens transaction: ${tx.hash}`);
      const receipt = await tx.wait();

      // Parse events to get actual ETH received
      let ethReceived = '0';
      let fee = '0';
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed.name === 'TokensSold') {
            ethReceived = ethers.formatEther(parsed.args.ethOut);
            fee = ethers.formatEther(parsed.args.fee);
            break;
          }
        } catch (e) {
          // Ignore parsing errors for other events
        }
      }

      return {
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        tokensSold: tokenAmount,
        ethReceived,
        fee,
        success: true
      };
    } catch (error) {
      logger.error('Error selling tokens:', error);
      throw error;
    }
  }

  async getQuoteForBuy(bondingCurveAddress, ethAmount) {
    try {
      const contract = this.getBondingCurveContract(bondingCurveAddress);
      
      // Get current bonding curve state
      const [ethReserve, tokenReserve, settings] = await Promise.all([
        contract.ethReserve(),
        contract.tokenReserve(), 
        contract.getBondingCurveSettings()
      ]);

      // Fix: Ensure ethAmount doesn't have too many decimal places
      let ethAmountFixed = parseFloat(ethAmount.toString());
      // Truncate to 18 decimal places to avoid parseEther overflow
      ethAmountFixed = Math.floor(ethAmountFixed * 1e18) / 1e18;
      const ethAmountWei = ethers.parseEther(ethAmountFixed.toString());
      
      // Calculate using bonding curve formula (matches smart contract)
      // tokensOut = (ethIn * tokenReserve) / (ethReserve + ethIn)
      const numerator = ethAmountWei * tokenReserve;
      const denominator = ethReserve + ethAmountWei;
      const tokensOut = numerator / denominator;

      return {
        ethAmount,
        tokensOut: ethers.formatUnits(tokensOut, 18),
        pricePerToken: ethAmount / parseFloat(ethers.formatUnits(tokensOut, 18)),
        slippage: '2.5' // Default 2.5% slippage
      };
    } catch (error) {
      logger.error('Error getting buy quote:', error);
      throw error;
    }
  }

  async getQuoteForSell(bondingCurveAddress, tokenAmount) {
    try {
      const contract = this.getBondingCurveContract(bondingCurveAddress);
      
      // Get current bonding curve state
      const [ethReserve, tokenReserve, settings] = await Promise.all([
        contract.ethReserve(),
        contract.tokenReserve(),
        contract.getBondingCurveSettings()
      ]);

      const tokenAmountWei = ethers.parseUnits(tokenAmount.toString(), 18);
      const sellFee = settings.sellFee;
      
      // Calculate using bonding curve formula (matches smart contract)
      // ethOut = (tokenIn * ethReserve) / (tokenReserve + tokenIn)
      const numerator = tokenAmountWei * ethReserve;
      const denominator = tokenReserve + tokenAmountWei;
      const ethOut = numerator / denominator;
      
      // Apply sell fee
      const feeAmount = (ethOut * BigInt(sellFee)) / BigInt(10000);
      const ethAfterFee = ethOut - feeAmount;

      return {
        tokenAmount,
        ethOut: ethers.formatEther(ethAfterFee),
        fee: ethers.formatEther(feeAmount),
        pricePerToken: parseFloat(ethers.formatEther(ethOut)) / tokenAmount,
        slippage: '2.5' // Default 2.5% slippage
      };
    } catch (error) {
      logger.error('Error getting sell quote:', error);
      throw error;
    }
  }

  async getUserTokenBalance(tokenAddress, userAddress) {
    try {
      const contract = this.getTokenContract(tokenAddress);
      const balance = await contract.balanceOf(userAddress);
      return ethers.formatUnits(balance, 18);
    } catch (error) {
      logger.error('Error getting user token balance:', error);
      throw error;
    }
  }

  async getTokenAllowance(tokenAddress, ownerAddress, spenderAddress) {
    try {
      const contract = this.getTokenContract(tokenAddress);
      const allowance = await contract.allowance(ownerAddress, spenderAddress);
      return ethers.formatUnits(allowance, 18);
    } catch (error) {
      logger.error('Error getting token allowance:', error);
      throw error;
    }
  }

  // Event history functions
  async getTradingHistory(bondingCurveAddress, options = {}) {
    try {
      const { limit = 50, offset = 0, type = null } = options;
      const contract = this.getBondingCurveContract(bondingCurveAddress);

      // Define the events we want to fetch
      const eventFilters = [];
      
      if (!type || type === 'buy') {
        eventFilters.push(contract.filters.TokensPurchased());
      }
      if (!type || type === 'sell') {
        eventFilters.push(contract.filters.TokensSold());
      }

      // Get the latest block number
      const currentBlock = await this.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 10000); // Last 10000 blocks (adjust as needed)

      let allEvents = [];

      // Fetch events for each filter
      for (const filter of eventFilters) {
        try {
          const events = await contract.queryFilter(filter, fromBlock, currentBlock);
          
          for (const event of events) {
            const block = await this.provider.getBlock(event.blockNumber);
            
            let tradeData = {
              id: `${event.transactionHash}-${event.logIndex}`,
              transactionHash: event.transactionHash,
              blockNumber: event.blockNumber,
              timestamp: new Date(block.timestamp * 1000),
              user: '',
              type: '',
              ethAmount: '0',
              tokenAmount: '0',
              fee: '0'
            };

            // Parse different event types
            if (event.fragment.name === 'TokensPurchased') {
              tradeData.type = 'buy';
              tradeData.user = event.args.user;
              tradeData.ethAmount = ethers.formatEther(event.args.ethAmount);
              tradeData.tokenAmount = ethers.formatUnits(event.args.tokensOut, 18);
            } else if (event.fragment.name === 'TokensSold') {
              tradeData.type = 'sell';
              tradeData.user = event.args.user;
              tradeData.ethAmount = ethers.formatEther(event.args.ethOut);
              tradeData.tokenAmount = ethers.formatUnits(event.args.tokensIn, 18);
              tradeData.fee = ethers.formatEther(event.args.fee);
            }

            allEvents.push(tradeData);
          }
        } catch (eventError) {
          logger.error(`Error fetching ${filter.fragment?.name || 'unknown'} events:`, eventError);
          // Continue with other events even if one fails
        }
      }

      // Sort by timestamp (newest first)
      allEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Apply pagination
      const paginatedEvents = allEvents.slice(offset, offset + limit);

      return {
        trades: paginatedEvents,
        total: allEvents.length,
        hasMore: offset + limit < allEvents.length
      };

    } catch (error) {
      logger.error('Error getting trading history:', error);
      throw error;
    }
  }

  async getRecentTrades(bondingCurveAddress, count = 10) {
    try {
      const history = await this.getTradingHistory(bondingCurveAddress, { 
        limit: count, 
        offset: 0 
      });
      return history.trades;
    } catch (error) {
      logger.error('Error getting recent trades:', error);
      throw error;
    }
  }

  async getUserTradingHistory(bondingCurveAddress, userAddress, options = {}) {
    try {
      const { limit = 50, offset = 0 } = options;
      const contract = this.getBondingCurveContract(bondingCurveAddress);

      // Get the latest block number
      const currentBlock = await this.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 10000);

      // Create filters for the specific user
      const buyFilter = contract.filters.TokensPurchased(userAddress);
      const sellFilter = contract.filters.TokensSold(userAddress);

      let userEvents = [];

      // Fetch user-specific events
      for (const filter of [buyFilter, sellFilter]) {
        try {
          const events = await contract.queryFilter(filter, fromBlock, currentBlock);
          
          for (const event of events) {
            const block = await this.provider.getBlock(event.blockNumber);
            
            let tradeData = {
              id: `${event.transactionHash}-${event.logIndex}`,
              transactionHash: event.transactionHash,
              blockNumber: event.blockNumber,
              timestamp: new Date(block.timestamp * 1000),
              type: '',
              ethAmount: '0',
              tokenAmount: '0',
              fee: '0'
            };

            // Parse different event types
            if (event.fragment.name === 'TokensPurchased') {
              tradeData.type = 'buy';
              tradeData.ethAmount = ethers.formatEther(event.args.ethAmount);
              tradeData.tokenAmount = ethers.formatUnits(event.args.tokensOut, 18);
            } else if (event.fragment.name === 'TokensSold') {
              tradeData.type = 'sell';
              tradeData.ethAmount = ethers.formatEther(event.args.ethOut);
              tradeData.tokenAmount = ethers.formatUnits(event.args.tokensIn, 18);
              tradeData.fee = ethers.formatEther(event.args.fee);
            }

            userEvents.push(tradeData);
          }
        } catch (eventError) {
          logger.error(`Error fetching user events:`, eventError);
        }
      }

      // Sort by timestamp (newest first)
      userEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Apply pagination
      const paginatedEvents = userEvents.slice(offset, offset + limit);

      return {
        trades: paginatedEvents,
        total: userEvents.length,
        hasMore: offset + limit < userEvents.length
      };

    } catch (error) {
      logger.error('Error getting user trading history:', error);
      throw error;
    }
  }

  async approveTokens(tokenAddress, spenderAddress, amount, userPrivateKey) {
    try {
      const wallet = this.createWallet(userPrivateKey);
      const tokenContract = this.getTokenContract(tokenAddress);
      const tokenWithSigner = tokenContract.connect(wallet);

      const amountWei = ethers.parseUnits(amount.toString(), 18);
      
      const tx = await tokenWithSigner.approve(spenderAddress, amountWei);
      logger.info(`Token approval transaction: ${tx.hash}`);
      const receipt = await tx.wait();

      return {
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        tokenAddress,
        spenderAddress,
        approvedAmount: amount,
        success: true
      };
    } catch (error) {
      logger.error('Error approving tokens:', error);
      throw error;
    }
  }
}

// Create singleton instance
const web3Service = new Web3Service();

const initializeWeb3 = async () => {
  await web3Service.initializeWeb3();
};

module.exports = {
  web3Service,
  initializeWeb3
}; 