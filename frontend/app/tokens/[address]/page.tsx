'use client';

import { useState, useEffect } from 'react';
import { useAccount, useSigner } from 'wagmi';
import { useRouter, useParams } from 'next/navigation';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { TOKEN_ABI, BONDING_CURVE_ABI } from '../../contracts/abis';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import Image from 'next/image';

declare module 'chart.js';
declare module 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface TokenInfo {
  name: string;
  symbol: string;
  tokenAddress: string;
  bondingCurveAddress: string;
  description: string;
  image: string;
  website: string;
  twitter: string;
  telegram: string;
  tags: string[];
  deploymentTxHash: string;
  deploymentBlockNumber: number;
  owner: string;
  isFinalized?: boolean;
  // Backend fields
  _id?: string;
  totalETHCollected?: string;
  isActive?: boolean;
  createdAt?: string;
}

interface PriceHistoryPoint {
  timestamp: number;
  price: string;
}

interface Transaction {
  type: 'Buy' | 'Sell';
  amount: string;
  price: string;
  total: string;
  timestamp: number;
  hash: string;
}

interface ApiResponse {
  success: boolean;
  data: {
    tokens: TokenInfo[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export default function TokenPage() {
  const params = useParams();
  const address = typeof params.address === 'string' ? params.address : '';
  const { isConnected } = useAccount();
  const { data: signer } = useSigner();
  const router = useRouter();
  const [token, setToken] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [buyAmount, setBuyAmount] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  const [tokenBalance, setTokenBalance] = useState('0');
  const [ethBalance, setEthBalance] = useState('0');
  const [price, setPrice] = useState('0');
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFinalized, setIsFinalized] = useState<boolean>(false);
  const [buyLoading, setBuyLoading] = useState(false);
  const [sellLoading, setSellLoading] = useState(false);
  
  // Bonding curve progress state
  const [bondingProgress, setBondingProgress] = useState({
    totalETHCollected: '0',
    bondingTarget: '0',
    progressPercentage: 0,
    remainingETH: '0'
  });

  // Function to fetch token from backend API
  const fetchTokenFromAPI = async (tokenAddress: string): Promise<TokenInfo | null> => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
      const response = await fetch(`${apiUrl}/tokens`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: ApiResponse = await response.json();
      
      if (!data.success) {
        throw new Error('API returned error response');
      }
      
      // Find the token by address
      const foundToken = data.data.tokens.find((token: TokenInfo) => 
        token.tokenAddress.toLowerCase() === tokenAddress.toLowerCase()
      );
      
      return foundToken || null;
    } catch (error) {
      console.error('Error fetching token from API:', error);
      return null;
    }
  };

  // Function to get token from localStorage (fallback)
  const getTokenFromLocalStorage = (tokenAddress: string): TokenInfo | null => {
    try {
      const storedTokens = JSON.parse(localStorage.getItem('tokens') || '[]');
      const foundToken = storedTokens.find((t: TokenInfo) => 
        t.tokenAddress.toLowerCase() === tokenAddress.toLowerCase()
      );
      return foundToken || null;
    } catch (error) {
      console.error('Error parsing localStorage tokens:', error);
      return null;
    }
  };

  // Function to update bonding curve progress
  const updateBondingProgress = async (bondingCurveContract: ethers.Contract) => {
    try {
      const [totalETHCollected, settings] = await Promise.all([
        bondingCurveContract.totalETHCollected(),
        bondingCurveContract.getBondingCurveSettings()
      ]);

      const collected = parseFloat(ethers.utils.formatEther(totalETHCollected));
      const target = parseFloat(ethers.utils.formatEther(settings.bondingTarget));
      const progressPercentage = target > 0 ? Math.min((collected / target) * 100, 100) : 0;
      const remaining = Math.max(target - collected, 0);

      setBondingProgress({
        totalETHCollected: collected.toFixed(4),
        bondingTarget: target.toFixed(4),
        progressPercentage: progressPercentage,
        remainingETH: remaining.toFixed(4)
      });

      console.log('Bonding curve progress updated:', {
        collected: collected.toFixed(4),
        target: target.toFixed(4),
        progress: progressPercentage.toFixed(2) + '%',
        remaining: remaining.toFixed(4)
      });
    } catch (error) {
      console.error('Error updating bonding progress:', error);
    }
  };

  useEffect(() => {
    const loadToken = async () => {
      if (!address) {
        setError('No token address provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        let foundToken: TokenInfo | null = null;
        
        // First, try to fetch from backend API
        try {
          foundToken = await fetchTokenFromAPI(address);
          if (foundToken) {
            console.log('Token loaded from backend API:', foundToken.name);
          }
        } catch (apiError) {
          console.error('Failed to fetch token from API:', apiError);
        }
        
        // If not found in API, try localStorage
        if (!foundToken) {
          foundToken = getTokenFromLocalStorage(address);
          if (foundToken) {
            console.log('Token loaded from localStorage:', foundToken.name);
            toast.error('Backend API unavailable, showing cached token data');
          }
        }

        if (!foundToken) {
          setError('Token not found. Make sure the token address is correct and the backend server is running.');
          setLoading(false);
          return;
        }

        setToken(foundToken);
        
        // Only proceed with contract interactions if connected
        if (!isConnected || !signer) {
          setLoading(false);
          return;
        }
        
        // Create contract instances
        const tokenContract = new ethers.Contract(
          foundToken.tokenAddress,
          TOKEN_ABI,
          signer
        );

        const bondingCurveContract = new ethers.Contract(
          foundToken.bondingCurveAddress,
          BONDING_CURVE_ABI,
          signer
        );

        // Get token balance
        const balance = await tokenContract.balanceOf(await signer.getAddress());
        setTokenBalance(ethers.utils.formatEther(balance));

        // Get ETH balance
        const ethBalance = await signer.getBalance();
        setEthBalance(ethers.utils.formatEther(ethBalance));

        // Get current price using reserves
        const [ethReserve, tokenReserve] = await Promise.all([
          bondingCurveContract.ethReserve(),
          bondingCurveContract.tokenReserve()
        ]);
        
        console.log("=== BONDING CURVE CALCULATION ===");
        console.log("ETH Reserve:", ethers.utils.formatEther(ethReserve));
        console.log("Token Reserve:", ethers.utils.formatEther(tokenReserve));
        
        // Calculate price based on the bonding curve formula
        if (tokenReserve.gt(0) && ethReserve.gt(0)) {
          const calculatedPrice = ethReserve.mul(ethers.utils.parseEther('1')).div(tokenReserve);
          setPrice(ethers.utils.formatEther(calculatedPrice));
        } else {
          setPrice('0');
        }

        // Check if bonding curve is finalized
        const finalized = await bondingCurveContract.isFinalized();
        setIsFinalized(finalized);

        // Update bonding curve progress
        await updateBondingProgress(bondingCurveContract);

        // Load transaction history
        const buyEvents = await bondingCurveContract.queryFilter(
          bondingCurveContract.filters.TokensPurchased()
        );
        const sellEvents = await bondingCurveContract.queryFilter(
          bondingCurveContract.filters.TokensSold()
        );

        const allEvents = [...buyEvents, ...sellEvents].sort(
          (a, b) => b.blockNumber - a.blockNumber
        );

        const formattedTransactions = await Promise.all(
          allEvents.map(async (event) => {
            const block = await event.getBlock();
            const type = event.event === 'TokensPurchased' ? 'Buy' : 'Sell';
            const ethAmount = event.args?.ethAmount || 0;
            const tokenAmount = event.args?.tokenAmount || 0;

            return {
              type: type as 'Buy' | 'Sell',
              amount: ethers.utils.formatEther(tokenAmount),
              price: tokenAmount.gt(0) ? ethers.utils.formatEther(ethAmount.mul(ethers.utils.parseEther('1')).div(tokenAmount)) : '0',
              total: ethers.utils.formatEther(ethAmount),
              timestamp: block.timestamp,
              hash: event.transactionHash,
            };
          })
        );

        setTransactions(formattedTransactions);

      } catch (error) {
        console.error('Error loading token:', error);
        setError('Failed to load token details');
        toast.error('Failed to load token details');
      } finally {
        setLoading(false);
        setIsLoadingHistory(false);
      }
    };

    loadToken();
  }, [isConnected, address, signer]);

  const handleBuy = async () => {
    if (!isConnected || !signer || !token) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!buyAmount || parseFloat(buyAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (token?.isFinalized) {
      toast.error('This token has been finalized and can no longer be traded on the bonding curve');
      return;
    }

    setBuyLoading(true);
    
    try {
      // Create contract instances
      const bondingCurveContract = new ethers.Contract(
        token.bondingCurveAddress,
        BONDING_CURVE_ABI,
        signer
      );

      const tokenContract = new ethers.Contract(
        token.tokenAddress,
        TOKEN_ABI,
        signer
      );

      // Get current reserves and settings for calculation
      const ethReserve = await bondingCurveContract.ethReserve();
      const tokenReserve = await bondingCurveContract.tokenReserve();
      const settings = await bondingCurveContract.getBondingCurveSettings();
      
      console.log('Current state:', {
        ethReserve: ethers.utils.formatEther(ethReserve),
        tokenReserve: ethers.utils.formatEther(tokenReserve),
        minContribution: ethers.utils.formatEther(settings.minContribution)
      });

      const ethAmount = ethers.utils.parseEther(buyAmount);
      
      // Check minimum contribution
      if (ethAmount.lt(settings.minContribution)) {
        toast.error(`Minimum contribution is ${ethers.utils.formatEther(settings.minContribution)} ETH`);
        setBuyLoading(false);
        return;
      }

      // Calculate expected tokens using bonding curve formula
      const virtualEth = settings.virtualEth;
      const k = ethReserve.mul(tokenReserve);
      const projectedEthReserve = ethReserve.add(ethAmount);
      const projectedTokenReserve = k.div(projectedEthReserve);
      const tokensToReceive = tokenReserve.sub(projectedTokenReserve);
      
      console.log('Buy calculation:', {
        ethAmount: ethers.utils.formatEther(ethAmount),
        virtualEth: ethers.utils.formatEther(virtualEth),
        expectedTokens: ethers.utils.formatEther(tokensToReceive),
        k: ethers.utils.formatEther(k)
      });

      // Add 1% slippage protection - reduce minimum by 1%
      const minTokens = tokensToReceive.mul(99).div(100);
      
      console.log('Transaction params:', {
        ethValue: ethers.utils.formatEther(ethAmount),
        minTokens: ethers.utils.formatEther(minTokens),
        minTokensWei: minTokens.toString()
      });

      toast.loading('Transaction submitted, waiting for confirmation...', { id: 'buy' });

      // Call buyTokens with only minTokens parameter
      const tx = await bondingCurveContract.buyTokens(minTokens, {
        value: ethAmount,
        gasLimit: 2000000
      });

      console.log('Transaction hash:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      toast.dismiss('buy');
      toast.success('Tokens purchased successfully!');
      
      // Refresh balances and data
      const [balance, newEthReserve, newTokenReserve, newFinalized] = await Promise.all([
        tokenContract.balanceOf(await signer.getAddress()),
        bondingCurveContract.ethReserve(),
        bondingCurveContract.tokenReserve(),
        bondingCurveContract.isFinalized()
      ]);
      
      setTokenBalance(ethers.utils.formatEther(balance));
      setIsFinalized(newFinalized);
      
      // Calculate price if we have reserves
      if (newEthReserve.gt(0) && newTokenReserve.gt(0)) {
        const currentPrice = newEthReserve.mul(ethers.utils.parseEther('1')).div(newTokenReserve);
        setPrice(ethers.utils.formatEther(currentPrice));
      }
      
      const ethBalance = await signer.getBalance();
      setEthBalance(ethers.utils.formatEther(ethBalance));
      
      // Update bonding curve progress after successful buy
      await updateBondingProgress(bondingCurveContract);
      
      setBuyAmount('');
    } catch (error: any) {
      toast.dismiss('buy');
      console.error('Buy error:', error);
      
      let errorMessage = 'Failed to buy tokens';
      
      if (error.code === 'INSUFFICIENT_FUNDS') {
        errorMessage = 'Insufficient ETH balance';
      } else if (error.message?.includes('user rejected')) {
        errorMessage = 'Transaction rejected by user';
      } else if (error.message?.includes('minContribution')) {
        errorMessage = 'Amount below minimum contribution requirement';
      } else if (error.message?.includes('revert')) {
        errorMessage = 'Transaction reverted - possibly due to slippage or insufficient liquidity';
      }
      
      toast.error(errorMessage);
    } finally {
      setBuyLoading(false);
    }
  };

  const handleSell = async () => {
    if (!isConnected || !signer || !token) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!sellAmount || parseFloat(sellAmount) <= 0) {
      toast.error('Please enter a valid amount to sell');
      return;
    }

    if (isFinalized) {
      toast.error('Token has been finalized. Please trade on DEX.');
      return;
    }

    setSellLoading(true);
    
    try {
      const bondingCurveContract = new ethers.Contract(
        token.bondingCurveAddress,
        BONDING_CURVE_ABI,
        signer
      );

      const tokenContract = new ethers.Contract(
        token.tokenAddress,
        TOKEN_ABI,
        signer
      );

      const amount = ethers.utils.parseEther(sellAmount);
      
      console.log("=== SELLING TOKENS ===");
      console.log("Selling amount:", ethers.utils.formatEther(amount));
      
      // Check if user has enough tokens
      const userAddress = await signer.getAddress();
      const userBalance = await tokenContract.balanceOf(userAddress);
      console.log("User token balance:", ethers.utils.formatEther(userBalance));
      
      if (amount.gt(userBalance)) {
        toast.error('Insufficient token balance');
        return;
      }
      
      // Check current allowance
      const currentAllowance = await tokenContract.allowance(userAddress, token.bondingCurveAddress);
      console.log("Current allowance:", ethers.utils.formatEther(currentAllowance));
      
      // If allowance is insufficient, approve tokens for sale
      if (currentAllowance.lt(amount)) {
        console.log("Approving tokens for sale...");
        toast.loading('Approving tokens...', { id: 'approve' });
        
        const approveTx = await tokenContract.approve(token.bondingCurveAddress, amount);
        await approveTx.wait();
        
        toast.dismiss('approve');
        toast.success('Tokens approved for sale');
        console.log("Tokens approved successfully");
      }
      
      // Get contract settings and current reserves for minimum ETH check
      const [settings, ethReserve, tokenReserve] = await Promise.all([
        bondingCurveContract.getBondingCurveSettings(),
        bondingCurveContract.ethReserve(),
        bondingCurveContract.tokenReserve()
      ]);
      
      console.log("ETH Reserve:", ethers.utils.formatEther(ethReserve));
      console.log("Token Reserve:", ethers.utils.formatEther(tokenReserve));
      console.log("Min Contribution:", ethers.utils.formatEther(settings.minContribution));
      
      // Calculate expected ETH output using bonding curve formula
      let minEthOut = ethers.BigNumber.from('0');
      
      if (ethReserve.gt(0) && tokenReserve.gt(0)) {
        // Correct bonding curve formula for selling: ethOut = (tokensIn * ethReserve) / (tokenReserve + tokensIn)
        const numerator = amount.mul(ethReserve);
        const denominator = tokenReserve.add(amount);
        const expectedEth = numerator.div(denominator);
        
        console.log("Expected ETH calculation:");
        console.log("- Numerator (tokensIn * ethReserve):", ethers.utils.formatEther(numerator));
        console.log("- Denominator (tokenReserve + tokensIn):", ethers.utils.formatEther(denominator));
        console.log("- Expected ETH:", ethers.utils.formatEther(expectedEth));
        
        // Use 98% of expected ETH (2% slippage tolerance)
        minEthOut = expectedEth.mul(98).div(100);
        console.log("minEthOut (98% of expected):", ethers.utils.formatEther(minEthOut));
        
        // Safety check: ensure minEthOut doesn't exceed available ETH reserve
        if (minEthOut.gt(ethReserve)) {
          console.log("WARNING: minEthOut exceeds ETH reserve, adjusting...");
          minEthOut = ethReserve.mul(98).div(100); // Use 98% of available ETH
          console.log("Adjusted minEthOut:", ethers.utils.formatEther(minEthOut));
        }
      }
      
      // Execute the sell transaction
      console.log("Executing sellTokens with amount:", ethers.utils.formatEther(amount));
      console.log("Minimum ETH out:", ethers.utils.formatEther(minEthOut));
      
      const tx = await bondingCurveContract.sellTokens(amount, minEthOut, {
        gasLimit: 500000
      });
      
      toast.loading('Selling tokens...', { id: 'sell' });
      
      const receipt = await tx.wait();
      
      if (receipt.status === 0) {
        throw new Error('Transaction failed');
      }
      
      toast.dismiss('sell');
      toast.success('Tokens sold successfully!');
      
      // Refresh balances and price
      try {
        const [newBalance, newEthReserve, newTokenReserve, newFinalized] = await Promise.all([
          tokenContract.balanceOf(userAddress),
          bondingCurveContract.ethReserve(),
          bondingCurveContract.tokenReserve(),
          bondingCurveContract.isFinalized()
        ]);
        
        setTokenBalance(ethers.utils.formatEther(newBalance));
        setIsFinalized(newFinalized);
        
        // Calculate price if we have reserves
        if (newEthReserve.gt(0) && newTokenReserve.gt(0)) {
          const currentPrice = newEthReserve.mul(ethers.utils.parseEther('1')).div(newTokenReserve);
          setPrice(ethers.utils.formatEther(currentPrice));
        }
        
        const ethBalance = await signer.getBalance();
        setEthBalance(ethers.utils.formatEther(ethBalance));
        
        // Update bonding curve progress after successful sell
        await updateBondingProgress(bondingCurveContract);
        
      } catch (refreshError) {
        console.error('Error refreshing data:', refreshError);
        // Don't show error to user since the transaction succeeded
      }
      
      setSellAmount('');
      
    } catch (error: any) {
      toast.dismiss('sell');
      toast.dismiss('approve');
      console.error('Sell error:', error);
      
      // Handle specific error cases
      if (error.message.includes('execution reverted')) {
        if (error.message.includes('InsufficientTokens')) {
          toast.error('Insufficient token balance');
        } else if (error.message.includes('SlippageExceeded')) {
          toast.error('Price slippage too high. Please try again with a smaller amount.');
        } else if (error.message.includes('InsufficientLiquidity')) {
          toast.error('Insufficient liquidity for this trade size');
        } else {
          toast.error('Transaction failed. Please try again.');
        }
      } else if (error.message.includes('insufficient funds')) {
        toast.error('Insufficient ETH for gas fees');
      } else if (error.message.includes('user rejected transaction')) {
        toast.error('Transaction was cancelled');
      } else {
        toast.error(error.message || 'Failed to sell tokens');
      }
    } finally {
      setSellLoading(false);
    }
  };

  const chartData = {
    labels: priceHistory.map(h => new Date(h.timestamp * 1000).toLocaleDateString()),
    datasets: [
      {
        label: 'Token Price (ETH)',
        data: priceHistory.map(h => parseFloat(h.price)),
        borderColor: 'rgb(79, 70, 229)',
        backgroundColor: 'rgba(79, 70, 229, 0.5)',
        tension: 0.4
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Price History'
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Token not found</h2>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          <p className="text-gray-600 mb-6">
            This could happen if:
          </p>
          <ul className="text-left text-sm text-gray-600 mb-6 space-y-1">
            <li>• The token address is incorrect</li>
            <li>• The backend server is not running</li>
            <li>• The token was not properly saved to the database</li>
          </ul>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/tokens')}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Back to Tokens
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => router.push('/tokens')}
            className="text-indigo-600 hover:text-indigo-500"
          >
            ← Back to Tokens
          </button>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6">
            <div className="flex items-center">
              {token.image ? (
                <img
                  src={token.image}
                  alt={token.name}
                  className="h-16 w-16 rounded-full"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center">
                  <span className="text-2xl font-bold text-indigo-600">
                    {token.symbol[0]}
                  </span>
                </div>
              )}
              <div className="ml-4">
                <h1 className="text-2xl font-bold text-gray-900">{token.name}</h1>
                <p className="text-lg text-gray-500">{token.symbol}</p>
                <div className="mt-2 flex items-center space-x-2">
                  <p className="text-sm text-gray-500">Token Address:</p>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">{token.tokenAddress}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(token.tokenAddress);
                      toast.success('Token address copied to clipboard!');
                    }}
                    className="text-indigo-600 hover:text-indigo-500"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                      <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                    </svg>
                  </button>
                </div>
                <div className="mt-2 flex items-center space-x-2">
                  <p className="text-sm text-gray-500">Bonding Curve Address:</p>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">{token.bondingCurveAddress}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(token.bondingCurveAddress);
                      toast.success('Bonding curve address copied to clipboard!');
                    }}
                    className="text-indigo-600 hover:text-indigo-500"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                      <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <p className="mt-4 text-gray-600">{token.description}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {token.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Bonding Curve Progress Bar */}
            {!isFinalized && (
              <div className="mt-6 bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-lg border border-indigo-200">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">Bonding Curve Progress</h3>
                  <span className="text-sm font-medium text-indigo-600">
                    {bondingProgress.progressPercentage.toFixed(1)}%
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-4 mb-4 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 h-4 rounded-full transition-all duration-500 ease-out shadow-sm"
                    style={{ width: `${Math.min(bondingProgress.progressPercentage, 100)}%` }}
                  >
                    <div className="h-full bg-gradient-to-r from-white/20 to-transparent rounded-full"></div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-gray-600 mb-1">ETH Collected</p>
                    <p className="font-semibold text-indigo-600">
                      {bondingProgress.totalETHCollected} ETH
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-600 mb-1">Target</p>
                    <p className="font-semibold text-gray-900">
                      {bondingProgress.bondingTarget} ETH
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-600 mb-1">Remaining</p>
                    <p className="font-semibold text-orange-600">
                      {bondingProgress.remainingETH} ETH
                    </p>
                  </div>
                </div>
                
                {bondingProgress.progressPercentage >= 100 ? (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800 font-medium">
                      🎉 Bonding curve target reached! This token is ready for finalization.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      💡 Once the target is reached, this token will be finalized and migrated to a DEX with liquidity.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900">
                  {isFinalized ? 'Trading Finalized' : 'Buy Tokens'}
                </h3>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700">
                    ETH Amount
                  </label>
                  <input
                    type="number"
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="0.0"
                    disabled={isFinalized}
                  />
                  <button
                    onClick={handleBuy}
                    disabled={!isConnected || !buyAmount || isFinalized || buyLoading}
                    className="mt-4 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
                  >
                    {buyLoading && (
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {buyLoading ? 'Buying...' : isFinalized ? 'Trading Ended' : 'Buy Tokens'}
                  </button>
                  {isFinalized && (
                    <p className="mt-2 text-xs text-gray-600">
                      This token has been finalized and migrated to a decentralized exchange
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900">
                  {isFinalized ? 'Use DEX for Trading' : 'Sell Tokens'}
                </h3>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Token Amount
                  </label>
                  <input
                    type="number"
                    value={sellAmount}
                    onChange={(e) => setSellAmount(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="0.0"
                    disabled={isFinalized}
                  />
                  <button
                    onClick={handleSell}
                    disabled={!isConnected || !sellAmount || isFinalized || sellLoading}
                    className="mt-4 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
                  >
                    {sellLoading && (
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {sellLoading ? 'Selling...' : isFinalized ? 'Use DEX' : 'Sell Tokens'}
                  </button>
                  {isFinalized && (
                    <p className="mt-2 text-xs text-gray-600">
                      Trade this token on decentralized exchanges
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-500">Current Price</h4>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {price} ETH
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-500">Your Balance</h4>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {tokenBalance} {token.symbol}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-500">ETH Balance</h4>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {ethBalance} ETH
                </p>
              </div>
            </div>

            <div className="mt-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-500">Trading Status</h4>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    isFinalized ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {isFinalized ? 'Finalized' : 'Active Trading'}
                  </span>
                  <p className="mt-1 text-xs text-gray-600">
                    {isFinalized 
                      ? 'Token has been migrated to decentralized exchange' 
                      : 'Buy and sell tokens at current bonding curve price'
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900">Links</h3>
              <div className="mt-4 flex space-x-4">
                {token.website && (
                  <a
                    href={token.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-500"
                  >
                    Website
                  </a>
                )}
                {token.twitter && (
                  <a
                    href={`https://twitter.com/${token.twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-500"
                  >
                    Twitter
                  </a>
                )}
                {token.telegram && (
                  <a
                    href={`https://t.me/${token.telegram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-500"
                  >
                    Telegram
                  </a>
                )}
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Transaction History</h3>
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : transactions.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No transactions found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {transactions.map((tx, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              tx.type === 'Buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {tx.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {parseFloat(tx.amount).toFixed(4)} {token.symbol}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {parseFloat(tx.price).toFixed(6)} ETH
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(tx.timestamp * 1000).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <a
                              href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              View
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Price Chart Section */}
            {priceHistory.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Price Chart</h3>
                <div className="bg-white p-4 rounded-lg border">
                  <Line data={chartData} options={chartOptions} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}