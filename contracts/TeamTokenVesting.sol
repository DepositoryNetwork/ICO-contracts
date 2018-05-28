pragma solidity ^0.4.18;

import "./ICOToken.sol";

contract TeamTokenVesting {
    address public tokenAddress;
    uint256 public startDate;
    uint256 public tokenBalance;

    address public teamWallet;

    uint256 public firstPeriod = 2 years;
    uint256 public secondPeriod = 4 years;

    uint256 public owedFirstPeriodTokens;
    uint256 public owedSecondPeriodTokens;
    uint256 public claimedTokens;

    event LogTransferSuccessful(address recepient, uint amount);
    event LogIntoClaim(address sender);

    modifier onlyTeamWallet() {
        require(msg.sender == teamWallet);
        _;
    }

    function TeamTokenVesting(address _teamWallet, address _tokenAddress) public {
        startDate = now;
        teamWallet = _teamWallet;
        tokenAddress = _tokenAddress;
    }

    function claim() public payable onlyTeamWallet {
        ICOToken token = ICOToken(tokenAddress);
        require(token.balanceOf(this) > 0);
        require(now > startDate);

        if (tokenBalance == 0) {
            tokenBalance = token.balanceOf(this);

            owedFirstPeriodTokens = tokenBalance / 2;
            owedSecondPeriodTokens = tokenBalance;
        }

        if (now < startDate + secondPeriod && now >= startDate + firstPeriod) {
            require(owedFirstPeriodTokens > claimedTokens);

            assert(token.transfer(teamWallet, (owedFirstPeriodTokens - claimedTokens)));

            emit LogTransferSuccessful(teamWallet, (owedFirstPeriodTokens - claimedTokens));
            claimedTokens = owedFirstPeriodTokens;

            return;
        }

        if (now >= startDate + secondPeriod) {
            require(owedSecondPeriodTokens > claimedTokens);

            assert(token.transfer(teamWallet, owedSecondPeriodTokens - claimedTokens));

            emit LogTransferSuccessful(teamWallet, owedSecondPeriodTokens - claimedTokens);
            claimedTokens = owedSecondPeriodTokens;

            return;
        }
    }
}