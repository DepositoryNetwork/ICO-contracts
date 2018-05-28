pragma solidity ^0.4.18;

import "./FinalizableCrowdsale.sol";
import "../node_modules/zeppelin-solidity/contracts/crowdsale/RefundVault.sol";


/**
 * @title RefundableCrowdsale
 * @dev Extension of Crowdsale contract that adds a funding goal, and
 * the possibility of users getting a refund if goal is not met.
 * Uses a RefundVault as the crowdsale's vault.
 */
contract ICORefundableCrowdsale is FinalizableCrowdsale {
    using SafeMath for uint256;

    // Sold Tokens
    uint256 public soldTokensForETH;
    uint256 public soldTokensPrivate;

    // minimum amount of funds to be raised in weis
    uint256 public goal;

    // amount where the crowdsale will start to keep eth in vault
    uint256 public startingTokenAmount;

    // refund vault used to hold funds while crowdsale is running
    RefundVault public vault;

    function ICORefundableCrowdsale(uint256 _startingTokenAmount, uint256 _goal) public {
        require(_goal > 0);
        vault = new RefundVault(wallet);
        goal = _goal;
        startingTokenAmount = _startingTokenAmount;
    }

    // if crowdsale is unsuccessful, investors can claim refunds here
    function claimRefund() public {
        require(isFinalized);
        require(!goalReached());

        vault.refund(msg.sender);
    }

    function goalReached() public view returns (bool) {
        return address(vault).balance >= goal;
    }

    function closeVault() public onlyOwner {
        require(goalReached());
        vault.close();
    }

    // vault finalization task, called when owner calls finalize()
    function finalization() internal {
        if (goalReached()) {
            if (vault.state() == RefundVault.State.Active) {
                vault.close();
            }
        } else if (vault.state() == RefundVault.State.Active) {
            vault.enableRefunds();
        }

        super.finalization();
    }

    function forwardFunds() internal {
        // Transfer to the wallet directly if sold tokens are lower than starting point
        if (soldTokensForETH.add(soldTokensPrivate) < startingTokenAmount) {
            wallet.transfer(msg.value);
        } else if (vault.state() == RefundVault.State.Closed) {
            wallet.transfer(msg.value);
        } else {
            vault.deposit.value(msg.value)(msg.sender);
        }
    }
}