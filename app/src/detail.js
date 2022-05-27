import Web3 from "web3";
import rafflesCore from "../../build/contracts/OpenRafflesCore.json";
import erc721 from "../../build/contracts/ERC721.json";
import {erc721TotalSupplyAbi, getRaffleEndDateStr, getShortAddressStr, monthShortNames} from "./constants";
import './css/style.css';
import {load} from "./app";

export const App = {
    web3: null,
    account: null,
    rafflesContract: null,
    selectedRaffle: null,

    start: async function () {
        const {web3} = this;
        try {
            const params = new Proxy(new URLSearchParams(window.location.search), {
                get: (searchParams, prop) => searchParams.get(prop),
            });

            // get contract instance
            const networkId = await web3.eth.net.getId();
            const rafflesContractAddress = rafflesCore.networks[networkId];
            this.rafflesContract = new web3.eth.Contract(
                rafflesCore.abi,
                rafflesContractAddress.address,
            );

            // get accounts
            const accounts = await web3.eth.getAccounts();
            this.account = accounts[0];
            const accountElement = document.getElementById("account");
            if (this.account == null) {
                accountElement.innerHTML = "Connect";
            } else {
                accountElement.innerHTML = getShortAddressStr(this.account);
            }
            await this.loadRaffleInformation(params.c, params.id);
            await this.refreshTickets();

        } catch (error) {
            console.error("Could not connect to contract or chain.");
            console.error(error);
        }
    },
    connect: async function () {
        await window.ethereum.request({method: 'eth_requestAccounts'});
    },
    loadRaffleInformation: async function (address, tokenId) {
        const {web3} = this;
        const {getRaffleByAddressAndTokenId} = this.rafflesContract.methods;
        this.selectedRaffle = await getRaffleByAddressAndTokenId(address, tokenId).call();
        //fill card
        if (this.selectedRaffle.isFinished) {
            document.getElementById("raffle-status").innerHTML = '<span class="badge bg-success">FINALIZED</span>';
        } else if (this.selectedRaffle.maxTickets == this.selectedRaffle.numTickets) {
            document.getElementById("raffle-status").innerHTML = '<span class="badge bg-info">ACTIVE</span>';
            document.getElementById("raffle-buy-ticket-button").innerHTML = 'No more tickets available';
        } else {
            document.getElementById("raffle-status").innerHTML = '<span class="badge bg-info">ACTIVE</span>';
            document.getElementById("raffle-buy-ticket-button").innerHTML = '<button onclick="App.buyTicket()" class="btn btn-primary">Buy ticket</button>';
        }

        document.getElementById("token-id").innerText = 'Token id: #' + this.selectedRaffle.tokenId;
        let code = 'Ticket price: ' + Web3.utils.fromWei(this.selectedRaffle.price, 'ether') + ' eth</br>';
        code += 'Total tickets: ' + this.selectedRaffle.numTickets + '/' + this.selectedRaffle.maxTickets + '</br>';
        code += 'Owner: ' + this.selectedRaffle.owner.substring(0, 6) + "..." + this.selectedRaffle.owner.substring(this.selectedRaffle.owner.length - 4, this.selectedRaffle.owner.length) + '</br>';
        code += 'Contract: ' + this.selectedRaffle.tokenContract.substring(0, 6) + "..." + this.selectedRaffle.tokenContract.substring(this.selectedRaffle.tokenContract.length - 4, this.selectedRaffle.tokenContract.length) + '</br>';
        code += 'End Date: ' + getRaffleEndDateStr(this.selectedRaffle.creationDate, this.selectedRaffle.durationInDays) + '</br>';
        document.getElementById("raffle-details").innerHTML = code;

        //fill form
        document.getElementById("raffle-ticket-nft-contract-address").value = this.selectedRaffle.tokenContract;
        document.getElementById("raffle-ticket-nft-id").value = this.selectedRaffle.tokenId;
        document.getElementById("raffle-ticket-num").value = 1;
        document.getElementById("raffle-ticket-unitprice").value = Web3.utils.fromWei(String(this.selectedRaffle.price), 'ether');
        await this.calculatePrice();
        let networkId = await web3.eth.net.getId();
        let metaPunkstemp = new web3.eth.Contract(
            erc721.abi,
            this.selectedRaffle.tokenContract,
        );
        let erc721TokenUri = await metaPunkstemp.methods.tokenURI(tokenId).call();
        if (erc721TokenUri) {
            fetch(erc721TokenUri + ".json", {method: "GET", mode: 'cors', headers: {}})
                .then(response => response.json())
                .then(data => {
                    const balanceElement = document.getElementById("image");
                    balanceElement.src = this.getImageByTokenURI(data.image);
                });
        }
    },
    getImageByTokenURI: function (tokenUri) {
        if (tokenUri.includes("ipfs://")) {
            return "https://ipfs.io/ipfs/" + tokenUri.replace("ipfs://", "");
        } else {
            return tokenUri;
        }
    },
    refreshTickets: async function () {
        const {web3} = this;
        const {getTicketsByContractAndTokenId} = this.rafflesContract.methods;
        const tickets = await getTicketsByContractAndTokenId(this.selectedRaffle.tokenContract, this.selectedRaffle.tokenId).call();
        var tbodyRef = document.getElementById('tickets-table').getElementsByTagName('tbody')[0];
        tbodyRef.innerHTML = "";
        //Insert claim prize button
        if (this.selectedRaffle.winner === this.account && this.selectedRaffle.isFinished && !this.selectedRaffle.winnerClaimed) {
            let claimPrizeButton = document.createElement('button');
            claimPrizeButton.addEventListener('click', event => {
                App.claimRafflePrize(this.selectedRaffle.tokenContract, this.selectedRaffle.tokenId);
            });
            claimPrizeButton.className = "btn btn-primary btn-sm";
            claimPrizeButton.innerHTML = "Claim prize";
            document.getElementById('raffle-winner').innerHTML = "";
            document.getElementById('raffle-winner').appendChild(claimPrizeButton);
        } else if (this.selectedRaffle.winnerClaimed) {
            document.getElementById('raffle-winner').innerHTML = "Winner claimed: Yes";
        }

        // Insert claim revenue button
        if (this.selectedRaffle.owner === this.account && this.selectedRaffle.isFinished && !this.selectedRaffle.ownerClaimed) {
            let claimRevenueButton = document.createElement('button');
            claimRevenueButton.addEventListener('click', event => {
                App.claimRaffleRevenue(this.selectedRaffle.tokenContract, this.selectedRaffle.tokenId);
            });
            claimRevenueButton.className = "btn btn-primary btn-sm";
            let revenue = this.selectedRaffle.price * this.selectedRaffle.numTickets;
            claimRevenueButton.innerHTML = "Claim revenue (" + Web3.utils.fromWei(String(revenue), 'ether') + " ether)";
            document.getElementById('raffle-owner').innerHTML = "";
            document.getElementById('raffle-owner').appendChild(claimRevenueButton);
        } else if (this.selectedRaffle.ownerClaimed) {
            document.getElementById('raffle-owner').innerHTML = "Owner claimed: Yes";
        }

        //fill tickets
        for (const ticket of tickets) {
            var newRow = tbodyRef.insertRow();
            //var newCell = newRow.insertCell();
            //var newText = document.createTextNode(ticket.owner);
            newRow.insertCell().appendChild(document.createTextNode(ticket.owner));
            newRow.insertCell().appendChild(document.createTextNode(ticket.numTickets));

            if (this.selectedRaffle.winner === ticket.owner) {
                newRow.insertCell().appendChild(document.createTextNode("Yes"));
            } else {
                newRow.insertCell().appendChild(document.createTextNode("-"));
            }
        }
    },
    claimRaffleRevenue: async function (contractAddress, tokenId) {
        const {claimRaffleRevenue} = this.rafflesContract.methods;
        await claimRaffleRevenue(contractAddress, tokenId).send({from: this.account}, function (err, transactionHash) {
        });
        await this.refreshTickets();
    },
    claimRafflePrize: async function (contractAddress, tokenId) {
        const {claimRafflePrize} = this.rafflesContract.methods;
        await claimRafflePrize(contractAddress, tokenId).send({from: this.account}, function (err, transactionHash) {
        });
        await this.refreshTickets();
    },
    calculatePrice: async function () {
        //Get raffle price
        const raffleTicketNum = document.getElementById("raffle-ticket-num").value;
        const rafflePriceEth = document.getElementById("raffle-ticket-unitprice").value;
        document.getElementById("raffle-ticket-price").value = Math.round(rafflePriceEth * raffleTicketNum * 100) / 100;
    },
    buyTicket: async function () {
        const raffleNftContractAddress = document.getElementById("raffle-ticket-nft-contract-address").value;
        const raffleNftId = document.getElementById("raffle-ticket-nft-id").value;
        const raffleTicketNum = document.getElementById("raffle-ticket-num").value;
        const rafflePriceEth = document.getElementById("raffle-ticket-price").value;
        const rafflePriceEthWei = Web3.utils.toWei(String(rafflePriceEth), 'ether');
        const {buyRaffleTicket} = this.rafflesContract.methods;
        await buyRaffleTicket(raffleNftContractAddress, raffleNftId, raffleTicketNum).send({
            from: this.account,
            value: rafflePriceEthWei
        }, function (err, transactionHash) {
        });
        await this.refreshTickets();
    },
    setStatus: function (id, message) {
        console.log("Id:" + id + ", Message:" + message);
    },
};

window.App = App;
load();