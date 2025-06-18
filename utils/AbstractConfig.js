const fs = require('fs');
const path = require('path');

// Load configuration based on network
function getAbstractConfig(chainId) {
    let configFile;
    
    switch(chainId) {
        case "2741":
        case 2741:
            configFile = 'abstract.json';
            break;
        case "11124":
        case 11124:
            configFile = 'abstract-testnet.json';
            break;
        default:
            throw new Error(`Unsupported Abstract chain ID: ${chainId}`);
    }
    
    const configPath = path.join(__dirname, '..', 'config', configFile);
    
    if (!fs.existsSync(configPath)) {
        throw new Error(`Configuration file not found: ${configPath}`);
    }
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return config;
}

// Get the appropriate settings for Abstract deployment
function getAbstractSettings(chainId) {
    const config = getAbstractConfig(chainId);
    
    return {
        uniswapV3Factory: config.uniswapV3.factory,
        positionManager: config.uniswapV3.positionManager,
        weth: config.weth,
        poolFee: config.defaultFee,
        // Standard settings for Abstract
        virtualEth: ethers.parseEther("5"),
        preBondingTarget: ethers.parseEther("5"),
        bondingTarget: ethers.parseEther("30"),
        minContribution: ethers.parseEther("0.001"),
        sellFee: 300, // 3%
        deploymentFee: ethers.parseEther(config.deploymentSettings.initialDeploymentFee),
    };
}

module.exports = {
    getAbstractConfig,
    getAbstractSettings
}; 