pragma solidity ^0.4.18;

import "./ICOCrowdsale.sol";

/**
 * @title DEPORefundableCrowdsale
 * Depository network ICO Crowdsale contract
 */

contract DEPORefundableCrowdsale is ICOCrowdsale {

    function DEPORefundableCrowdsale(
        address _tokenAddress,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _startingTokenBalance,
        uint256 _goal,
        address _whitelister,
        address _reserveVestingAddress,
        address _wallet
    ) public
    FinalizableCrowdsale()
    ICOCrowdsale(
        _tokenAddress,
        _startTime,
        _endTime,
        _startingTokenBalance,
        _goal,
        _whitelister,
        _reserveVestingAddress,
        _wallet) {
    }
}