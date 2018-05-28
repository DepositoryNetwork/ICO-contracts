const ICOCrowdsale = artifacts.require("./ICOCrowdsale.sol");
const ICOToken = artifacts.require("./ICOToken.sol");
const expectThrow = require('../util').expectThrow;
const timeTravel = require('../util').timeTravel;
const web3FutureTime = require('../util').web3FutureTime;
const TeamTokenVesting = artifacts.require("./TeamTokenVesting.sol");
const ReserveTokenVesting = artifacts.require("./ReserveTokenVesting.sol");
let web3Utils = require("web3-utils");

contract('ICOCrowdsale', function (accounts) {

    let crowdsaleInstance;
    let tokenInstance;
    let _founderVestingInstance;
    let _reserveVestingInstance;
    let _startTime;
    let _endTime;

    const weiInEther = 1000000000000000000;

    const _owner = accounts[0];
    const _alice = accounts[1];
    const _bob = accounts[2];
    const _whitelister = accounts[7];
    const _notOwner = accounts[8];
    const _wallet = accounts[9];

    const RandomKYCID_1 = "cfadbdf78f0b441a9f55001cdfd6d765";
    const RandomKYCID_2 = "1fe0ab41d9d64783ab235e95b7704f2d";
    const RandomKYCID_3 = "b6b9e10383064c3aaa2ff593c5c2f034";

    // Token distributions
    const TOKEN_CAP = "3600000000000000000000000000"; // TokenCap - 3 600 000 000
    const TEAM_TOKENS_CAP = "432000000000000000000000000"; // 12% from TokenCap - 432 000 000
    const RESERVE_TOKENS_CAP = "1152000000000000000000000000"; // 32% from TokenCap - 1 152 000 000
    const BOUNTY_TOKENS_CAP = "432000000000000000000000000"; // 12% from TokenCap - 432 000 000
    const TOKENS_TO_BE_SOLD_CAP = "1584000000000000000000000000"; // 44% from TokenCap - 1 584 000 000

    const day = 24 * 60 * 60;
    const nintyDays = 90 * day;
    const thirtyDays = 30 * day;
    const sevenDays = 7 * day;

    const X = 0.000015;
    const Y = 1.000000001;

    const _startingTokens = 200000000;
    const _startingTokenBalance = _startingTokens * weiInEther;
    const _goal = 3000 * weiInEther;

    const weiSent = weiInEther;
    const weiSentTill100mln = 1450 * weiInEther;
    const weiSentTill200mln = 1900 * weiInEther;

    const _firstPeriod = {
        TIME: sevenDays,
        BONUS_RATE: 500,
        NORMAL_RATE: 300,
        CAP: 10 * weiInEther
    };

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

            crowdsaleInstance = await ICOCrowdsale.new(
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
        });

        it("throw if the end time is less than 15 days", async function () {
            _startTime = web3FutureTime(web3);
            _endTime = _startTime + sevenDays;

            tokenInstance = await ICOToken.new(TOKEN_CAP);
            _founderVestingInstance = await TeamTokenVesting.new(_wallet, tokenInstance.address, {
                from: _owner
            });
            _reserveVestingInstance = await ReserveTokenVesting.new(_wallet, tokenInstance.address, {
                from: _owner
            });

            await expectThrow(ICOCrowdsale.new(
                tokenInstance.address,
                _startTime,
                _endTime,
                _startingTokenBalance,
                _goal,
                _whitelister,
                _reserveVestingInstance.address,
                _wallet, {
                    from: _owner
                }));

        })
    });

    describe("setting token", () => {
        let tokenInstance;
        const _symbol = "DEPO";

        beforeEach(async function () {
            _startTime = web3FutureTime(web3);
            _endTime = _startTime + nintyDays;

            tokenInstance = await ICOToken.new(TOKEN_CAP, {from: _owner});
            _founderVestingInstance = await TeamTokenVesting.new(_wallet, tokenInstance.address, {
                from: _owner
            });
            _reserveVestingInstance = await ReserveTokenVesting.new(_wallet, tokenInstance.address, {
                from: _owner
            });

            crowdsaleInstance = await ICOCrowdsale.new(
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
        });

        it("should create the correct token", async function () {
            let tokenSymbol = await tokenInstance.symbol.call();
            assert.equal(tokenSymbol, _symbol, "It has not created token with the correct symbol");
        });

        it("should create the token with correct cap", async function () {
            let cap = await tokenInstance.cap.call();
            assert(cap.eq(TOKEN_CAP), `The contract cap is incorrect : ${cap.toString()}`);
        });

        it("should create the token unpaused", async function () {
            let paused = await tokenInstance.paused.call();
            assert.isTrue(!paused, "The token was not created paused");
        });

        it("should create the token owned by the deployer", async function () {
            let owner = await tokenInstance.owner.call();
            assert.equal(owner, _owner, "The token was with the deployer as owner");
        })
    });

    describe("testing crowdsale whitelisting", () => {
        let tokenInstance;

        beforeEach(async function () {
            _startTime = web3FutureTime(web3);
            _endTime = _startTime + nintyDays;

            tokenInstance = await ICOToken.new(TOKEN_CAP, {from: _owner});
            _founderVestingInstance = await TeamTokenVesting.new(_wallet, tokenInstance.address, {
                from: _owner
            });
            _reserveVestingInstance = await ReserveTokenVesting.new(_wallet, tokenInstance.address, {
                from: _owner
            });

            crowdsaleInstance = await ICOCrowdsale.new(
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

            await crowdsaleInstance.addToWhitelist(_alice, RandomKYCID_1, {
                from: _whitelister
            });
            await crowdsaleInstance.addToWhitelist(_wallet, RandomKYCID_2, {
                from: _whitelister
            });

        });

        it("should set new whitelister address from owner", async function () {

            await crowdsaleInstance.setWhitelister(_notOwner, {
                from: _owner
            })

            let newWhitelister = await crowdsaleInstance.whitelister();
            assert.strictEqual(_notOwner, newWhitelister, "the owner did't set new whitelister correctly")

        });

        it("should NOT set new whitelister address if not from owner", async function () {

            await expectThrow(crowdsaleInstance.setWhitelister(_notOwner, {
                from: _whitelister
            }))
        });

        it("should whiteList 'Bob'", async function () {
            await crowdsaleInstance.addToWhitelist(_bob, RandomKYCID_1, {
                from: _whitelister
            });
            let _isWhiteListed = await crowdsaleInstance.whitelist(_bob);

            assert(web3Utils.hexToUtf8(_isWhiteListed) === RandomKYCID_1)

        });

        it("should NOT whiteList 'Bob' if trying from not whitelister", async function () {

            await expectThrow(crowdsaleInstance.addToWhitelist(_bob, RandomKYCID_1, {
                from: _notOwner
            }))
        });

        it("should whiteList array of accounts", async function () {

            let addresses = [_alice, _bob, _notOwner];
            let KYS_IDs = [RandomKYCID_1, RandomKYCID_2, RandomKYCID_3];

            await crowdsaleInstance.addManyToWhitelist(addresses, KYS_IDs, {
                from: _whitelister
            })

            for (i = 0; i <= 2; i++) {
                let _isWhiteListed = await crowdsaleInstance.whitelist(addresses[i]);

                assert(web3Utils.hexToUtf8(_isWhiteListed) === KYS_IDs[i]);
            }

        });

        it("should NOT whiteList array of accounts if length of addresses and KYCs is different", async function () {

            let addresses = [_alice, _bob, _notOwner, _wallet];
            let KYS_IDs = [RandomKYCID_1, RandomKYCID_2, RandomKYCID_3];

            await expectThrow(crowdsaleInstance.addManyToWhitelist(addresses, KYS_IDs, {
                from: _whitelister
            }))
        });

        it("should NOT sell tokens if not whitelisted", async function () {
            await timeTravel(web3, sevenDays * 0.75);

            await expectThrow(crowdsaleInstance.buyTokens(_bob, {
                value: weiSent,
                from: _bob
            }));
        });

        it("should remove 'Alice' from whitelist", async function () {

            let emptyEntry = await crowdsaleInstance.whitelist(_bob);

            let _isWhiteListed = await crowdsaleInstance.whitelist(_alice);
            assert(_isWhiteListed !== _alice);

            await crowdsaleInstance.removeFromWhitelist(_alice, {
                from: _whitelister
            });

            _isWhiteListed = await crowdsaleInstance.whitelist(_bob);
            assert(_isWhiteListed === emptyEntry)

        });
    });

    describe("pre-sale tokens distribution", () => {
        beforeEach(async function () {
            _startTime = web3FutureTime(web3);
            _endTime = _startTime + nintyDays;

            tokenInstance = await ICOToken.new(TOKEN_CAP, {from: _owner});
            _founderVestingInstance = await TeamTokenVesting.new(_wallet, tokenInstance.address, {
                from: _owner
            });
            _reserveVestingInstance = await ReserveTokenVesting.new(_wallet, tokenInstance.address, {
                from: _owner
            });

            crowdsaleInstance = await ICOCrowdsale.new(
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
        });

        it("send private pre-sale tokens", async function () {
            const bonusTokens = 500 * weiInEther;

            await crowdsaleInstance.sendPrivatePreSaleTokens(_alice, bonusTokens, {
                from: _owner
            });

            let balance = await tokenInstance.balanceOf.call(_alice);
            assert(balance.eq(bonusTokens), "The balance was not correct based on bounty tokens");
        });

        it("deduct the correct amount of private sale tokens from ICO balance", async function () {
            const bonusTokens = 500 * weiInEther;
            let balanceBefore = await tokenInstance.balanceOf.call(crowdsaleInstance.address);

            await crowdsaleInstance.sendPrivatePreSaleTokens(_alice, bonusTokens, {
                from: _owner
            });

            let balanceAfter = await tokenInstance.balanceOf.call(crowdsaleInstance.address);

            assert(balanceBefore.eq(balanceAfter.add(bonusTokens)), "The balance was not correct based on bounty tokens");
        });

        it("record the correct amount of private sale tokens", async function () {
            const bonusTokens = 500 * weiInEther;

            await crowdsaleInstance.sendPrivatePreSaleTokens(_alice, bonusTokens, {
                from: _owner
            });
            await crowdsaleInstance.sendPrivatePreSaleTokens(_alice, bonusTokens, {
                from: _owner
            });

            let soldTokensPrivate = await crowdsaleInstance.soldTokensPrivate.call();

            assert(soldTokensPrivate.eq(bonusTokens * 2), "The balance was not correct based on bounty tokens");
        });

        it("should throw if non owner trying to create pre-sale tokens", async function () {
            const bonusTokens = 500 * weiInEther;

            await expectThrow(crowdsaleInstance.sendPrivatePreSaleTokens(_alice, bonusTokens, {
                from: _notOwner
            }))

        });

        it("should throw if pre-sale tokens cap is exceeded", async function () {
            const bonusTokens = 500 * weiInEther;

            await crowdsaleInstance.sendPrivatePreSaleTokens(_alice, _startingTokenBalance, {
                from: _owner
            });

            await expectThrow(crowdsaleInstance.sendPrivatePreSaleTokens(_alice, bonusTokens, {
                from: _owner
            }))
        });

        it("should emit event on pre-sale tokens", async function () {
            const expectedEvent = 'PreSaleTokens';

            const bonusTokens = 500 * weiInEther;
            let result = await crowdsaleInstance.sendPrivatePreSaleTokens(_alice, bonusTokens, {
                from: _owner
            });
            assert.lengthOf(result.logs, 1, "There should be 1 event emitted from setRate!");
            assert.strictEqual(result.logs[0].event, expectedEvent, `The event emitted was ${result.logs[0].event} instead of ${expectedEvent}`);
        });

        it("should throw if pre-sale tokens date is past", async function () {
            const bonusTokens = 500 * weiInEther;

            await crowdsaleInstance.sendPrivatePreSaleTokens(_alice, _startingTokenBalance, {
                from: _owner
            });

            await timeTravel(web3, thirtyDays);

            await expectThrow(crowdsaleInstance.sendPrivatePreSaleTokens(_alice, bonusTokens, {
                from: _owner
            }))
        });
    });

    describe("testing crowdsale buying tokens", () => {
        let tokenInstance;

        beforeEach(async function () {
            _startTime = web3FutureTime(web3);
            _endTime = _startTime + nintyDays;

            tokenInstance = await ICOToken.new(TOKEN_CAP, {from: _owner});
            _founderVestingInstance = await TeamTokenVesting.new(_wallet, tokenInstance.address, {
                from: _owner
            });
            _reserveVestingInstance = await ReserveTokenVesting.new(_wallet, tokenInstance.address, {
                from: _owner
            });

            crowdsaleInstance = await ICOCrowdsale.new(
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

            await crowdsaleInstance.addToWhitelist(_alice, RandomKYCID_1, {
                from: _whitelister
            });
            await crowdsaleInstance.addToWhitelist(_wallet, RandomKYCID_2, {
                from: _whitelister
            });

        });

        it("should buy tokens via fallback function when whitelisted", async function () {
            await timeTravel(web3, thirtyDays);

            let currentTokens = await crowdsaleInstance.soldTokensForETH();
            let tokenPrice = X * Y ** currentTokens;
            let expectedTokensWithoutBonus = weiSent / tokenPrice;

            let expectedTokensPlusBonus = expectedTokensWithoutBonus + (expectedTokensWithoutBonus / 4) * 3;
            let expectedTokensPlusBonusTemp = new Intl.NumberFormat().format(expectedTokensPlusBonus);
            let expectedTokensPlusBonusRes = expectedTokensPlusBonusTemp.slice(0, 6);

            await crowdsaleInstance.sendTransaction({
                value: weiSent,
                from: _alice
            });

            let balance = await tokenInstance.balanceOf.call(_alice);
            let balanceTemp = new Intl.NumberFormat().format(balance);
            let balanceRes = balanceTemp.slice(0, 6);

            assert.equal(balanceRes, expectedTokensPlusBonusRes, "The balance was not correct based on weiSent");
        });

        it("should buy tokens via fallback function when whitelisted with increased price", async function () {
            await timeTravel(web3, thirtyDays);

            await crowdsaleInstance.sendTransaction({
                value: weiSent,
                from: _wallet
            });

            let currentTokens = await crowdsaleInstance.soldTokensForETH();
            currentTokens = currentTokens.div(10 ** 18);

            let tokenPrice = X * Y ** currentTokens;

            let expectedTokensWithoutBonus = weiSent / tokenPrice;
            let expectedTokensPlusBonus = expectedTokensWithoutBonus + (expectedTokensWithoutBonus / 4) * 3;
            let expectedTokensPlusBonusTemp = new Intl.NumberFormat().format(expectedTokensPlusBonus);
            let expectedTokensPlusBonusRes = expectedTokensPlusBonusTemp.slice(0, 6);

            await crowdsaleInstance.sendTransaction({
                value: weiSent,
                from: _alice
            });

            let balance = await tokenInstance.balanceOf.call(_alice);
            let balanceTemp = new Intl.NumberFormat().format(balance);
            let balanceRes = balanceTemp.slice(0, 6);

            assert.equal(balanceRes, expectedTokensPlusBonusRes, "The balance was not correct based on weiSent");
        });

        it("should NOT buy tokens via fallback function when NOT whitelisted", async function () {
            await timeTravel(web3, _firstPeriod.TIME * 0.75);

            await expectThrow(crowdsaleInstance.sendTransaction({
                value: weiSent,
                from: _bob
            }))
        });

        it("should add 3/4 bonus till 100 millions tokens", async function () {
            await timeTravel(web3, thirtyDays);

            await crowdsaleInstance.buyTokens(_wallet, {
                value: 10 * weiInEther,
                from: _wallet
            });

            let weiSent = 130 * weiInEther;

            let currentTokens = await crowdsaleInstance.soldTokensForETH();
            currentTokens = currentTokens / 10 ** 18;
            let tokenPrice = X * Y ** currentTokens;

            let expectedTokensWithoutBonus = weiSent / tokenPrice;
            let expectedTokensPlusBonus = expectedTokensWithoutBonus + expectedTokensWithoutBonus / 4 * 3;
            let expectedTokensPlusBonusTemp = new Intl.NumberFormat().format(expectedTokensPlusBonus);
            let expectedTokensPlusBonusRes = expectedTokensPlusBonusTemp.slice(0, 8);

            await crowdsaleInstance.sendTransaction({
                value: weiSent,
                from: _alice
            });

            let balance = await tokenInstance.balanceOf.call(_alice);
            let balanceTemp = new Intl.NumberFormat().format(balance);
            let balanceRes = balanceTemp.slice(0, 8);

            assert.equal(balanceRes, expectedTokensPlusBonusRes, "first cap bonus not calculated correctly");
        });

        it("should add 1/2 bonus till 200 millions tokens", async function () {
            await timeTravel(web3, thirtyDays);

            await crowdsaleInstance.buyTokens(_wallet, {
                value: weiSentTill100mln,
                from: _wallet
            });

            let currentTokens = await crowdsaleInstance.soldTokensForETH();
            currentTokens = currentTokens / 10 ** 18;
            let tokenPrice = X * Y ** currentTokens;

            let expectedTokensWithoutBonus = weiSent / tokenPrice;
            let expectedTokensPlusBonus = expectedTokensWithoutBonus + expectedTokensWithoutBonus / 2;
            let expectedTokensPlusBonusTemp = new Intl.NumberFormat().format(expectedTokensPlusBonus);
            let expectedTokensPlusBonusRes = expectedTokensPlusBonusTemp.slice(0, 7);

            await crowdsaleInstance.buyTokens(_alice, {
                value: weiSent,
                from: _alice
            });

            let tokenBalance = await tokenInstance.balanceOf.call(_alice);
            let balanceTemp = new Intl.NumberFormat().format(tokenBalance);
            let balanceRes = balanceTemp.slice(0, 7);

            assert.strictEqual(balanceRes, expectedTokensPlusBonusRes, "second period bonus not calculated correctly");
        });

        it("should add 1/2 bonus after 100M are given on pre-sale", async function () {

            let bonusTokens = 100000000 * weiInEther;
            await crowdsaleInstance.sendPrivatePreSaleTokens(_wallet, bonusTokens, {
                from: _owner
            });

            await timeTravel(web3, thirtyDays);

            await crowdsaleInstance.buyTokens(_wallet, {
                value: weiSent * 5,
                from: _wallet
            });

            let currentTokens = await crowdsaleInstance.soldTokensForETH();
            currentTokens = currentTokens / 10 ** 18;
            let tokenPrice = X * Y ** currentTokens;

            let expectedTokensWithoutBonus = weiSent * 5 / tokenPrice;
            let expectedTokensPlusBonus = expectedTokensWithoutBonus + expectedTokensWithoutBonus / 2;
            let expectedTokensPlusBonusTemp = new Intl.NumberFormat().format(expectedTokensPlusBonus);
            let expectedTokensPlusBonusRes = expectedTokensPlusBonusTemp.slice(0, 6);

            await crowdsaleInstance.buyTokens(_alice, {
                value: weiSent * 5,
                from: _alice
            });

            let tokenBalance = await tokenInstance.balanceOf.call(_alice);
            let balanceTemp = new Intl.NumberFormat().format(tokenBalance);
            let balanceRes = balanceTemp.slice(0, 6);

            assert.strictEqual(balanceRes, expectedTokensPlusBonusRes, "second period bonus not calculated correctly");
        });

        it("should add no bonus after 200M are given on pre-sale", async function () {

            let bonusTokens = 200000000 * weiInEther;
            await crowdsaleInstance.sendPrivatePreSaleTokens(_wallet, bonusTokens, {
                from: _owner
            });

            await timeTravel(web3, thirtyDays);

            await crowdsaleInstance.buyTokens(_wallet, {
                value: weiSent * 5,
                from: _wallet
            });

            let currentTokens = await crowdsaleInstance.soldTokensForETH();
            currentTokens = currentTokens / 10 ** 18;
            let tokenPrice = X * Y ** currentTokens;

            let expectedTokensWithoutBonus = weiSent * 5 / tokenPrice;
            let expectedTokensPlusBonusTemp = new Intl.NumberFormat().format(expectedTokensWithoutBonus);
            let expectedTokensPlusBonusRes = expectedTokensPlusBonusTemp.slice(0, 6);

            await crowdsaleInstance.buyTokens(_alice, {
                value: weiSent * 5,
                from: _alice
            });

            let tokenBalance = await tokenInstance.balanceOf.call(_alice);
            let balanceTemp = new Intl.NumberFormat().format(tokenBalance);
            let balanceRes = balanceTemp.slice(0, 6);

            assert.strictEqual(balanceRes, expectedTokensPlusBonusRes, "second period bonus not calculated correctly");
        });

        it("should sell tokens without bonus (above 200 millions)", async function () {
            await timeTravel(web3, sevenDays * 0.75);

            await crowdsaleInstance.buyTokens(_wallet, {
                value: weiSentTill100mln,
                from: _wallet
            });

            await crowdsaleInstance.buyTokens(_wallet, {
                value: weiSentTill200mln,
                from: _wallet
            });

            let currentTokens = await crowdsaleInstance.soldTokensForETH();
            currentTokens = currentTokens / 10 ** 18;
            let tokenPrice = X * Y ** currentTokens;

            let expectedTokens = weiSent / tokenPrice;
            let expectedTokensTemp = new Intl.NumberFormat().format(expectedTokens);
            let expectedTokensRes = expectedTokensTemp.slice(0, 7);

            await crowdsaleInstance.buyTokens(_alice, {
                value: weiSent,
                from: _alice
            });

            let tokenBalance = await tokenInstance.balanceOf.call(_alice);
            let balanceTemp = new Intl.NumberFormat().format(tokenBalance);
            let balanceRes = balanceTemp.slice(0, 7);

            assert.strictEqual(balanceRes, expectedTokensRes, "not calculating correctly tokens to mint after 200 million Tokens");

        });

        it("should NOT sell more than 1 600 000 000", async function () {
            await timeTravel(web3, sevenDays * 0.75);

            await crowdsaleInstance.buyTokens(_wallet, {
                value: weiSentTill100mln,
                from: _wallet
            });

            await crowdsaleInstance.buyTokens(_wallet, {
                value: weiSentTill200mln,
                from: _wallet
            });

            await expectThrow(crowdsaleInstance.buyTokens(_alice, {
                value: 27000 * weiInEther,
                from: _alice
            }));
        });
    });

    describe('finalization', () => {
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

            crowdsaleInstance = await ICOCrowdsale.new(
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

            await timeTravel(web3, thirtyDays);

            await crowdsaleInstance.addToWhitelist(_wallet, RandomKYCID_1, {
                from: _whitelister
            })

            await crowdsaleInstance.buyTokens(_wallet, {
                value: weiInEther,
                from: _wallet
            })
        });

        it("should transfer unsold tokens to the reserve vesting contract", async function () {
            let reserveVestingBalanceBefore = await tokenInstance.balanceOf(_reserveVestingInstance.address);

            await timeTravel(web3, nintyDays);
            await crowdsaleInstance.finalize();

            let reserveVestingBalanceAfter = await tokenInstance.balanceOf(_reserveVestingInstance.address);

            assert(reserveVestingBalanceAfter.gt(reserveVestingBalanceBefore),
                "The reserve vesting balance is not correct");
        });

        it("should throw if trying to finalize before endDate and if not all tokens are sold", async function () {
            await timeTravel(web3, thirtyDays);
            await expectThrow(crowdsaleInstance.finalize());
        });

        it("should throw if trying to finalize from non owner", async function () {
            await timeTravel(web3, nintyDays);
            await expectThrow(crowdsaleInstance.finalize({from: _notOwner}));
        });
    })
});