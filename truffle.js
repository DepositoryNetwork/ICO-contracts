const HDWalletProvider = require("truffle-hdwallet-provider-privkey");

//let testAddress = '0x795EFF09B1FE788DC7e6824AA5221aD893Fd465A';
let testPrivateKey = '2956b7afa2b93c048f2281be59a5d0ecaf247c5f82430a2209143c1e973c5b82';
let infuraRopsten = 'https://ropsten.infura.io/H4UAAWyThMPs2WB9LsHD';
let infuraRinkeby = 'https://rinkeby.infura.io/H4UAAWyThMPs2WB9LsHD';

module.exports = {

	networks: {
		development: {
			host: "localhost",
			port: 8545,
			//gas: 6721975,
			network_id: "*"
		},
		td: {
			host: "localhost",
			port: 9545,
			network_id: "*"
		},
		ganache: {
			host: "localhost",
			port: 7545,
			network_id: "*"
		},
		ropsten: {
			provider: function () {
				return new HDWalletProvider(testPrivateKey, infuraRopsten)
			},
			network_id: 3,
			port: 8545,
			gas: 4700000
		},
		rinkeby: {
			provider: function () {
				return new HDWalletProvider(testPrivateKey, infuraRinkeby)
			},
			network_id: 4,
			port: 8545,
			gas: 4000000
		}
	},
	solc: {
		optimizer: {
			enabled: true,
			runs: 999
		}
	}
};