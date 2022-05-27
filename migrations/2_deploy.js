const emojis = artifacts.require("CryptoEmojis");
const openRafflesCore = artifacts.require("OpenRafflesCore");
const punks = artifacts.require("Punks");

module.exports = function (deployer) {
    deployer.deploy(emojis);
    deployer.deploy(punks);
    deployer.deploy(openRafflesCore);
};