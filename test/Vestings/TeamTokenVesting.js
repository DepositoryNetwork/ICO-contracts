const Vesting = artifacts.require("./TeamTokenVesting.sol");
const ICOToken = artifacts.require("./ICOToken.sol");
const utils = require('../util');
const expectThrow = utils.expectThrow;
const timeTravel = utils.timeTravel;

contract('TeamTokenVesting', function (accounts) {

    let tokenInstance;
    let vestingContract;
    let token;
    let amount = 1000;
    let contractOwnerAddress = accounts[1];
    let wallet = accounts[2];

    const day = 24 * 60 * 60;
    const year = day * 365;

    const startPeriod = year * 2;
    const interval = year * 2;
    const firstPeriod = startPeriod;
    const secondPeriod = firstPeriod + interval;

    const weiInEther = 1000000000000000000;
    const _tokenCap = 3600000000 * weiInEther;

    describe("Set values correctly", () => {
        beforeEach(async function () {
            tokenInstance = await ICOToken.new(_tokenCap, {
                from: contractOwnerAddress
            });
            vestingContract = await Vesting.new(wallet, tokenInstance.address, {
                from: contractOwnerAddress
            });

            await tokenInstance.mint(vestingContract.address, amount, {
                from: contractOwnerAddress
            });
        });

        it("should be owned by owner", async function () {
            let _owner = await vestingContract.teamWallet({
                from: contractOwnerAddress
            });
            assert.strictEqual(_owner, wallet, "contract is not owned by owner");
        });

        it("should set token address correctly", async function () {
            let result = await vestingContract.tokenAddress.call();
            assert.equal(result, tokenInstance.address, "The address is not set correctly")
        });

        it("should set team wallet correctly", async function () {
            let result = await vestingContract.teamWallet.call();
            assert.equal(result, wallet, "The address is not set correctly")
        });
    });

    describe("Claim withdraws", () => {
        beforeEach(async function () {
            tokenInstance = await ICOToken.new(_tokenCap, {
                from: contractOwnerAddress
            });
            vestingContract = await Vesting.new(wallet, tokenInstance.address, {
                from: contractOwnerAddress
            });

            await tokenInstance.mint(vestingContract.address, amount, {
                from: contractOwnerAddress
            });
        });

        it("should transfer the tokens to the owner for the first period", async function () {
            let initialOwnerBalance = await tokenInstance.balanceOf(wallet);

            await timeTravel(web3, firstPeriod);
            await vestingContract.claim({
                from: wallet
            });

            let finalOwnerBalance = await tokenInstance.balanceOf(wallet);

            assert(initialOwnerBalance.add(amount * (50/100)).eq(finalOwnerBalance), "Claim amount was not correct")
        });

        it("should transfer the tokens to the owner for the second period", async function () {
            let initialOwnerBalance = await tokenInstance.balanceOf(wallet);

            await timeTravel(web3, secondPeriod);
            await vestingContract.claim({
                from: wallet
            });

            let finalOwnerBalance = await tokenInstance.balanceOf(wallet);

            assert(initialOwnerBalance.add(amount * (100/100)).eq(finalOwnerBalance), "Claim amount was not correct")
        });

        it("should transfer the tokens to the owner for each period", async function () {
            let initialOwnerBalance = await tokenInstance.balanceOf(wallet);

            await timeTravel(web3, firstPeriod);
            await vestingContract.claim({
                from: wallet
            });

            await timeTravel(web3, interval);
            await vestingContract.claim({
                from: wallet
            });

            let finalOwnerBalance = await tokenInstance.balanceOf(wallet);

            assert(initialOwnerBalance.add(amount * (100/100)).eq(finalOwnerBalance), "Claim amount was not correct")
        });

        it("should not get tokens if claim before first period", async function () {
            await timeTravel(web3, firstPeriod - 10 * day);

            let initialOwnerBalance = await tokenInstance.balanceOf(wallet);

            await vestingContract.claim({
                from: wallet
            });

            let finalOwnerBalance = await tokenInstance.balanceOf(wallet);

            assert(initialOwnerBalance.eq(finalOwnerBalance), "Claim amount was not correct")

        });

        it("should throw if claim twice in same period", async function () {
            await timeTravel(web3, firstPeriod);
            await vestingContract.claim({
                from: wallet
            });

            await expectThrow(vestingContract.claim({
                from: wallet
            }));
        });

        it("should throw if the claim is not called from the claimer of the contract", async function () {

            await timeTravel(web3, firstPeriod);
            await expectThrow(vestingContract.claim({
                from: accounts[3]
            }));
        });
    });

    describe("Vesting events", () => {
        beforeEach(async function () {
            tokenInstance = await ICOToken.new(_tokenCap, {
                from: contractOwnerAddress
            });
            vestingContract = await Vesting.new(wallet, tokenInstance.address, {
                from: contractOwnerAddress
            });

            await tokenInstance.mint(vestingContract.address, amount, {
                from: contractOwnerAddress
            });
        });

        it("should emit one event if transfer for the first period is successful", async function () {
            const expectedEvent = 'LogTransferSuccessful';

            await timeTravel(web3, firstPeriod);
            let result = await vestingContract.claim({
                from: wallet
            });
            assert.lengthOf(result.logs, 1, "There should be 1 event emitted from claiming the tokens !");
            assert.strictEqual(result.logs[0].event, expectedEvent, `The event emitted was ${result.logs[0].event} instead of ${expectedEvent}`);
        });

        it("should emit one event if transfer for the second period is successful", async function () {
            const expectedEvent = 'LogTransferSuccessful';

            await timeTravel(web3, secondPeriod);
            let result = await vestingContract.claim({
                from: wallet
            });
            assert.lengthOf(result.logs, 1, "There should be 1 event emitted from claiming the tokens !");
            assert.strictEqual(result.logs[0].event, expectedEvent, `The event emitted was ${result.logs[0].event} instead of ${expectedEvent}`);
        });
    });
});