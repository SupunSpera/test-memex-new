'use client';

import { useState } from 'react';
import { useAccount, useSigner, useNetwork, useSwitchNetwork } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { toast } from 'react-hot-toast';
import { ethers } from 'ethers';
import { useRouter } from 'next/navigation';
import { FACTORY_ABI, BONDING_CURVE_ABI, TOKEN_ABI } from '../contracts/abis';
import { CONTRACT_ADDRESSES } from '../contracts';

const ABSTRACT_TESTNET_CHAIN_ID = 11124;

export default function CreateToken() {
  const { isConnected, address } = useAccount();
  const { data: signer } = useSigner();
  const { chain } = useNetwork();
  const { switchNetwork } = useSwitchNetwork();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    description: '',
    image: '',
    website: '',
    twitter: '',
    telegram: '',
    tags: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signer) {
      setError('Please connect your wallet');
      return;
    }

    if (chain?.id !== ABSTRACT_TESTNET_CHAIN_ID) {
      setError('Please switch to Abstract Testnet');
      return;
    }

    if (!formData.name || !formData.symbol) {
      setError('Please fill in the name and symbol fields');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const factoryContract = new ethers.Contract(
        CONTRACT_ADDRESSES.factory, 
        FACTORY_ABI, 
        signer
      );
      
      // Get deployment fee
      const deploymentFee = await factoryContract.getDeploymentFee();
      console.log('Deployment fee:', ethers.utils.formatEther(deploymentFee), 'ETH');

      console.log('Creating token with params:', {
        name: formData.name,
        symbol: formData.symbol,
        value: ethers.utils.formatEther(deploymentFee)
      });

      // Call the correct function with only name and symbol
      const tx = await factoryContract.deployBondingCurveSystem(
        formData.name,
        formData.symbol,
        { value: deploymentFee }
      );
      
      console.log('Transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);
      
      // Find the BondingCurveSystemDeployed event
      const deployEvent = receipt.logs.find(
        (log: any) => {
          try {
            const parsed = factoryContract.interface.parseLog(log);
            return parsed?.name === 'BondingCurveSystemDeployed';
          } catch {
            return false;
          }
        }
      );

      if (deployEvent) {
        const parsedEvent = factoryContract.interface.parseLog(deployEvent);
        console.log('Deployment event:', parsedEvent);
        const [bondingCurveAddress, tokenAddress] = parsedEvent?.args || [];
        
        // Store token locally with correct structure to match tokens page expectations
        const tokenData = {
          name: formData.name,
          symbol: formData.symbol,
          tokenAddress: tokenAddress,
          bondingCurveAddress,
          description: formData.description || '',
          image: formData.image || '',
          website: formData.website || '',
          telegram: formData.telegram || '',
          twitter: formData.twitter || '',
          tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
          deploymentTxHash: tx.hash,
          deploymentBlockNumber: receipt.blockNumber,
          owner: await signer.getAddress(),
          createdAt: new Date().toISOString()
        };
        
        const existingTokens = JSON.parse(localStorage.getItem('tokens') || '[]');
        existingTokens.unshift(tokenData);
        localStorage.setItem('tokens', JSON.stringify(existingTokens));
        
        // Try to register token with backend API (non-blocking)
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5004/api';
          const response = await fetch(`${apiUrl}/user/register-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: formData.name,
              symbol: formData.symbol,
              tokenAddress: tokenAddress,
              bondingCurveAddress: bondingCurveAddress,
              owner: await signer.getAddress(),
              deploymentTxHash: tx.hash,
              deploymentBlockNumber: receipt.blockNumber,
              description: formData.description || '',
              image: formData.image || '',
              website: formData.website || '',
              twitter: formData.twitter || '',
              telegram: formData.telegram || '',
              tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : []
            }),
          });
          
          if (response.ok) {
            console.log('Token registered with backend successfully');
            toast.success('Token registered with backend!');
          } else {
            console.warn('Failed to register token with backend:', response.status);
            toast.error('Token created but not registered with backend');
          }
        } catch (backendError) {
          console.warn('Could not register token with backend:', backendError);
          toast.error('Token created but backend unavailable');
        }
        
        // Reset form
        setFormData({
          name: '',
          symbol: '',
          description: '',
          image: '',
          website: '',
          telegram: '',
          twitter: '',
          tags: ''
        });
        
        toast.success(`Token "${formData.name}" created successfully!`);
        
        // Redirect to tokens page
        router.push('/tokens');
      } else {
        throw new Error('Could not find deployment event in transaction receipt');
      }

    } catch (error: any) {
      console.error('Error creating token:', error);
      setError(error.message || 'Failed to create token');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Create New Token</h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>Fill in the details below to create your token on Abstract Testnet.</p>
            </div>
            
            <div className="mt-5">
              <ConnectButton />
            </div>

            {isConnected && chain?.id !== ABSTRACT_TESTNET_CHAIN_ID && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-700">
                  Please switch to Abstract Testnet network to create tokens.
                  {switchNetwork && (
                    <button
                      onClick={() => switchNetwork(ABSTRACT_TESTNET_CHAIN_ID)}
                      className="ml-2 text-yellow-800 underline"
                    >
                      Switch Network
                    </button>
                  )}
                </p>
              </div>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Token Name
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="symbol" className="block text-sm font-medium text-gray-700">
                  Token Symbol
                </label>
                <input
                  type="text"
                  name="symbol"
                  id="symbol"
                  required
                  value={formData.symbol}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description (optional)
                </label>
                <textarea
                  name="description"
                  id="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="image" className="block text-sm font-medium text-gray-700">
                  Image URL (optional)
                </label>
                <input
                  type="url"
                  name="image"
                  id="image"
                  value={formData.image}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                  Website (optional)
                </label>
                <input
                  type="url"
                  name="website"
                  id="website"
                  value={formData.website}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="twitter" className="block text-sm font-medium text-gray-700">
                  Twitter (optional)
                </label>
                <input
                  type="text"
                  name="twitter"
                  id="twitter"
                  value={formData.twitter}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="telegram" className="block text-sm font-medium text-gray-700">
                  Telegram (optional)
                </label>
                <input
                  type="text"
                  name="telegram"
                  id="telegram"
                  value={formData.telegram}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
                  Tags (comma-separated, optional)
                </label>
                <input
                  type="text"
                  name="tags"
                  id="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.name || !formData.symbol}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
                >
                  {isSubmitting ? 'Creating Token...' : 'Create Token'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 