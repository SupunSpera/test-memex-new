const { getAbstractSettings } = require('../utils/AbstractConfig');

module.exports = async function ({ deployments, getNamedAccounts, ethers, getChainId }) {
    const { deploy } = deployments;
    const chainId = await getChainId();
    const { deployer, ether, bnb, arbitrum, base, blast, linea, avalanche, zora, abstract } = await getNamedAccounts();
    const accounts = {
        1: ether, // mainnet
        11155111: deployer, // sepolia
        56: bnb, // BSC
        42161: arbitrum, // 
        8453: base, // base
        43114: avalanche, // avalanche
        81457: blast, // 
        7777777: zora, // Zora
        999999999: zora, // Zora Sepolia
        59144: linea,
        2741: abstract || deployer, // Abstract mainnet
        11124: abstract || deployer // Abstract testnet
    };
    // Get previously deployed implementations
    const tokenImplementation = await deployments.get("TokenImplementation");
    const bondingCurve = await deployments.get("BondingCurve");
    const lockImplementation = await deployments.get("Lock");
    const factoryImplementation = await deployments.get("Factory");
    // Deploy Foundry with implementations
    let deploymentFee;
    
    // Handle deployment fees per network
    if (chainId == 2741 || chainId == 11124) {
        // Abstract networks - use config settings
        const abstractSettings = getAbstractSettings(chainId);
        deploymentFee = abstractSettings.deploymentFee;
    } else if (chainId == 56) {
        // BSC
        deploymentFee = ethers.parseEther("0.01814");
    } else {
        // Default for other networks
        deploymentFee = ethers.parseEther("0.002649");
    }
    
    await deploy("Foundry", {
        from: accounts[chainId],
        args: [
            factoryImplementation.address,
            lockImplementation.address,
            tokenImplementation.address,
            bondingCurve.address,
            deploymentFee,
        ],
        log: true,
    });
};
module.exports.tags = ["Foundry"];
module.exports.dependencies = ["BondingCurve", "Factory", "Lock", "TokenImplementation"];