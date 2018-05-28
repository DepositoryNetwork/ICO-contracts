pragma solidity ^0.4.18;

import "./ICOToken.sol";
import "../node_modules/zeppelin-solidity/contracts/ownership/Ownable.sol";
import "../node_modules/zeppelin-solidity/contracts/lifecycle/Pausable.sol";
import "./ICORefundableCrowdsale.sol";
import "./DSMath.sol";
import "./WhitelistedCrowdsale.sol";


/**
 * @title ICOCrowdsale
 */
contract ICOCrowdsale is Ownable, Pausable, ICORefundableCrowdsale, DSMath, WhitelistedCrowdsale {

    // Constants needed for calculating token price curve
    uint256 public initialPriceInRay = 15000000000000000000000; // 0.000015 ETH
    uint256 public curveIncreaseRateInRay = 1000000001000000000000000000;

    // Initial rate for ICO deployment
    uint256 public constant NORMAL_RATE = 66666;

    // Pre-Sale date
    uint32 public constant PRIVATE_PRE_SALE_END = 1529625601; // Fri, 22 Jun 2018 00:00:01 GMT

    // Tokens distribution
    uint256 public constant TOKENS_FOR_SALE_CAP = 1584000000 * (10 ** 18);

    // Pre-sale bonus periods caps
    uint256 public constant FIRST_BONUS_CAP = 100000000 * 10 ** 18;
    uint256 public constant SECOND_BONUS_CAP = 200000000 * 10 ** 18;

    // Token and vesting addresses
    address public reserveVestingAddress;

    event PreSaleTokens(address beneficiary, uint256 tokens);

    function ICOCrowdsale(
        address _tokenAddress,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _startingTokenBalance,
        uint256 _goal,
        address _whitelister,
        address _reserveVestingAddress,
        address _wallet
    ) public
    Crowdsale(_startTime, _endTime, NORMAL_RATE, _tokenAddress, _wallet)
    ICORefundableCrowdsale(_startingTokenBalance, _goal)
    {
        require((_endTime - _startTime) > (15 * 1 days));

        whitelister = _whitelister;
        reserveVestingAddress = _reserveVestingAddress;
    }

    function hasEnded() public view returns (bool) {
        return (now > endTime) || (TOKENS_FOR_SALE_CAP == soldTokensForETH.add(soldTokensPrivate));
    }

    function getTokensForWei(uint256 _weiAmount) public view returns (uint256 tokensToMint) {
        uint tokens;
        uint tokensIntegerPart = soldTokensForETH.div(10 ** 18);

        uint tokenPriceInRay = rmul(initialPriceInRay, rpow(curveIncreaseRateInRay, tokensIntegerPart));
        uint tokenPrice = tokenPriceInRay.div(10 ** 9);

        if (soldTokensForETH.add(soldTokensPrivate) <= FIRST_BONUS_CAP) {
            tokens = _weiAmount.div(tokenPrice).mul(10 ** 18);
            return tokens.add(tokens.div(4).mul(3));
            // Regular price with 75% Discount
        }

        if (soldTokensForETH.add(soldTokensPrivate) <= SECOND_BONUS_CAP) {
            tokens = _weiAmount.div(tokenPrice).mul(10 ** 18);
            return tokens.add(tokens.div(2));
            // Regular price with 50% Discount
        }

        return _weiAmount.div(tokenPrice).mul(10 ** 18);
    }

    function buyTokens(address _beneficiary) public payable isWhitelisted(_beneficiary) {
        uint256 minContributionAmount = 10000000000000000; // 0.01 ETH
        require(msg.value >= minContributionAmount);
        require(_beneficiary != address(0));
        require(validPurchase());
        require(now > PRIVATE_PRE_SALE_END);

        uint256 weiAmount = msg.value;

        // calculate token amount to be created
        uint256 tokens = getTokenAmount(weiAmount);

        // update state
        weiRaised = weiRaised.add(weiAmount);
        soldTokensForETH = soldTokensForETH.add(tokens);
        rate = tokens.div(weiAmount);

        assert(token.transfer(_beneficiary, tokens));
        TokenPurchase(msg.sender, _beneficiary, weiAmount, tokens);

        forwardFunds();
    }

    // Used to send tokens in the Pre-Sale
    function sendPrivatePreSaleTokens(address _beneficiary, uint256 _tokens) public onlyOwner() returns (bool success) {
        require(soldTokensPrivate.add(_tokens) <= SECOND_BONUS_CAP);
        require(now <= PRIVATE_PRE_SALE_END);

        soldTokensPrivate = soldTokensPrivate.add(_tokens);

        assert(token.transfer(_beneficiary, _tokens));

        emit PreSaleTokens(_beneficiary, _tokens);

        return true;
    }

    // Unsold tokens are going to the reserve vesting
    function calculateUnsoldTokens() internal view returns (uint256 _unsoldTokens) {
        return TOKENS_FOR_SALE_CAP - soldTokensForETH.add(soldTokensPrivate);
    }

    function getTokenAmount(uint256 _weiAmount) internal view returns (uint256) {
        require(_weiAmount > 0);
        uint256 _tokensToSend = getTokensForWei(_weiAmount);

        // Validation to not exceed TOKENS_FOR_SALE_CAP
        require(soldTokensForETH.add(soldTokensPrivate).add(_tokensToSend) <= TOKENS_FOR_SALE_CAP);

        return _tokensToSend;
    }

    // Invoked on calling finalize()
    function finalization() internal {
        super.finalization();

        uint256 unsoldTokens = calculateUnsoldTokens();
        if (unsoldTokens > 0) {
            assert(token.transfer(reserveVestingAddress, unsoldTokens));
        }
    }
}