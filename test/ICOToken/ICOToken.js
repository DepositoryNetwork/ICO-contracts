const ICOToken = artifacts.require("./ICOToken.sol");
const expectThrow = require('../util').expectThrow;

contract('ICOToken', function (accounts) {
	let tokenInstance;

	const _owner = accounts[0];

	const _name = "Depository network token";
	const _initialTotalSupply = 0;
	const _decimals = 18;
	const _symbol = "DEPO";
	const weiInEther = 1000000000000000000;
	const _tokenCap = 3600000000 * weiInEther;

	describe("creating ICO token", () => {
		beforeEach(async function () {
			tokenInstance = await ICOToken.new(_tokenCap, {
				from: _owner
			});
		});

		it("should set owner correctly", async function () {
			let owner = await tokenInstance.owner.call();

			assert.strictEqual(owner, _owner, "The expected owner is not set");
		});

		it("should have no totalSupply", async function () {
			let totalSupply = await tokenInstance.totalSupply.call();

			assert(totalSupply.eq(_initialTotalSupply), `The contract has initial supply of : ${totalSupply.toNumber()}`);
		});

		it("should set the name correctly", async function () {
			let name = await tokenInstance.name.call();

			assert.strictEqual(name, _name, `The contract name is incorrect : ${name}`);
		});

		it("should set the symbol correctly", async function () {
			let symbol = await tokenInstance.symbol.call();

			assert.strictEqual(symbol, _symbol, `The contract symbol is incorrect : ${symbol}`);
		});

		it("should set the decimals correctly", async function () {
			let decimals = await tokenInstance.decimals.call();

			assert(decimals.eq(_decimals), `The contract decimals are incorrect : ${decimals.toNumber()}`);
		});

		it("should set the token cap correctly", async function () {
			let cap = await tokenInstance.cap.call();

			assert(cap.eq(_tokenCap), `The contract cap is incorrect : ${cap.toString()}`);
		});

	});

	describe("Capped token", () => {
		beforeEach(async function () {
			tokenInstance = await ICOToken.new(_tokenCap, {
				from: _owner
			});
		});

		it("should mint tokens successul", async function () {
			const tokensToMint = _tokenCap - weiInEther;
			await tokenInstance.mint(_owner, tokensToMint, {
				from: _owner
			});

			let balance = await tokenInstance.balanceOf(_owner);
			assert(balance.eq(tokensToMint), `The balance is incorrect : ${balance.toString()}`);
		});

		it("should throw if try to mint more than cap", async function () {
			const tokensToMint = _tokenCap + weiInEther;
			await expectThrow(tokenInstance.mint(_owner, tokensToMint, {
				from: _owner
			}))
		});


		it("should be owned by owner", async function () {
			let owner = await tokenInstance.owner.call();

			assert.strictEqual(owner, _owner, "The expected owner is not set");
		})
	});
});