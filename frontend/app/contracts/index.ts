import { getContract } from 'viem';
import { config } from '../config';
import { FACTORY_ABI, BONDING_CURVE_ABI, TOKEN_ABI } from './abis';

// Contract configuration
export const CONTRACT_ADDRESSES = {
  factory: config.contracts.factory,
  bondingCurve: config.contracts.bondingCurve,
  lock: config.contracts.lock,
  tokenImplementation: config.contracts.tokenImplementation,
  foundry: config.contracts.foundry,
} as const;

// Factory Contract
export const getFactoryContract = (publicClient: any, walletClient?: any) => {
  return getContract({
    address: CONTRACT_ADDRESSES.factory as `0x${string}`,
    abi: FACTORY_ABI,
    publicClient,
    walletClient,
  });
};

// Bonding Curve Contract
export const getBondingCurveContract = (
  address: `0x${string}`,
  publicClient: any,
  walletClient?: any
) => {
  return getContract({
    address,
    abi: BONDING_CURVE_ABI,
    publicClient,
    walletClient,
  });
};

// Token Contract
export const getTokenContract = (
  address: `0x${string}`,
  publicClient: any,
  walletClient?: any
) => {
  return getContract({
    address,
    abi: TOKEN_ABI,
    publicClient,
    walletClient,
  });
};

// Helper to get all contract addresses
export const getContractAddresses = () => CONTRACT_ADDRESSES;

// Export ABIs for direct use
export { FACTORY_ABI, BONDING_CURVE_ABI, TOKEN_ABI } from './abis';

// Export types
export type ContractAddresses = typeof CONTRACT_ADDRESSES; 