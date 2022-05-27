# Open Raffles
[![https://badges.frapsoft.com/os/mit/mit.svg?v=102](https://badges.frapsoft.com/os/mit/mit.svg?v=102)](https://opensource.org/licenses/MIT)

Over the last decade there has been an exponential increase in the adoption of
blockchain technology around the world, users have begun to become aware of the
importance of decentralization, the elimination of intermediaries, the control of
personal data and anonymity.
This project envisages the development of a decentralized raffle system based on
the Ethereum blockchain that will allow the raffle of non-fungible tokens that meet the
EIP-721 standard.

Open raffles is an open source decentralized JavaScript app that allow users 
to raffle EIP-721: Non-Fungible Token Standard and participate in the raffles.

## Getting Started

This repository comes with two ERC721 contracts to test it (Punks and CryptoEmojis).

You can test the application in localhost using trufflesuite following the steps bellow:

1. Install openzeppelin-solidity library defined in package.json

```bash
npm install
```

2. Start ganache-cli and save the private keys to test

```bash
ganache-cli
```

3. Deploy all contracts (Punks, CryptoEmojis and OpenRafflesCore)

```bash
truffle deploy migrate --network development
```
   
4. Install javascript libraries and start webpack application

```bash
cd app
npm install
npm run dev
```
5. Open http://localhost:8080/ in a web browser.
6. Import private keys in MetaMask pluguin and connect to the application.

