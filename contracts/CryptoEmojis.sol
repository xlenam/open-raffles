// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "openzeppelin-solidity/contracts/token/ERC721/ERC721.sol";
import "openzeppelin-solidity/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "openzeppelin-solidity/contracts/security/Pausable.sol";
import "openzeppelin-solidity/contracts/access/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "openzeppelin-solidity/contracts/utils/Strings.sol";
import "openzeppelin-solidity/contracts/utils/Counters.sol";

/**
 *  @title CryptoEmojis
 *  @notice
 *  @dev
 */
contract CryptoEmojis is ERC721, Pausable, Ownable, ERC721Burnable {
    using Counters for Counters.Counter;

    // @notice
    Counters.Counter private _tokenIdCounter;
    // @notice
    uint public constant MAX_SUPPLY = 10;
    // @notice
    string _baseUri;

    // @notice
    // @dev
    // @return
    constructor() ERC721("CryptoEmojis", "CRYPTOEMOJIS") {
        _baseUri = "https://ipfs.io/ipfs/QmNtQBSzmiVa7u8ScPVHjc28YWNFW4FRiDniYoeQSAfvd7/";
    }

    // @notice
    // @dev
    // @return
    function _baseURI() internal view override returns (string memory) {
        return _baseUri;
    }

    // @notice
    // @dev
    // @return
    function pause() public onlyOwner {
        _pause();
    }

    // @notice
    // @dev
    // @return
    function unpause() public onlyOwner {
        _unpause();
    }

    // @notice
    // @dev
    // @param quantity
    // @return
    function mint(uint quantity) external payable {
        require(quantity <= 10, "max mints per transaction exceeded");
        require(totalSupply() + quantity <= MAX_SUPPLY, "sold out");

        for (uint i = 0; i < quantity; i++) {
            safeMint(msg.sender);
        }
    }

    // @notice
    // @dev
    // @param to
    // @return
    function safeMint(address to) internal {
        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();
        _safeMint(to, tokenId);
    }

    // @notice
    // @dev
    // @param from
    // @param to
    // @param tokenId
    // @return
    function _beforeTokenTransfer(address from, address to, uint256 tokenId)
    internal
    whenNotPaused
    override
    {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    // @notice
    // @dev
    // @param newBaseURI
    // @return
    function setBaseURI(string memory newBaseURI) external onlyOwner {
        _baseUri = newBaseURI;
    }

    // @notice
    // @dev
    // @param tokenId
    // @return
    function _burn(uint256 tokenId) internal override(ERC721) {
        super._burn(tokenId);
    }

    // @notice
    // @dev
    // @return
    function totalSupply() public view returns (uint) {
        return _tokenIdCounter.current();
    }
}
