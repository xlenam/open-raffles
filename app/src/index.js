import Web3 from "web3";
import rafflesCore from "../../build/contracts/OpenRafflesCore.json";
import erc721 from "../../build/contracts/ERC721.json";
import {
    erc721TotalSupplyAbi,
    monthShortNames,
    getRaffleEndDateStr,
    getRaffleStartDateStr,
    getShortAddressStr
} from "./constants";
import './css/style.css';
import {load} from "./app";

export const App = {
    web3: null,
    account: null,
    rafflesContract: null,
    authorizedContracts: null,

    start: async function () {
        const {web3} = this;
        try {
            // get raffles contract instance
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
                await this.refreshRaffles();
            } else {
                accountElement.innerHTML = getShortAddressStr(this.account);
                await this.loadAuthorizedContracts();
                await this.refreshRaffles();
                await this.refreshMyRaffles();
            }
            //Disable admin tab
            //All methods are secured in the smart contract
            const rafflesCoreOwner = await this.rafflesContract.methods.owner().call();
            if (this.account == rafflesCoreOwner) {
                document.getElementById("admin-tab").classList.remove("disabled");
            } else {
                document.getElementById("admin-tab").classList.add("disabled");
            }
        } catch (error) {
            console.error("Could not connect to contract or chain.");
            console.error(error);
        }
    },
    connect: async function () {
        await window.ethereum.request({method: 'eth_requestAccounts'});
    },
    mint: async function (contractAddress) {
        const {web3} = this;
        let contractToMint = new web3.eth.Contract(
            erc721TotalSupplyAbi,
            contractAddress,
        );
        await contractToMint.methods.mint(1).send({from: this.account}, function (err, transactionHash) {
            if (!err)
                App.setStatus("status-admin", "Mint done");
        });
        await this.loadAuthorizedContracts();
    },
    getTotalBalanceByContractAddress: async function (contractAddress) {
        const {web3} = this;
        let metaPunksTemp = new web3.eth.Contract(
            erc721TotalSupplyAbi,
            contractAddress,
        );
        const balance = await metaPunksTemp.methods.totalSupply().call();
        return balance;
    },
    loadAuthorizedContracts: async function () {
        this.authorizedContracts = await this.rafflesContract.methods.getAuthorizedContracts().call();
        let tbodyRef = document.getElementById('contracts-table').getElementsByTagName('tbody')[0];
        tbodyRef.innerHTML = "";
        let selectOption = document.getElementById("raffle-nft-contract-address");
        selectOption.innerHTML = "";
        for (const contract of this.authorizedContracts) {
            let newRow = tbodyRef.insertRow();
            newRow.insertCell().appendChild(document.createTextNode(contract.instance));
            newRow.insertCell().appendChild(document.createTextNode(contract.symbol));
            let totalSupply = await this.getTotalBalanceByContractAddress(contract.instance);
            newRow.insertCell().appendChild(document.createTextNode(totalSupply));
            let mintButton = document.createElement('button');
            mintButton.addEventListener('click', event => {
                App.mint(contract.instance);
            });
            mintButton.className = "btn btn-primary btn-sm";
            mintButton.innerHTML = "Mint";
            newRow.insertCell().appendChild(mintButton);
            let opt = document.createElement("option");
            opt.value = contract.instance;
            opt.innerHTML = contract.symbol + " (" + contract.instance + ")";
            selectOption.appendChild(opt);
        }
    },
    getImageByTokenURI: function (tokenUri) {
        if (tokenUri.includes("ipfs://")) {
            return "https://ipfs.io/ipfs/" + tokenUri.replace("ipfs://", "");
        } else {
            return tokenUri;
        }
    },
    getNFTCardHtmlByTokenURI: function (tokenUri, raffle, htmlId) {
        if (tokenUri) {
            fetch(tokenUri + ".json", {
                method: "GET",
                mode: 'cors',
                headers: {}
            })
                .then(response => response.json())
                .then(data => {
                    let code = '<div class="col-lg-3 col-md-4"><div class="card">';
                    code += '<img class="card-img-top" src="' + this.getImageByTokenURI(data.image) + '"/>';
                    code += '<div class="card-body">';
                    code += '<h5 class="card-title">#' + raffle.tokenId + '</h5>';
                    code += '<p class="card-text">';
                    code += 'Ticket price: ' + Web3.utils.fromWei(raffle.price, 'ether') + ' eth</br>';
                    code += 'Total tickets: ' + raffle.numTickets + '/' + raffle.maxTickets + '</br>';
                    code += 'Owner: ' + getShortAddressStr(raffle.owner) + '</br>';
                    code += 'Contract: ' + getShortAddressStr(raffle.tokenContract) + '</br>';
                    let unix_timestamp = raffle.creationDate;
                    let date = new Date(unix_timestamp * 1000);
                    date.setDate(date.getDate() + parseInt(raffle.durationInDays));
                    let year = date.getFullYear();
                    let month = date.getMonth() + 1;//Because getmonth() start from 0. Y
                    let day = date.getDate();
                    let hours = date.getHours();
                    let minutes = "0" + date.getMinutes();
                    let seconds = "0" + date.getSeconds();
                    code += 'End Date: ' + getRaffleEndDateStr(raffle.creationDate, raffle.durationInDays) + '</br>';
                    code += '<a className="card-link" href="detail.html?c=' + raffle.tokenContract + '&id=' + raffle.tokenId + '">Detail</a></br>';
                    if (raffle.isFinished) {
                        code += '<span class="badge bg-success">FINALIZED</span>';
                    } else {
                        code += '<span class="badge bg-info">ACTIVE</span>';
                    }
                    code += '</div>';
                    code += '</div>';
                    code += '</div>';
                    document.getElementById(htmlId).innerHTML += code;
                });
        }
    },
    refreshRaffles: async function () {
        const {web3} = this;
        const htmlElement = document.getElementById("raffles").innerHTML = "";
        //Raffles table
        let tbodyRef = document.getElementById('raffles-table').getElementsByTagName('tbody')[0];
        tbodyRef.innerHTML = "";
        for (const contract of this.authorizedContracts) {
            const {getRafflesByContract} = this.rafflesContract.methods;
            const rafflesList = await getRafflesByContract(contract.instance).call();
            for (const raffle of rafflesList) {
                let networkId = await web3.eth.net.getId();
                let raffleTokenContract = new web3.eth.Contract(
                    erc721.abi,
                    contract.instance,
                );
                const tokenUri = await raffleTokenContract.methods.tokenURI(raffle.tokenId).call();
                this.getNFTCardHtmlByTokenURI(tokenUri, raffle, "raffles");

                //Fill raffles table in admin
                let newRow = tbodyRef.insertRow();
                newRow.insertCell().appendChild(document.createTextNode(raffle.tokenContract));
                newRow.insertCell().appendChild(document.createTextNode(raffle.tokenId));
                newRow.insertCell().appendChild(document.createTextNode(raffle.numTickets));
                newRow.insertCell().appendChild(document.createTextNode(raffle.maxTickets));
                newRow.insertCell().appendChild(document.createTextNode(getRaffleStartDateStr(raffle.creationDate)));
                newRow.insertCell().appendChild(document.createTextNode(getRaffleEndDateStr(raffle.creationDate, raffle.durationInDays)));
                if (raffle.isFinished == false) {
                    let mintButton = document.createElement('button');
                    mintButton.addEventListener('click', event => {
                        App.executeRaffle(raffle.tokenContract, raffle.tokenId);
                    });
                    mintButton.className = "btn btn-primary btn-sm";
                    mintButton.innerHTML = "Execute";
                    newRow.insertCell().appendChild(mintButton);
                } else {
                    newRow.insertCell().appendChild(document.createTextNode("Finished"));
                }
            }
        }
    },
    executeRaffle: async function (raffleNftContractAddress, raffleNftId) {
        const {executeRaffle} = this.rafflesContract.methods;
        await executeRaffle(raffleNftContractAddress, raffleNftId).send({from: this.account}, function (err, transactionHash) {
        });
    },
    refreshMyRaffles: async function () {
        const address = this.account;
        if (address) {
            const {web3} = this;
            const staked = document.getElementById("my-raffles");
            staked.innerHTML = "";
            for (const contract of this.authorizedContracts) {
                const {getRafflesByOfOwner} = this.rafflesContract.methods;
                const rafflesList = await getRafflesByOfOwner(contract.instance, address).call();
                for (const raffle of rafflesList) {
                    let networkId = await web3.eth.net.getId();
                    let metaPunkstemp = new web3.eth.Contract(
                        erc721.abi,
                        contract.instance,
                    );
                    const tokenUri = await metaPunkstemp.methods.tokenURI(raffle.tokenId).call();
                    this.getNFTCardHtmlByTokenURI(tokenUri, raffle, "my-raffles");
                }
            }
        }
    },
    authorizeContract: async function () {
        const {web3} = this;
        const contractAddress = document.getElementById("nftaddr").value;
        let symbol;
        try {
            let selectedAuthorizeContract = new web3.eth.Contract(
                erc721.abi,
                contractAddress,
            );
            symbol = await selectedAuthorizeContract.methods.symbol().call();
        } catch (e) {
            alert("Invalid contract address");
        }

        if (symbol) {
            await this.rafflesContract.methods.addAuthorizedContract(contractAddress, symbol).send({from: this.account}).on('transactionHash', function (hash) {
                document.getElementById("nftaddr").value = "";
            });
            await this.loadAuthorizedContracts();
        }
    },
    loadSelectedNFTInfo: async function () {
        const {web3} = this;
        const raffleNftContractAddress = document.getElementById("raffle-nft-contract-address").value;
        const raffleNftId = document.getElementById("raffle-nft-id").value;
        document.getElementById("selected-token-image").innerHTML = "";
        try {
            let networkId = await web3.eth.net.getId();
            let tokenContract = new web3.eth.Contract(
                erc721.abi,
                raffleNftContractAddress,
            );

            //Verify user is owner
            const ownerAddress = await tokenContract.methods.ownerOf(raffleNftId).call();
            if (ownerAddress != this.account) {
                throw 'You are not the owner of the selected item';
            }

            //Load token image
            const tokenUri = await tokenContract.methods.tokenURI(raffleNftId).call();
            if (tokenUri) {
                fetch(tokenUri + ".json", {
                    method: "GET",
                    mode: 'cors',
                    headers: {}
                })
                    .then(response => response.json())
                    .then(data => {
                        let code = '<img src="' + this.getImageByTokenURI(data.image) + '" width="100"/>';
                        document.getElementById("selected-token-image").innerHTML += code;
                    });
            }

        } catch (e) {
            alert("You are not the owner of the selected item or id doesn't exist");
        }
    },
    approveNftTransfer: async function () {
        const {web3} = this;
        const raffleNftContractAddress = document.getElementById("raffle-nft-contract-address").value;
        const claimType = document.getElementById("raffle-nft-id").value;
        const networkId = await web3.eth.net.getId();
        this.metaPunks = new web3.eth.Contract(
            erc721.abi,
            raffleNftContractAddress,
        );
        await this.metaPunks.methods.approve(this.rafflesContract.options.address, claimType).send({from: this.account}, function (err, transactionHash) {
            if (!err) {
                App.setStatus("status-create-claim", "NFT approved");
            }
        });
    },
    createRaffle: async function () {
        const raffleNftContractAddress = document.getElementById("raffle-nft-contract-address").value;
        const raffleNftId = document.getElementById("raffle-nft-id").value;
        const rafflePriceEth = document.getElementById("raffle-price").value;
        const raffleSupply = document.getElementById("raffle-supply").value;
        const raffleDuration = document.getElementById("raffle-duration").value;
        const rafflePriceEthWei = Web3.utils.toWei(rafflePriceEth, 'ether');
        const {createRaffle} = this.rafflesContract.methods;
        await createRaffle(raffleNftContractAddress, raffleNftId, rafflePriceEthWei, raffleSupply, raffleDuration).send({from: this.account}, function (err, transactionHash) {
            if (!err) {
                App.setStatus("status-create-raffle", "Raffle created");
            }
        });
        await this.refreshRaffles();
        await this.refreshMyRaffles();
    },
    setStatus: function (id, message) {
        console.log("Id:" + id + ", Message:" + message);
    },
};

window.App = App;
load();