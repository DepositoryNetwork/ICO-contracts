const DEPORefundableCrowdsale = artifacts.require("./DEPORefundableCrowdsale.sol");
const RefundVault = artifacts.require("./RefundVault.sol");
const ICOToken = artifacts.require("./ICOToken.sol");
const TeamTokenVesting = artifacts.require("./TeamTokenVesting.sol");
const ReserveTokenVesting = artifacts.require("./ReserveTokenVesting.sol");
const expectThrow = require('../util').expectThrow;
const timeTravel = require('../util').timeTravel;
const web3FutureTime = require('../util').web3FutureTime;

contract('DEPORefundableCrowdsale', function (accounts) {

    let tokenInstance;
    let crowdsaleInstance;
    let _founderVestingInstance;
    let _reserveVestingInstance;
    let _startTime;
    let _endTime;

    const weiInEther = 1000000000000000000;

    const _owner = accounts[0];
    const _alice = accounts[1];
    const _bob = accounts[2];
    const _notOwner = accounts[8];
    const _whitelister = accounts[7];
    const _wallet = accounts[9];

    const RandomKYCID = "Random KYC ID";

    // Token distributions
    const TOKEN_CAP = "3600000000000000000000000000"; // TokenCap - 3 600 000 000
    const TEAM_TOKENS_CAP = "432000000000000000000000000"; // 12% from TokenCap - 432 000 000
    const RESERVE_TOKENS_CAP = "1152000000000000000000000000"; // 32% from TokenCap - 1 152 000 000
    const BOUNTY_TOKENS_CAP = "432000000000000000000000000"; // 12% from TokenCap - 432 000 000
    const TOKENS_TO_BE_SOLD_CAP = "1584000000000000000000000000"; // 44% from TokenCap - 1 584 000 000

    const day = 24 * 60 * 60;
    const nintyDays = 90 * day;
    const thirtyDays = 30 * day;

    const _startingTokens = 200000000;
    const _startingTokenBalance = _startingTokens * weiInEther;
    const _goal = 3000 * weiInEther;

    const _weiSent = 1000 * weiInEther;

    describe("initializing crowsale", () => {

        it("should set initial values correctly", async function () {
            _startTime = web3FutureTime(web3);
            _endTime = _startTime + nintyDays;

            tokenInstance = await ICOToken.new(TOKEN_CAP);
            _founderVestingInstance = await TeamTokenVesting.new(_wallet, tokenInstance.address, {
                from: _owner
            });
            _reserveVestingInstance = await ReserveTokenVesting.new(_wallet, tokenInstance.address, {
                from: _owner
            });

            crowdsaleInstance = await DEPORefundableCrowdsale.new(
                tokenInstance.address,
                _startTime,
                _endTime,
                _startingTokenBalance,
                _goal,
                _whitelister,
                _reserveVestingInstance.address,
                _wallet, {
                    from: _owner
                });

            // Mint Tokens to holders
            await tokenInstance.mint(_founderVestingInstance.address, TEAM_TOKENS_CAP);
            await tokenInstance.mint(_reserveVestingInstance.address, RESERVE_TOKENS_CAP);
            await tokenInstance.mint(_wallet, BOUNTY_TOKENS_CAP);
            await tokenInstance.mint(crowdsaleInstance.address, TOKENS_TO_BE_SOLD_CAP);

            let tokenAddress = await crowdsaleInstance.token.call();
            let startTime = await crowdsaleInstance.startTime.call();
            let endTime = await crowdsaleInstance.endTime.call();
            let startingTokenBalance = await crowdsaleInstance.startingTokenAmount.call();
            let goal = await crowdsaleInstance.goal.call();
            let whitelister = await crowdsaleInstance.whitelister.call();
            let reserveVestingAddress = await crowdsaleInstance.reserveVestingAddress.call();
            let wallet = await crowdsaleInstance.wallet.call();
            let crowdsaleTokenBalance = await tokenInstance.balanceOf.call(crowdsaleInstance.address);
            let _founderVestingInstanceTokenBalance = await tokenInstance.balanceOf.call(_founderVestingInstance.address);
            let _reserveVestingInstanceTokenBalance = await tokenInstance.balanceOf.call(_reserveVestingInstance.address);
            let bountyTokenBalance = await tokenInstance.balanceOf.call(_wallet);

            assert.strictEqual(tokenAddress, tokenInstance.address, "The token address is incorrect");
            assert(startTime.eq(_startTime), "The start time is incorrect");
            assert(endTime.eq(_endTime), "The end time is incorrect");
            assert(startingTokenBalance.eq(_startingTokenBalance), "The startingTokenBalance is incorrect");
            assert(goal.eq(_goal), "The goal is incorrect");
            assert.strictEqual(whitelister, _whitelister, "The whitelister is incorrect");
            assert.strictEqual(reserveVestingAddress, _reserveVestingInstance.address, "The reserveVestingAddress is incorrect");
            assert.strictEqual(wallet, _wallet, "The wallet is incorrect");
            assert(crowdsaleTokenBalance.eq(TOKENS_TO_BE_SOLD_CAP), "The crowdsaleTokenBalance is incorrect");
            assert(_founderVestingInstanceTokenBalance.eq(TEAM_TOKENS_CAP), "The _founderVestingInstanceTokenBalance is incorrect");
            assert(_reserveVestingInstanceTokenBalance.eq(RESERVE_TOKENS_CAP), "The _reserveVestingInstanceTokenBalance is incorrect");
            assert(bountyTokenBalance.eq(BOUNTY_TOKENS_CAP), "The _wallet, bountyTokens is incorrect");
        })
    });

    describe('closing vault', () => {
        beforeEach(async function () {
            _startTime = web3FutureTime(web3);
            _endTime = _startTime + nintyDays;

            tokenInstance = await ICOToken.new(TOKEN_CAP);
            _founderVestingInstance = await TeamTokenVesting.new(_wallet, tokenInstance.address, {
                from: _owner
            });
            _reserveVestingInstance = await ReserveTokenVesting.new(_wallet, tokenInstance.address, {
                from: _owner
            });

            crowdsaleInstance = await DEPORefundableCrowdsale.new(
                tokenInstance.address,
                _startTime,
                _endTime,
                _startingTokenBalance,
                _goal,
                _whitelister,
                _reserveVestingInstance.address,
                _wallet, {
                    from: _owner
                });

            // Mint Tokens to holders
            await tokenInstance.mint(_founderVestingInstance.address, TEAM_TOKENS_CAP);
            await tokenInstance.mint(_reserveVestingInstance.address, RESERVE_TOKENS_CAP);
            await tokenInstance.mint(_wallet, BOUNTY_TOKENS_CAP);
            await tokenInstance.mint(crowdsaleInstance.address, TOKENS_TO_BE_SOLD_CAP);

            await crowdsaleInstance.addToWhitelist(_alice, RandomKYCID, {
                from: _whitelister
            })
        });

        it("should close vault and receive funds", async function () {
            await timeTravel(web3, thirtyDays);

            const walletBalanceBefore = await web3.eth.getBalance(_wallet);

            // ~195 000 000 tokens
            let weiSent = _weiSent;
            let totalWeiSent = weiSent;
            await crowdsaleInstance.buyTokens(_alice, {
                value: weiSent,
                from: _alice
            });

            weiSent = 1000 * weiInEther;
            totalWeiSent += weiSent;
            await crowdsaleInstance.buyTokens(_alice, {
                value: weiSent,
                from: _alice
            });

            weiSent = _goal;
            totalWeiSent += weiSent;
            await crowdsaleInstance.buyTokens(_alice, {
                value: weiSent,
                from: _alice
            });

            await crowdsaleInstance.closeVault();

            const walletBalanceAfter = await web3.eth.getBalance(_wallet);
            assert(walletBalanceAfter.eq(walletBalanceBefore.add(totalWeiSent)), "The crowdsale has not forwarded the funds");
        });

        it("should close vault and forward funds", async function () {
            await timeTravel(web3, thirtyDays);

            // ~195 000 000 tokens
            let weiSent = _weiSent;
            await crowdsaleInstance.buyTokens(_alice, {
                value: _weiSent,
                from: _alice
            });

            weiSent = 1000 * weiInEther;
            await crowdsaleInstance.buyTokens(_alice, {
                value: weiSent,
                from: _alice
            });

            weiSent = _goal;
            await crowdsaleInstance.buyTokens(_alice, {
                value: weiSent,
                from: _alice
            });

            await crowdsaleInstance.closeVault();
            const walletBalanceBefore = await web3.eth.getBalance(_wallet);
            weiSent = weiInEther;

            await crowdsaleInstance.buyTokens(_alice, {
                value: weiSent,
                from: _alice
            });

            const walletBalanceAfter = await web3.eth.getBalance(_wallet);
            assert(((walletBalanceAfter.sub(walletBalanceBefore).eq(weiSent))), "The crowdsale has not forwarded the funds");
        });

        it("should throw if nonOwner trying to close the vault", async function () {
            await timeTravel(web3, thirtyDays);

            // ~195 000 000 tokens
            let weiSent = _weiSent;
            await crowdsaleInstance.buyTokens(_alice, {
                value: _weiSent,
                from: _alice
            });

            weiSent = 1000 * weiInEther;
            await crowdsaleInstance.buyTokens(_alice, {
                value: weiSent,
                from: _alice
            });

            weiSent = _goal;
            await crowdsaleInstance.buyTokens(_alice, {
                value: weiSent,
                from: _alice
            });

            await expectThrow(crowdsaleInstance.closeVault({from: _notOwner}));
        });

        it("should throw if trying to close the vault when goal is not reached", async function () {
            await timeTravel(web3, thirtyDays);

            // ~195 000 000 tokens
            let weiSent = _weiSent;
            await crowdsaleInstance.buyTokens(_alice, {
                value: _weiSent,
                from: _alice
            });

            weiSent = 1000 * weiInEther;
            await crowdsaleInstance.buyTokens(_alice, {
                value: weiSent,
                from: _alice
            });

            await expectThrow(crowdsaleInstance.closeVault());
        });
    });

    describe('fund forwarding', () => {
        beforeEach(async function () {
            _startTime = web3FutureTime(web3);
            _endTime = _startTime + nintyDays;

            tokenInstance = await ICOToken.new(TOKEN_CAP);
            _founderVestingInstance = await TeamTokenVesting.new(_wallet, tokenInstance.address, {
                from: _owner
            });
            _reserveVestingInstance = await ReserveTokenVesting.new(_wallet, tokenInstance.address, {
                from: _owner
            });

            crowdsaleInstance = await DEPORefundableCrowdsale.new(
                tokenInstance.address,
                _startTime,
                _endTime,
                _startingTokenBalance,
                _goal,
                _whitelister,
                _reserveVestingInstance.address,
                _wallet, {
                    from: _owner
                });

            // Mint Tokens to holders
            await tokenInstance.mint(_founderVestingInstance.address, TEAM_TOKENS_CAP);
            await tokenInstance.mint(_reserveVestingInstance.address, RESERVE_TOKENS_CAP);
            await tokenInstance.mint(_wallet, BOUNTY_TOKENS_CAP);
            await tokenInstance.mint(crowdsaleInstance.address, TOKENS_TO_BE_SOLD_CAP);

            await crowdsaleInstance.addToWhitelist(_alice, RandomKYCID, {
                from: _whitelister
            })
        });

        it("should forward funds to wallet before reaching the starting token amount", async function () {
            await timeTravel(web3, thirtyDays);

            const walletBalanceBefore = await web3.eth.getBalance(_wallet);

            await crowdsaleInstance.buyTokens(_alice, {
                value: _weiSent,
                from: _alice
            });

            const walletBalanceAfter = await web3.eth.getBalance(_wallet);

            assert((walletBalanceAfter.sub(walletBalanceBefore)).eq(_weiSent), "The crowdsale has not forwarded the funds");
        });

        it("should not forward funds to wallet after reaching the starting token amount", async function () {
            await timeTravel(web3, thirtyDays);

            // ~ 195 000 000 tokens
            let weiSent = _weiSent;

            await crowdsaleInstance.buyTokens(_alice, {
                value: weiSent,
                from: _alice
            });

            weiSent = _goal;
            const walletBalanceBefore = await web3.eth.getBalance(_wallet);

            await crowdsaleInstance.buyTokens(_alice, {
                value: weiSent,
                from: _alice
            });

            const walletBalanceAfter = await web3.eth.getBalance(_wallet);
            assert((walletBalanceAfter.eq(walletBalanceBefore)), "The crowdsale has forwarded the funds");
        });

        it("should keep funds to the vault after reaching the starting token amount", async function () {
            await timeTravel(web3, thirtyDays);

            // ~ 195 000 000 tokens
            let weiSent = _weiSent;

            await crowdsaleInstance.buyTokens(_alice, {
                value: weiSent,
                from: _alice
            });

            let vault = await crowdsaleInstance.vault();

            weiSent = _goal;
            const vaultBalanceBefore = await web3.eth.getBalance(vault);

            await crowdsaleInstance.buyTokens(_alice, {
                value: weiSent,
                from: _alice
            });

            const vaultBalanceAfter = await web3.eth.getBalance(vault);
            assert(((vaultBalanceAfter.sub(vaultBalanceBefore).eq(weiSent))), "The crowdsale has forwarded the funds");
        });

        it("should keep funds to the vault after reaching the starting token amount from pre-sale", async function () {
            await timeTravel(web3, day);

            await crowdsaleInstance.sendPrivatePreSaleTokens(_alice, _startingTokenBalance, {
                from: _owner
            });

            await timeTravel(web3, thirtyDays);

            let vault = await crowdsaleInstance.vault();

            let weiSent = 1000 * weiInEther;
            const vaultBalanceBefore = await web3.eth.getBalance(vault);

            await crowdsaleInstance.buyTokens(_alice, {
                value: weiSent,
                from: _alice
            });

            const vaultBalanceAfter = await web3.eth.getBalance(vault);
            assert(((vaultBalanceAfter.sub(vaultBalanceBefore).eq(weiSent))), "The crowdsale has forwarded the funds");
        });

        it("should forward funds after goal is reached and vault is closed", async function () {
            await timeTravel(web3, thirtyDays);

            // ~ 195 000 000 tokens
            let weiSent = _weiSent;
            await crowdsaleInstance.buyTokens(_alice, {
                value: weiSent,
                from: _alice
            });

            weiSent = 5000 * weiInEther;
            await crowdsaleInstance.buyTokens(_alice, {
                value: weiSent,
                from: _alice
            });

            weiSent = _goal;
            await crowdsaleInstance.buyTokens(_alice, {
                value: weiSent,
                from: _alice
            });

            await crowdsaleInstance.closeVault();
            const walletBalanceBefore = await web3.eth.getBalance(_wallet);

            weiSent = weiInEther;

            await crowdsaleInstance.buyTokens(_alice, {
                value: weiSent,
                from: _alice
            });

            const walletBalanceAfter = await web3.eth.getBalance(_wallet);
            assert(((walletBalanceAfter.sub(walletBalanceBefore).eq(weiSent))), "The crowdsale has not forwarded the funds");
        });

        it("should throw if nonOwner trying to close the vault", async function () {
            await timeTravel(web3, thirtyDays);

            // ~ 195 000 000 tokens
            let weiSent = _weiSent;
            await crowdsaleInstance.buyTokens(_alice, {
                value: weiSent,
                from: _alice
            });

            weiSent = _goal + 1000 * weiInEther;
            await crowdsaleInstance.buyTokens(_alice, {
                value: weiSent,
                from: _alice
            });
            await timeTravel(web3, nintyDays);

            await expectThrow(crowdsaleInstance.closeVault({
                from: _notOwner
            }));
        });

        it("should throw if trying to close the vault when goal is not reached", async function () {
            await timeTravel(web3, thirtyDays);

            // ~ 195 000 000 tokens
            let weiSent = _weiSent;
            await crowdsaleInstance.buyTokens(_alice, {
                value: weiSent,
                from: _alice
            });

            weiSent = 1000 * weiInEther;
            await crowdsaleInstance.buyTokens(_alice, {
                value: weiSent,
                from: _alice
            });
            await timeTravel(web3, nintyDays);

            await expectThrow(crowdsaleInstance.closeVault({
                from: _owner
            }));
        });

        it("should throw if trying to buy tokens when in refunding state", async function () {
            await timeTravel(web3, thirtyDays);

            // ~ 195 000 000 tokens
            let weiSent = _weiSent;
            await crowdsaleInstance.buyTokens(_alice, {
                value: weiSent,
                from: _alice
            });

            weiSent = 1000 * weiInEther;
            await crowdsaleInstance.buyTokens(_alice, {
                value: weiSent,
                from: _alice
            });
            await timeTravel(web3, nintyDays);

            await crowdsaleInstance.finalize();
            let vaultAddress = await crowdsaleInstance.vault();
            let vaultInstance = await RefundVault.at(vaultAddress);
            let vaultState = await vaultInstance.state();
            assert(vaultState.toNumber() === 1, "The crowdsale's vault has not entered in Refunding state");

            weiSent = weiInEther;

            await expectThrow(crowdsaleInstance.buyTokens(_alice, {
                value: weiSent,
                from: _alice
            }));
        });
    });

    describe('claim refunds', () => {

        beforeEach(async function () {
            _startTime = web3FutureTime(web3);
            _endTime = _startTime + nintyDays;

            tokenInstance = await ICOToken.new(TOKEN_CAP);
            _founderVestingInstance = await TeamTokenVesting.new(_wallet, tokenInstance.address, {
                from: _owner
            });
            _reserveVestingInstance = await ReserveTokenVesting.new(_wallet, tokenInstance.address, {
                from: _owner
            });

            crowdsaleInstance = await DEPORefundableCrowdsale.new(
                tokenInstance.address,
                _startTime,
                _endTime,
                _startingTokenBalance,
                _goal,
                _whitelister,
                _reserveVestingInstance.address,
                _wallet, {
                    from: _owner
                });

            // Mint Tokens to holders
            await tokenInstance.mint(_founderVestingInstance.address, TEAM_TOKENS_CAP);
            await tokenInstance.mint(_reserveVestingInstance.address, RESERVE_TOKENS_CAP);
            await tokenInstance.mint(_wallet, BOUNTY_TOKENS_CAP);
            await tokenInstance.mint(crowdsaleInstance.address, TOKENS_TO_BE_SOLD_CAP);

            await crowdsaleInstance.addToWhitelist(_alice, RandomKYCID, {
                from: _whitelister
            })
            await crowdsaleInstance.addToWhitelist(_bob, RandomKYCID, {
                from: _whitelister
            })
        });

        it("can claim refund if goal is not reached", async function () {
            await timeTravel(web3, thirtyDays);
            let weiSent = _weiSent;
            await crowdsaleInstance.buyTokens(_bob, {
                value: weiSent,
                from: _bob
            });

            // total eth are less than 9000 eth
            weiSent = _goal - weiInEther;
            await crowdsaleInstance.buyTokens(_alice, {
                value: weiSent,
                from: _alice
            });

            const initialBalance = web3.eth.getBalance(_alice);
            await timeTravel(web3, nintyDays);
            await crowdsaleInstance.finalize();
            await crowdsaleInstance.claimRefund({
                from: _alice
            });

            const finalBalance = web3.eth.getBalance(_alice);
            assert(finalBalance.gt(initialBalance), "The balance was not correct");
        });

        it("could not claim refund if goal is reached", async function () {
            await timeTravel(web3, thirtyDays);
            let weiSent = _weiSent;
            await crowdsaleInstance.buyTokens(_bob, {
                value: weiSent,
                from: _bob
            });

            // total eth are less than 9000 eth
            weiSent = _goal + weiInEther;
            await crowdsaleInstance.buyTokens(_alice, {
                value: weiSent,
                from: _alice
            });

            await timeTravel(web3, nintyDays);
            await crowdsaleInstance.finalize();
            await expectThrow(crowdsaleInstance.claimRefund({
                from: _alice
            }));
        });

        it("could not claim refund if crowdsale is not finalized", async function () {
            await timeTravel(web3, thirtyDays);
            let weiSent = _weiSent;
            await crowdsaleInstance.buyTokens(_bob, {
                value: weiSent,
                from: _bob
            });

            // total eth are less than 9000 eth
            weiSent = _goal - weiInEther;
            await crowdsaleInstance.buyTokens(_alice, {
                value: weiSent,
                from: _alice
            });

            await timeTravel(web3, nintyDays);
            await expectThrow(crowdsaleInstance.claimRefund({
                from: _alice
            }));
        });
    });
});