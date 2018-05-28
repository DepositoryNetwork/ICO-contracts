pragma solidity ^0.4.18;

import "./../node_modules/zeppelin-solidity/contracts/token/CappedToken.sol";
import "./../node_modules/zeppelin-solidity/contracts/token/PausableToken.sol";

/**
 * @title ICOToken
 * `StandardToken` functions.
 */
contract ICOToken is CappedToken, PausableToken {

    string public constant name = "Depository network token";
    string public constant symbol = "DEPO";
    uint8 public constant decimals = 18;

    /**
     * @dev Constructor that sets msg.sender as owner
     */
    function ICOToken(uint256 _cap) public
        CappedToken(_cap) {
    }
}