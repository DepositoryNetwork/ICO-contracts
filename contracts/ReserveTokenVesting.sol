pragma solidity ^0.4.18;

import "./ICOToken.sol";

contract ReserveTokenVesting {
    address public tokenAddress;
    uint256 public startDate;
    uint256 public tokenBalance;

    address public reserveWallet;

    uint256 public firstPeriod = 2 years;
    uint256 public secondPeriod = 4 years;
    uint256 public thirdPeriod = 6 years;
    uint256 public fourthPeriod = 8 years;

    uint256 public owedFirstPeriodTokens;
    uint256 public owedSecondPeriodTokens;
    uint256 public owedThirdPeriodTokens;
    uint256 public owedFourthPeriodTokens;

    uint256 public claimedTokens;

    event LogTransferSuccessful(address recepient, uint amount);
    event LogIntoClaim(address sender);

    modifier onlyReserveWallet() {
        require(msg.sender == reserveWallet);
        _;
    }

    function ReserveTokenVesting(address _reserveWallet, address _tokenAddress) public {
        startDate = now;
        reserveWallet = _reserveWallet;
        tokenAddress = _tokenAddress;
    }

    function claim() public payable onlyReserveWallet {
        ICOToken token = ICOToken(tokenAddress);
        require(token.balanceOf(this) > 0);
        require(now > startDate);

        if (tokenBalance == 0) {
            tokenBalance = token.balanceOf(this);

            owedFirstPeriodTokens = (tokenBalance * 25) / 100;
            owedSecondPeriodTokens = (tokenBalance * 50) / 100;
            owedThirdPeriodTokens = (tokenBalance * 75) / 100;
            owedFourthPeriodTokens = (tokenBalance * 100) / 100;
        }

        if (now < startDate + secondPeriod && now >= startDate + firstPeriod) {
            require(owedFirstPeriodTokens > claimedTokens);

            assert(token.transfer(reserveWallet, (owedFirstPeriodTokens - claimedTokens)));

            emit LogTransferSuccessful(reserveWallet, (owedFirstPeriodTokens - claimedTokens));
            claimedTokens = owedFirstPeriodTokens;

            return;
        }

        if (now < startDate + thirdPeriod && now >= startDate + secondPeriod) {
            require(owedSecondPeriodTokens > claimedTokens);

            assert(token.transfer(reserveWallet, owedSecondPeriodTokens - claimedTokens));

            emit LogTransferSuccessful(reserveWallet, owedSecondPeriodTokens - claimedTokens);
            claimedTokens = owedSecondPeriodTokens;

            return;
        }

        if (now < startDate + fourthPeriod && now >= startDate + thirdPeriod) {
            require(owedFourthPeriodTokens > claimedTokens);

            assert(token.transfer(reserveWallet, owedThirdPeriodTokens - claimedTokens));

            emit LogTransferSuccessful(reserveWallet, owedThirdPeriodTokens - claimedTokens);
            claimedTokens = owedThirdPeriodTokens;

            return;
        }

        if (now >= startDate + fourthPeriod) {
            require(owedFourthPeriodTokens > claimedTokens);

            assert(token.transfer(reserveWallet, owedFourthPeriodTokens - claimedTokens));

            emit LogTransferSuccessful(reserveWallet, owedFourthPeriodTokens - claimedTokens);
            claimedTokens = owedFourthPeriodTokens;

            return;
        }
    }
}