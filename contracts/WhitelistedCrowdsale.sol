pragma solidity ^0.4.18;

import "../node_modules/zeppelin-solidity/contracts/ownership/Ownable.sol";


/**
 * @title WhitelistedCrowdsale
 * @dev Crowdsale in which only whitelisted users can contribute.
 */
contract WhitelistedCrowdsale is Ownable {

    /**
     * @dev mapping address with KYC_ID (GUID string without dashes)
     */
    mapping(address => bytes32) public whitelist;

    /**
     * @dev whitelister is the only address who can whitelist
     */
    address public whitelister;

    /**
     * @dev Reverts if beneficiary is not whitelisted. Can be used when extending this contract.
     */
    modifier isWhitelisted(address _beneficiary) {
        require(whitelist[_beneficiary] != 0x0);
        _;
    }

    modifier onlyWhitelister() {
        require(msg.sender == whitelister);
        _;
    }

    /**
     * @dev Adds single address to whitelist.
     * @param _beneficiary Address to be added to the whitelist
     */
    function addToWhitelist(address _beneficiary, bytes32 KYC_ID) external onlyWhitelister {
        whitelist[_beneficiary] = KYC_ID;
    }

    /**
     * @dev Adds list of addresses to whitelist. Not overloaded due to limitations with truffle testing.
     * @param _beneficiaries Addresses to be added to the whitelist
     */
    function addManyToWhitelist(address[] _beneficiaries, bytes32[] KYC_IDs) external onlyWhitelister {
        require(_beneficiaries.length == KYC_IDs.length);
        for (uint256 i = 0; i < _beneficiaries.length; i++) {
            whitelist[_beneficiaries[i]] = KYC_IDs[i];
        }
    }

    /**
     * @dev Removes single address from whitelist.
     * @param _beneficiary Address to be removed to the whitelist
     */
    function removeFromWhitelist(address _beneficiary) external onlyWhitelister {
        require(_beneficiary != address(0));
        whitelist[_beneficiary] = "";
    }

    function setWhitelister(address _newWhitelister) public onlyOwner {
        require(_newWhitelister != address(0));
        whitelister = _newWhitelister;
    }
}
