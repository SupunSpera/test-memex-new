'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import Link from 'next/link';
import toast from 'react-hot-toast';

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

export default function TokensPage() {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isConnected } = useAccount();
  const router = useRouter();
  const pathname = usePathname();

  // Function to fetch tokens from backend API
  const fetchTokensFromAPI = async (): Promise<TokenInfo[]> => {
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
      
      return data.data.tokens || [];
    } catch (error) {
      console.error('Error fetching tokens from API:', error);
      throw error;
    }
  };

  // Function to get tokens from localStorage (fallback)
  const getTokensFromLocalStorage = (): TokenInfo[] => {
    try {
      const storedTokens = localStorage.getItem('tokens');
      if (!storedTokens) return [];
      
      const parsedTokens = JSON.parse(storedTokens);
      return Array.isArray(parsedTokens) ? parsedTokens : [];
    } catch (error) {
      console.error('Error parsing localStorage tokens:', error);
      return [];
    }
  };

  useEffect(() => {
    const loadTokens = async () => {
      setLoading(true);
      setError(null);
      
      try {
        let tokensData: TokenInfo[] = [];
        
        // First, try to fetch from backend API
        try {
          tokensData = await fetchTokensFromAPI();
          console.log(`Loaded ${tokensData.length} tokens from backend API`);
        } catch (apiError) {
          console.error('Failed to fetch tokens from API:', apiError);
          
          // If API fails, try localStorage
          tokensData = getTokensFromLocalStorage();
          console.log(`Loaded ${tokensData.length} tokens from localStorage`);
          
          if (tokensData.length > 0) {
            toast.error('Backend API unavailable, showing cached tokens');
          } else {
            setError('Unable to load tokens. Please ensure the backend server is running or create a new token.');
          }
        }
        
        setTokens(tokensData);
      } catch (error) {
        console.error('Error loading tokens:', error);
        setError('Failed to load tokens');
      } finally {
        setLoading(false);
      }
    };

    loadTokens();

    // Add event listener to refresh tokens when window gains focus
    const handleFocus = () => {
      console.log('Window focused, refreshing tokens...');
      loadTokens();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [pathname]); // Add pathname to trigger reload on route changes

  // Manual refresh function
  const refreshTokens = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let tokensData: TokenInfo[] = [];
      
      // First, try to fetch from backend API
      try {
        tokensData = await fetchTokensFromAPI();
        console.log(`Refreshed ${tokensData.length} tokens from backend API`);
        toast.success('Tokens refreshed successfully!');
      } catch (apiError) {
        console.error('Failed to fetch tokens from API:', apiError);
        
        // If API fails, try localStorage
        tokensData = getTokensFromLocalStorage();
        console.log(`Refreshed ${tokensData.length} tokens from localStorage`);
        
        if (tokensData.length > 0) {
          toast.error('Backend API unavailable, showing cached tokens');
        } else {
          setError('Unable to load tokens. Please ensure the backend server is running or create a new token.');
        }
      }
      
      setTokens(tokensData);
    } catch (error) {
      console.error('Error refreshing tokens:', error);
      setError('Failed to refresh tokens');
      toast.error('Failed to refresh tokens');
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string | undefined) => {
    if (!address) return 'Unknown';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  };

  const truncateDescription = (description: string, maxLength: number = 100) => {
    if (!description) return '';
    if (description.length <= maxLength) return description;
    return description.slice(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tokens...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Token Explorer</h1>
            <p className="mt-1 text-sm text-gray-500">
              Discover and trade tokens on the bonding curve
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={refreshTokens}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <svg className={`-ml-1 mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <Link
              href="/create"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Create Token
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading tokens</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <div className="-mx-2 -my-1.5 flex">
                    <button
                      onClick={refreshTokens}
                      className="bg-red-50 px-2 py-1.5 rounded-md text-sm font-medium text-red-800 hover:bg-red-100"
                    >
                      Try Again
                    </button>
                    <Link
                      href="/create"
                      className="ml-3 bg-red-50 px-2 py-1.5 rounded-md text-sm font-medium text-red-800 hover:bg-red-100"
                    >
                      Create Token
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tokens.length === 0 && !error ? (
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No tokens</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first token with a bonding curve.
            </p>
            <div className="mt-6">
              <Link
                href="/create"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Create Token
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {tokens.map((token, index) => (
                <li key={token._id || token.tokenAddress || index}>
                  <Link
                    href={`/tokens/${token.tokenAddress}`}
                    className="block hover:bg-gray-50"
                  >
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          {token.image ? (
                            <img
                              className="h-10 w-10 rounded-full"
                              src={token.image}
                              alt={token.name}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-indigo-600">
                                {token.symbol[0]}
                              </span>
                            </div>
                          )}
                          <div className="ml-4">
                            <div className="flex items-center">
                              <p className="text-sm font-medium text-indigo-600 truncate">
                                {token.name}
                              </p>
                              <p className="ml-2 text-sm text-gray-500">
                                {token.symbol}
                              </p>
                            </div>
                            <div className="mt-2 flex items-center text-sm text-gray-500">
                              <p className="truncate">
                                {truncateDescription(token.description)}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active Trading
                          </span>
                          <div className="mt-2 flex items-center text-sm text-gray-500">
                            <p>
                              Created {token.createdAt ? formatDate(token.createdAt) : 'Unknown'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            Token: {formatAddress(token.tokenAddress)}
                          </p>
                          <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                            Bonding Curve: {formatAddress(token.bondingCurveAddress)}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          <div className="flex flex-wrap gap-1">
                            {token.tags && token.tags.slice(0, 3).map((tag, tagIndex) => (
                              <span
                                key={tagIndex}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                              >
                                {tag}
                              </span>
                            ))}
                            {token.tags && token.tags.length > 3 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                +{token.tags.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Showing {tokens.length} token{tokens.length !== 1 ? 's' : ''}
            {!isConnected && (
              <span className="block mt-2">
                Connect your wallet to interact with tokens
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
} 