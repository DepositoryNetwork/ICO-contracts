let DEPORefundableCrowdsale = artifacts.require("./DEPORefundableCrowdsale.sol");
let MultiSigWallet = artifacts.require("./MultiSigWallet.sol");
let MultiSigWalletEtherHolder = artifacts.require("./MultiSigWallet.sol");
let MultiSigWalletTeamVesting = artifacts.require("./MultiSigWallet.sol");
let MultiSigWalletReserveVesting = artifacts.require("./MultiSigWallet.sol");
let ICOToken = artifacts.require("./ICOToken.sol");
let TeamTokenVesting = artifacts.require("./TeamTokenVesting.sol");
let ReserveTokenVesting = artifacts.require("./ReserveTokenVesting.sol");

function getFutureTimestamp(plusMinutes) {
	let date = new Date();
	date.setMinutes(date.getMinutes() + plusMinutes);
	let timestamp = +date;
	timestamp = Math.ceil(timestamp / 1000);
	return timestamp;
}

function getWeb3FutureTimestamp(plusMinutes) {
	return web3.eth.getBlock(web3.eth.blockNumber).timestamp + plusMinutes * 60;
}

module.exports = async function (deployer, network, accounts) {
	const isDevNetwork = (network === 'development' || network === 'td' || network === 'ganache');
	const fifteenMinutes = 15;
	const nintyDaysInMinutes = 90 * 24 * 60;
	const _startTime = (isDevNetwork) ? getWeb3FutureTimestamp(fifteenMinutes) : getFutureTimestamp(fifteenMinutes);
	// TODO Change this
	//const _startTime = 1525436263;
	const _endTime = (isDevNetwork) ? getWeb3FutureTimestamp(nintyDaysInMinutes) : 1539648000; // 15.Oct.2018 24:00
	const weiInEther = 1000000000000000000;

	const _goal = 3000 * weiInEther;
	const _startingTokenBalance = 200000000 * weiInEther;

	// Token distributions
    const TOKEN_CAP = "3600000000000000000000000000"; // TokenCap - 3 600 000 000
    const TEAM_TOKENS_CAP = "432000000000000000000000000"; // 12% from TokenCap - 432 000 000
    const RESERVE_TOKENS_CAP = "1152000000000000000000000000"; // 32% from TokenCap - 1 152 000 000
    const BOUNTY_TOKENS_CAP = "432000000000000000000000000"; // 12% from TokenCap - 432 000 000
    const TOKENS_TO_BE_SOLD_CAP = "1584000000000000000000000000"; // 44% from TokenCap - 1 584 000 000

    // Set the whitelister address
	let whitelister = "0xaAeA7e850Ed9177956E71d409df07019C08299a8";

	// Set up multiSig wallet
	let account1 = "0xd187023249748c894B61eE78E8B47570493dD357";
	let account2 = "0xc3ac5cf22bf80982f06787e9c2a8a520abc857be";
	let allAccounts = [account1, account2];
	let requiredConfirmations = 2;

	// TODO add All multisig wallet addresses here
	await deployer.deploy(MultiSigWallet, allAccounts, requiredConfirmations);
	let multiSigWalletInstance = await MultiSigWallet.deployed();

    let multiSigWalletOwnerAddress = multiSigWalletInstance.address;
    let multiSigWalletEtherHolderAddress = multiSigWalletInstance.address;
    let multiSigWalletTeamVestingAddress = multiSigWalletInstance.address;
    let multiSigWalletReserveVestingAddress = multiSigWalletInstance.address;

	await deployer.deploy(ICOToken, TOKEN_CAP); // Token Cap 3 600 000 000
	let tokenInstance = await ICOToken.deployed();

    await deployer.deploy(TeamTokenVesting, multiSigWalletTeamVestingAddress, tokenInstance.address);
    await deployer.deploy(ReserveTokenVesting, multiSigWalletReserveVestingAddress, tokenInstance.address);

    let teamTokenVestingInstance = await TeamTokenVesting.deployed();
    let reserveTokenVestingInstance = await ReserveTokenVesting.deployed();

    await deployer.deploy(DEPORefundableCrowdsale,
        tokenInstance.address,
		_startTime,
		_endTime,
		_startingTokenBalance,
		_goal,
		whitelister,
        reserveTokenVestingInstance.address,
        multiSigWalletEtherHolderAddress
	);

	let crowdsaleInstance = await DEPORefundableCrowdsale.deployed();

    // Mint Tokens to holders
    await tokenInstance.mint(teamTokenVestingInstance.address, TEAM_TOKENS_CAP);
    await tokenInstance.mint(reserveTokenVestingInstance.address, RESERVE_TOKENS_CAP);
    await tokenInstance.mint(multiSigWalletOwnerAddress, BOUNTY_TOKENS_CAP);
    await tokenInstance.mint(crowdsaleInstance.address, TOKENS_TO_BE_SOLD_CAP);

    // TODO tokenInstance Transfer Ownership to multiSigWalletOwnerAddress
    // TODO crowdsaleInstance Transfer Ownership to multiSigWalletOwnerAddress
};