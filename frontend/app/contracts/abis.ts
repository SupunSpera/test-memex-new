// Factory ABI - extracted from deployments/abstract-testnet/Factory.json
export const FACTORY_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "FailedDeployment",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "FeeWithdrawalFailed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InitializationFailed",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "balance",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "needed",
        "type": "uint256"
      }
    ],
    "name": "InsufficientBalance",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "provided",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "required",
        "type": "uint256"
      }
    ],
    "name": "InsufficientDeploymentFee",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidDeploymentParameters",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidInitialization",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NoFeesToWithdraw",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotInitializing",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "OwnableInvalidOwner",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "OwnableUnauthorizedAccount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ReentrancyGuardReentrantCall",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "RefundFailed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TokenMintingFailed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Unauthorized",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ZeroAddress",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "bondingCurveAddress",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "tokenAddress",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "symbol",
        "type": "string"
      }
    ],
    "name": "BondingCurveSystemDeployed",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "symbol",
        "type": "string"
      }
    ],
    "name": "deployBondingCurveSystem",
    "outputs": [
      {
        "internalType": "address",
        "name": "tokenAddress",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "bondingCurveAddress",
        "type": "address"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDeploymentFee",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "getBondingCurveForToken",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBondingCurveImplementation",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBondingCurveSettings",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "virtualEth",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "bondingTarget",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "minContribution",
            "type": "uint256"
          },
          {
            "internalType": "uint24",
            "name": "poolFee",
            "type": "uint24"
          },
          {
            "internalType": "uint24",
            "name": "sellFee",
            "type": "uint24"
          },
          {
            "internalType": "address",
            "name": "uniswapV3Factory",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "positionManager",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "weth",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "feeTo",
            "type": "address"
          }
        ],
        "internalType": "struct IFactory.BondingCurveSettings",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getLockContract",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTokenImplementation",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "bondingCurve",
        "type": "address"
      }
    ],
    "name": "getTokenForBondingCurve",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "factoryFees",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "tokenImpl",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "bondingCurveImpl",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "lockContract",
        "type": "address"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "virtualEth",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "bondingTarget",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "minContribution",
            "type": "uint256"
          },
          {
            "internalType": "uint24",
            "name": "poolFee",
            "type": "uint24"
          },
          {
            "internalType": "uint24",
            "name": "sellFee",
            "type": "uint24"
          },
          {
            "internalType": "address",
            "name": "uniswapV3Factory",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "positionManager",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "weth",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "feeTo",
            "type": "address"
          }
        ],
        "internalType": "struct IFactory.BondingCurveSettings",
        "name": "initialSettings",
        "type": "tuple"
      }
    ],
    "name": "initialize",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pendingOwner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "newFee",
        "type": "uint256"
      }
    ],
    "name": "updateDeploymentFee",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      }
    ],
    "name": "withdrawFees",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "stateMutability": "payable",
    "type": "receive"
  }
] as const;

// BondingCurve ABI - simplified for direct bonding phase trading
export const BONDING_CURVE_ABI = [
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "buyer", type: "address" },
      { indexed: false, internalType: "uint256", name: "ethAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "tokensReceived", type: "uint256" },
    ],
    name: "TokensBought",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "seller", type: "address" },
      { indexed: false, internalType: "uint256", name: "tokensAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "ethReceived", type: "uint256" },
    ],
    name: "TokensSold",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "pool", type: "address" },
      { indexed: false, internalType: "uint256", name: "ethAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "tokenAmount", type: "uint256" },
    ],
    name: "CurveFinalized",
    type: "event",
  },

  // Functions
  {
    inputs: [
      {
        internalType: "uint256",
        name: "minTokens",
        type: "uint256"
      }
    ],
    name: "buyTokens",
    outputs: [
      {
        internalType: "uint256",
        name: "tokensToReceive",
        type: "uint256"
      }
    ],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "minETH",
        type: "uint256"
      }
    ],
    name: "sellTokens",
    outputs: [
      {
        internalType: "uint256",
        name: "ethToReceive",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "fee",
        type: "uint256"
      }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "finalizeCurve",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "getBondingCurveSettings",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "virtualEth",
            type: "uint256"
          },
          {
            internalType: "uint256",
            name: "bondingTarget",
            type: "uint256"
          },
          {
            internalType: "uint256",
            name: "minContribution",
            type: "uint256"
          },
          {
            internalType: "uint24",
            name: "poolFee",
            type: "uint24"
          },
          {
            internalType: "uint24",
            name: "sellFee",
            type: "uint24"
          },
          {
            internalType: "address",
            name: "uniswapV3Factory",
            type: "address"
          },
          {
            internalType: "address",
            name: "positionManager",
            type: "address"
          },
          {
            internalType: "address",
            name: "weth",
            type: "address"
          },
          {
            internalType: "address",
            name: "feeTo",
            type: "address"
          }
        ],
        internalType: "struct IFactory.BondingCurveSettings",
        name: "",
        type: "tuple"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  // View functions
  {
    inputs: [],
    name: "ethReserve",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "tokenReserve",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "token",
    outputs: [{ internalType: "contract IToken", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "isFinalized",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalETHCollected",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "uniswapPool",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// ERC20 Token ABI - standard functions
export const TOKEN_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "approve",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      }
    ],
    "name": "allowance",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const; 