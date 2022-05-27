// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "openzeppelin-solidity/contracts/token/ERC721/IERC721.sol";
import "openzeppelin-solidity/contracts/access/Ownable.sol";
import "openzeppelin-solidity/contracts/utils/structs/EnumerableSet.sol";

/**
 *  @title Open decentralized contract to raffle ERC721 tokens
 *  @dev test
 */
contract OpenRafflesCore is Ownable {
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.UintSet;

    uint public constant MAX_NUM_TICKETS = 10000;
    uint public constant MIN_NUM_TICKETS = 1;

    uint public constant MAX_TICKET_PRICE = 10000 ether;
    uint public constant MIN_TICKET_PRICE = 1;

    uint public constant MAX_DURATION_DAYS = 365;
    uint public constant MIN_DURATION_DAYS = 1;

    struct AuthorizedContract {
        bool active;
        IERC721 instance;
        string symbol;
    }

    // @notice Map of all AuthorizedContract struct
    mapping(address => AuthorizedContract) public authorizedContracts;

    // @notice Set of authorized contract address
    EnumerableSet.AddressSet authorizedContractsSet;

    struct Raffle {
        address owner; //owner of raffle
        address winner; //winner of the raffle
        address tokenContract; // token contract address
        uint tokenId; // id of the token
        uint price; // price of each ticket
        uint maxTickets; // max number of tickets
        uint durationInDays; // duration in days of the raffle
        bool isFinished; //if true the raffle is finished
        uint creationDate; // creation date of the raffle
        uint numTickets; // current number of tickets
        bool winnerClaimed; // true if winner has claimed the prize
        bool ownerClaimed; // true if owner has claimed revenue
    }

    // @notice Map of all raffles that are stored by nft contract address and token id
    mapping(address => mapping(uint => Raffle)) raffles;

    // @notice Map of tokenIds that are in a raffle by nft contract address
    mapping(address => mapping(address => EnumerableSet.UintSet)) userRaffles;

    // @notice Map of sets of tokens by nft contract address
    mapping(address => EnumerableSet.UintSet) rafflesContractTokenSet;

    struct Ticket {
        address owner; //owner of the ticket
        address tokenContract; //address of the nft contract
        uint tokenId; // id of the nft
        uint numTickets; // number of shares
    }

    // @notice Map to store the tickets of each user in each raffle
    mapping(address => mapping(uint => mapping(address => Ticket))) addressToTicketsSet;

    // @notice Map used to save a list of address of participants in each raffle
    mapping(address => mapping(uint => EnumerableSet.AddressSet)) raffleTickedAddress;

    // @dev Used to validate that a nft contract is authorized in the system when user calls a function
    modifier ifContractAuthorized(address contractAddress) {
        require(authorizedContractsSet.contains(contractAddress), "This contract is not authorized");
        _;
    }

    // @notice Buy a tickets for a raffle
    // @param contractAddress
    // @param tokenId
    // @param numTickets
    function buyRaffleTicket(address contractAddress, uint tokenId, uint numberOfTickets) external payable ifContractAuthorized(contractAddress) {
        require(raffles[contractAddress][tokenId].isFinished == false, "Raffle is finished");
        require(raffles[contractAddress][tokenId].numTickets + numberOfTickets <= raffles[contractAddress][tokenId].maxTickets, "Not enough available tickets");
        require(msg.value >= numberOfTickets * raffles[contractAddress][tokenId].price, "Ether value sent is not correct");
        //Associate the numberOfTickets with the raffle and user
        addressToTicketsSet[contractAddress][tokenId][msg.sender].owner = msg.sender;
        addressToTicketsSet[contractAddress][tokenId][msg.sender].tokenContract = contractAddress;
        addressToTicketsSet[contractAddress][tokenId][msg.sender].tokenId = tokenId;
        //If user already has tickets increment the numberOfTickets
        addressToTicketsSet[contractAddress][tokenId][msg.sender].numTickets = addressToTicketsSet[contractAddress][tokenId][msg.sender].numTickets + numberOfTickets;
        //Update total number of tickets of the raffle
        raffles[contractAddress][tokenId].numTickets = raffles[contractAddress][tokenId].numTickets + numberOfTickets;
        //Add address to the participants set asociated with the raffle
        raffleTickedAddress[contractAddress][tokenId].add(msg.sender);
    }

    // @notice USed to get all tickets in a raffle
    // @param contractAddress
    // @param tokenId
    // @return Return an array of tickets
    function getTicketsByContractAndTokenId(address contractAddress, uint tokenId) public view ifContractAuthorized(contractAddress) returns (Ticket[] memory) {
        require(rafflesContractTokenSet[contractAddress].contains(tokenId), "Raffle not found");
        EnumerableSet.AddressSet storage userTokens = raffleTickedAddress[contractAddress][tokenId];
        Ticket[] memory tokenIds = new Ticket[](userTokens.length());
        for (uint i = 0; i < userTokens.length(); i++) {
            address userAddress = raffleTickedAddress[contractAddress][tokenId].at(i);
            Ticket storage lBid = addressToTicketsSet[contractAddress][tokenId][userAddress];
            tokenIds[i] = lBid;
        }
        return tokenIds;
    }

    // @notice Create a new raffle in the system
    // @param contractAddress
    // @param tokenId
    // @param price
    // @param supply
    // @param period
    function createRaffle(address contractAddress, uint tokenId, uint price, uint supply, uint durationInDays) external ifContractAuthorized(contractAddress) {
        require(rafflesContractTokenSet[contractAddress].contains(tokenId) == false, "This raffle already exists");
        require(price >= MIN_TICKET_PRICE, "Price must be greater than 0");
        require(price <= MAX_TICKET_PRICE, "Price must be lower than or equal to 10000");
        require(supply >= MIN_NUM_TICKETS, "Number of tickets must be greater than 0");
        require(supply <= MAX_NUM_TICKETS, "Number of tickets must be lower than or equal to 10000");
        require(durationInDays >= MIN_DURATION_DAYS, "Duration in days must be greater than 0");
        require(durationInDays <= MAX_DURATION_DAYS, "Duration in days  must be lower than or equal to 365");
        AuthorizedContract storage _contract = authorizedContracts[contractAddress];
        require(_contract.active, "Authorized contract is not active");
        // Assign token to his owner
        raffles[contractAddress][tokenId].owner = msg.sender;
        raffles[contractAddress][tokenId].price = price;
        raffles[contractAddress][tokenId].maxTickets = supply;
        raffles[contractAddress][tokenId].durationInDays = durationInDays;
        raffles[contractAddress][tokenId].isFinished = false;
        raffles[contractAddress][tokenId].tokenId = tokenId;
        raffles[contractAddress][tokenId].creationDate = block.timestamp;
        raffles[contractAddress][tokenId].numTickets = 0;
        raffles[contractAddress][tokenId].tokenContract = contractAddress;
        // Transfer token to this smart contract
        _contract.instance.safeTransferFrom(msg.sender, address(this), tokenId);
        // Add this token to user staked tokens
        userRaffles[contractAddress][msg.sender].add(tokenId);
        // Add this token to contract nft address staked tokens
        rafflesContractTokenSet[contractAddress].add(tokenId);
    }

    // @notice Used to get raffles by creator
    // @param contractAddress
    // @param owner
    // @return Array of raffles
    function getRafflesByOfOwner(address contractAddress, address owner) public view ifContractAuthorized(contractAddress) returns (Raffle[] memory) {
        EnumerableSet.UintSet storage userTokens = userRaffles[contractAddress][owner];
        Raffle[] memory tokenIds = new Raffle[](userTokens.length());
        for (uint i = 0; i < userTokens.length(); i++) {
            uint tokenId = userRaffles[contractAddress][owner].at(i);
            Raffle storage lBid = raffles[contractAddress][tokenId];
            tokenIds[i] = lBid;
        }
        return tokenIds;
    }

    // @notice Return a raffle by nft contract address and tokenid
    // @param contractAddress
    // @param tokenId
    // @return Raffle
    function getRaffleByAddressAndTokenId(address contractAddress, uint tokenId) public view ifContractAuthorized(contractAddress) returns (Raffle memory) {
        return raffles[contractAddress][tokenId];
    }

    // @notice Return all raffles by contract
    // @param contractAddress
    // @return Arrays of Raffle
    function getRafflesByContract(address contractAddress) public view ifContractAuthorized(contractAddress) returns (Raffle[] memory) {
        EnumerableSet.UintSet storage userTokens = rafflesContractTokenSet[contractAddress];
        Raffle[] memory tokenIds = new Raffle[](userTokens.length());
        for (uint i = 0; i < userTokens.length(); i++) {
            uint tokenId = rafflesContractTokenSet[contractAddress].at(i);
            Raffle storage lBid = raffles[contractAddress][tokenId];
            tokenIds[i] = lBid;
        }
        return tokenIds;
    }

    // @notice This method is used to select the raffle winner
    // @dev Todo: Instead of use pseudorandom deterministic number use Chainlink Verifiable Random Function
    // @param contractAddress
    // @param tokenId
    // @param seed (Random number is sent by the contract owner)
    function executeRaffle(address contractAddress, uint tokenId) external ifContractAuthorized(contractAddress) onlyOwner {
        require(raffles[contractAddress][tokenId].isFinished == false, "This raffles is already finished");
        require(raffles[contractAddress][tokenId].numTickets > 0, "Raffle must have at least one ticket to select the winner");
        //Generate a pseudo random number using a seed sent by the contract owner, block.difficulty and timestamp
        uint totalParticipants = raffleTickedAddress[contractAddress][tokenId].length();
        uint totalTickets = raffles[contractAddress][tokenId].numTickets;
        uint winnerPosition = uint(keccak256(abi.encodePacked(block.difficulty, block.timestamp, totalTickets))) % totalTickets;
        //Generate an array of address with all tickets
        address[] memory tickets = new address[](totalTickets);
        uint count = 0;
        for (uint i = 0; i < totalParticipants; i++) {
            address userAddress = raffleTickedAddress[contractAddress][tokenId].at(i);
            Ticket storage lBid = addressToTicketsSet[contractAddress][tokenId][userAddress];
            for (uint x = count; x < lBid.numTickets; x++) {
                tickets[x] = lBid.owner;
                count++;
            }
        }
        raffles[contractAddress][tokenId].winner = tickets[winnerPosition];
        raffles[contractAddress][tokenId].isFinished = true;
    }

    // @notice Winner can claim the prize of the raffle
    // @param contractAddress
    // @param tokenId
    function claimRafflePrize(address contractAddress, uint tokenId) external ifContractAuthorized(contractAddress) {
        AuthorizedContract storage _contract = authorizedContracts[contractAddress];
        require(raffles[contractAddress][tokenId].winner == msg.sender, "Address is not the winner of the raffle");
        raffles[contractAddress][tokenId].winnerClaimed = true;
        // Transfer token to his owner
        _contract.instance.safeTransferFrom(address(this), msg.sender, tokenId);
        if (raffles[contractAddress][tokenId].ownerClaimed == true) {
            deleteRaffle(contractAddress, tokenId);
        }
    }

    // @notice Allow to the raffles owner to claim the raffles revenue
    // @param contractAddress
    // @param tokenId
    function claimRaffleRevenue(address contractAddress, uint tokenId) external ifContractAuthorized(contractAddress) {
        require(raffles[contractAddress][tokenId].owner == msg.sender, "Address is not the owner of the raffle");
        raffles[contractAddress][tokenId].ownerClaimed = true;
        (bool success,) = msg.sender.call{value : raffles[contractAddress][tokenId].numTickets * raffles[contractAddress][tokenId].price}("");
        require(success, "Transfer failed.");
        if (raffles[contractAddress][tokenId].winnerClaimed == true) {
            deleteRaffle(contractAddress, tokenId);
        }
    }

    // @dev Internal method used to remove a finished raffle.
    // @dev Todo: Instead of delete finished raffles save as historical data
    // @param contractAddress
    // @param tokenId
    function deleteRaffle(address contractAddress, uint tokenId) internal ifContractAuthorized(contractAddress) {
        //remove get raffles by owner list
        address owner = raffles[contractAddress][tokenId].owner;
        //delete enum
        for (uint i = 0; i < userRaffles[contractAddress][owner].length(); i++) {
            userRaffles[contractAddress][owner].remove(userRaffles[contractAddress][owner].at(i));
        }
        //delete raffle struct
        delete raffles[contractAddress][tokenId];
        //delete raffle delete raffle from list
        rafflesContractTokenSet[contractAddress].remove(tokenId);
        //delete all tickets structs
        for (uint i = 0; i < raffleTickedAddress[contractAddress][tokenId].length(); i++) {
            address userAddress = raffleTickedAddress[contractAddress][tokenId].at(i);
            delete addressToTicketsSet[contractAddress][tokenId][userAddress];
        }
        //delete get ticket by contract and token
        for (uint i = 0; i < raffleTickedAddress[contractAddress][tokenId].length(); i++) {
            raffleTickedAddress[contractAddress][tokenId].remove(raffleTickedAddress[contractAddress][tokenId].at(i));
        }
    }

    // @notice Get all authorized contracts
    // @return Array of AuthorizedContract
    function getAuthorizedContracts() public view returns (AuthorizedContract[] memory) {
        AuthorizedContract[] memory tokenIds = new AuthorizedContract[](authorizedContractsSet.length());
        for (uint i = 0; i < authorizedContractsSet.length(); i++) {
            AuthorizedContract storage lBid = authorizedContracts[authorizedContractsSet.at(i)];
            tokenIds[i] = lBid;
        }
        return tokenIds;
    }

    // @notice Authorize new erc721 contract into the system
    // @dev Only contract owner can authorize contracts
    // @param contractAddress
    // @param symbol
    function addAuthorizedContract(address contractAddress, string memory symbol) public onlyOwner {
        require(authorizedContractsSet.contains(contractAddress) == false, "This contract is already authorized");
        authorizedContracts[contractAddress].active = true;
        authorizedContracts[contractAddress].instance = IERC721(contractAddress);
        authorizedContracts[contractAddress].symbol = symbol;
        authorizedContractsSet.add(contractAddress);
    }

    // @notice Update authorized contracts
    // @dev An authorized contract can be disabled
    // @param contractAddress
    // @param active
    /*function updateAuthorizedContract(address contractAddress, bool active) public ifContractAuthorized(contractAddress) onlyOwner {
        require(authorizedContractsSet.contains(contractAddress), "contract not added");
        authorizedContracts[contractAddress].active = active;
    }*/

    // @notice Used to receive the nft token in the raffle
    // @dev Interface for any contract that wants to support safeTransfers from ERC721 asset contracts.
    function onERC721Received(address operator, address, uint256, bytes calldata) external view returns (bytes4) {
        require(operator == address(this), "token must be staked over stake method");
        return bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"));
    }

    // @dev Avoid send ether to this contract
    receive() external payable {
        revert();
    }

    // @notice Used to get the balance in the contract
    // @return uint
    function getTotalBalance() public view returns (uint) {
        return address(this).balance;
    }
}