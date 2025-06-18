export const config = {
  apiBaseUrl: 'http://localhost:5004/api',
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
    factory: '0xC35BaAf9Ecf96C55ecF11DF18B158fB4c6a646a6',
    bondingCurve: '0xaB536C5ab009ff8D66f6a42fb3c135a33C40A507',
    lock: '0x9F6b36b63C6F19AD53A445c85459f7a762433C5f',
    tokenImplementation: '0xf4b7A5e44B5B5AC2DFA93e98088fc332d4e55538',
    foundry: '0xD546016e4808669ab906aA1EE98418073dB4123f',
  },
  defaultGasPrice: '20000000000',
  maxGasLimit: '500000',
}; 