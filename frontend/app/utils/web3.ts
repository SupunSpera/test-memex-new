import { config } from '../config';
import { parseEther } from 'viem';

export const calculateMinTokens = (ethAmount: number, slippage: number): number => {
  // This is a simplified calculation. In a real implementation,
  // you would use the bonding curve formula to calculate the exact amount
  const baseAmount = ethAmount * 1000; // Assuming 1 ETH = 1000 tokens
  const slippageAmount = baseAmount * (slippage / 100);
  return Math.floor(baseAmount - slippageAmount);
};

export const formatAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatAmount = (amount: string | number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
};

export const parseAmount = (amount: string): bigint => {
  return parseEther(amount);
};

export const getExplorerUrl = (address: string, chainId: number): string => {
  const baseUrl = chainId === config.chains.mainnet.id
    ? 'https://explorer.mainnet.abs.xyz'
    : 'https://explorer.testnet.abs.xyz';
  return `${baseUrl}/address/${address}`;
}; 