'use client';

import { useState, useEffect } from 'react';
import { useAccount, useSigner } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
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
  const [bondingCurveSettings, setBondingCurveSettings] = useState<any>(null);

  // Function to fetch token from backend API
  const fetchTokenFromAPI = async (tokenAddress: string): Promise<TokenInfo | null> => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5004/api';
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
        const [ethReserve, tokenSupply] = await Promise.all([
          bondingCurveContract.ethReserve(),
          tokenContract.totalSupply()
        ]);
        
        // Calculate price based on the bonding curve formula
        if (tokenSupply.gt(0) && ethReserve.gt(0)) {
          const calculatedPrice = ethReserve.mul(ethers.utils.parseEther('1')).div(tokenSupply);
          setPrice(ethers.utils.formatEther(calculatedPrice));
        } else {
          setPrice('0');
        }

        // Check if bonding curve is finalized
        const finalized = await bondingCurveContract.isFinalized();
        setIsFinalized(finalized);

        // Get bonding curve settings
        try {
          const settings = await bondingCurveContract.getBondingCurveSettings();
          setBondingCurveSettings({
            virtualEth: settings.virtualEth,
            bondingTarget: settings.bondingTarget,
            minContribution: settings.minContribution,
            poolFee: settings.poolFee,
            sellFee: settings.sellFee,
            uniswapV3Factory: settings.uniswapV3Factory,
            positionManager: settings.positionManager,
            weth: settings.weth,
            feeTo: settings.feeTo
          });
        } catch (settingsError) {
          console.error("Error fetching bonding curve settings:", settingsError);
        }

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

    if (isFinalized) {
      toast.error('Token has been finalized. No more tokens can be purchased.');
      return;
    }

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

      const ethValue = ethers.utils.parseEther(buyAmount);
      
      // Validate minimum contribution if settings are available
      if (bondingCurveSettings && bondingCurveSettings.minContribution) {
        if (ethValue.lt(bondingCurveSettings.minContribution)) {
          const minContributionEth = ethers.utils.formatEther(bondingCurveSettings.minContribution);
          toast.error(`Minimum contribution is ${minContributionEth} ETH`);
          return;
        }
      }
      
      // Get current reserves for price calculation
      const [ethReserve, tokenSupply] = await Promise.all([
        bondingCurveContract.ethReserve(),
        tokenContract.totalSupply()
      ]);
      
      // Calculate minimum tokens to receive (with 5% slippage protection)
      let minTokens = ethers.BigNumber.from('0');
      
      if (ethReserve.gt(0) && tokenSupply.gt(0)) {
        const expectedTokens = ethValue.mul(tokenSupply).div(ethReserve.add(ethValue));
        minTokens = expectedTokens.mul(95).div(100); // 5% slippage
      }
      
      const tx = await bondingCurveContract.buyTokens(minTokens, {
        value: ethValue,
        gasLimit: 500000
      });
      
      toast.loading('Buying tokens...', { id: 'buy' });
      
      const receipt = await tx.wait();
      
      if (receipt.status === 0) {
        throw new Error('Transaction failed');
      }
      
      toast.dismiss('buy');
      toast.success('Tokens purchased successfully!');
      
      // Refresh balances and price
      try {
        const [balance, newEthReserve, newTokenSupply, newFinalized] = await Promise.all([
          tokenContract.balanceOf(await signer.getAddress()),
          bondingCurveContract.ethReserve(),
          tokenContract.totalSupply(),
          bondingCurveContract.isFinalized()
        ]);
        
        setTokenBalance(ethers.utils.formatEther(balance));
        setIsFinalized(newFinalized);
        
        // Calculate price if we have reserves
        if (newEthReserve.gt(0) && newTokenSupply.gt(0)) {
          const currentPrice = newEthReserve.mul(ethers.utils.parseEther('1')).div(newTokenSupply);
          setPrice(ethers.utils.formatEther(currentPrice));
        }
        
        const ethBalance = await signer.getBalance();
        setEthBalance(ethers.utils.formatEther(ethBalance));
        
        // Show finalization message if it happened
        if (newFinalized && !isFinalized) {
          toast.success('Token has been finalized and migrated to DEX!');
        }
        
      } catch (refreshError) {
        console.error('Error refreshing data:', refreshError);
        // Don't show error to user since the transaction succeeded
      }
      
      setBuyAmount('');
      
    } catch (error: any) {
      toast.dismiss('buy');
      console.error('Buy error:', error);
      
      // Handle specific error cases
      if (error.message.includes('execution reverted')) {
        if (error.message.includes('InsufficientETH')) {
          toast.error('Insufficient testnet ETH. Please get some from the Abstract Sepolia faucet.');
        } else if (error.message.includes('ContributionTooLow')) {
          toast.error('Contribution amount is too low. Please increase the amount.');
        } else if (error.message.includes('SlippageExceeded')) {
          toast.error('Price slippage too high. Please try again with a smaller amount.');
        } else if (error.message.includes('BondingTargetReached')) {
          toast.error('Bonding target reached. Token is being finalized.');
        } else {
          toast.error('Transaction failed. Please check if you have enough testnet ETH and try again.');
        }
      } else if (error.message.includes('insufficient funds')) {
        toast.error('Insufficient testnet ETH. Please get some from the Abstract Sepolia faucet.');
      } else if (error.message.includes('user rejected transaction')) {
        toast.error('Transaction was cancelled.');
      } else {
        toast.error(error.message || 'Failed to buy tokens');
      }
    }
  };

  const handleSell = async () => {
    if (!isConnected || !signer || !token) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!sellAmount || parseFloat(sellAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (isFinalized) {
      toast.error('Token has been finalized. Please use a DEX for trading.');
      return;
    }

    try {
      const bondingCurveContract = new ethers.Contract(
        token.bondingCurveAddress,
        BONDING_CURVE_ABI,
        signer
      );

      const amount = ethers.utils.parseEther(sellAmount);
      const tx = await bondingCurveContract.sellTokens(
        amount,
        0, // minimum ETH (can be enhanced with slippage protection)
        { gasLimit: 500000 }
      );
      
      toast.loading('Selling tokens...', { id: 'sell' });
      await tx.wait();
      
      toast.dismiss('sell');
      toast.success('Tokens sold successfully!');
      
      // Refresh balances and price
      const tokenContract = new ethers.Contract(
        token.tokenAddress,
        TOKEN_ABI,
        signer
      );
      
      const [balance, ethReserve, tokenSupply] = await Promise.all([
        tokenContract.balanceOf(await signer.getAddress()),
        bondingCurveContract.ethReserve(),
        tokenContract.totalSupply()
      ]);
      
      if (ethReserve.gt(0) && tokenSupply.gt(0)) {
        const currentPrice = ethReserve.mul(ethers.utils.parseEther('1')).div(tokenSupply);
        setPrice(ethers.utils.formatEther(currentPrice));
      }
      
      setTokenBalance(ethers.utils.formatEther(balance));
      
      const ethBalance = await signer.getBalance();
      setEthBalance(ethers.utils.formatEther(ethBalance));
      
      setSellAmount('');
    } catch (error: any) {
      toast.dismiss('sell');
      console.error('Sell error:', error);
      if (error.message.includes('execution reverted')) {
        toast.error('Transaction failed. Please check your token balance and try again.');
      } else if (error.message.includes('insufficient funds')) {
        toast.error('Insufficient testnet ETH for gas. Please get some from the Abstract Sepolia faucet.');
      } else {
        toast.error(error.message || 'Failed to sell tokens');
      }
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
          <ConnectButton />
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
                    disabled={!isConnected || !buyAmount || isFinalized}
                    className="mt-4 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
                  >
                    {isFinalized ? 'Trading Ended' : 'Buy Tokens'}
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
                    disabled={!isConnected || !sellAmount || isFinalized}
                    className="mt-4 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
                  >
                    {isFinalized ? 'Use DEX' : 'Sell Tokens'}
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

            {/* Minimum Contribution Info */}
            {bondingCurveSettings && !isFinalized && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Minimum contribution:</strong> {ethers.utils.formatEther(bondingCurveSettings.minContribution)} ETH
                </p>
              </div>
            )}

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
                              {tx.type.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {tx.amount} {token?.symbol}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {tx.price} ETH
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(tx.timestamp * 1000).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <a
                              href={`https://explorer.testnet.abs.xyz/tx/${tx.hash}`}
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
          </div>
        </div>
      </div>
    </div>
  );
} 