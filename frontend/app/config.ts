export const config = {
  apiBaseUrl: 'http://localhost:5001/api',
  chains: {
    mainnet: {
      id: 2741,
      name: 'Abstract L2',
      rpcUrl: 'https://api.mainnet.abs.xyz',
    },
    testnet: {
      id: 11124,
      name: 'Abstract L2 Testnet',
      rpcUrl: 'https://api.testnet.abs.xyz',
    },
  },
  contracts: {
    factory: '0x52282113f2Aa9A7DA991cCFDb19B8725F3093666',
    bondingCurve: '0x119784a3eCe7FDC183ED9530eABDfd69FC043A93',
    lock: '0x19Fc5C62B5Bc7f158615655150E097b85829514E',
    tokenImplementation: '0xDc9FB01E68F5b27f30b99f05e57b8bC8685fB1a0',
    foundry: '0x17CffdAeBD5459f914eFf6f3E5a337407d6261e0',
  },
  defaultGasPrice: '20000000000',
  maxGasLimit: '500000',
}; 