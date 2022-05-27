
//Contract Application Binary Interface for functions totalSupply,tokenURI, mint
export const erc721TotalSupplyAbi = [{
    "inputs": [],
    "name": "totalSupply",
    "outputs": [
        {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
        }
    ],
    "stateMutability": "view",
    "type": "function",
    "constant": true
},
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "quantity",
                "type": "uint256"
            }
        ],
        "name": "mint",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function",
        "payable": true
    }];

export const monthShortNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function getRaffleEndDateStr(timeStamp, durationInDays) {
    let unix_timestamp = timeStamp;
    let date = new Date(unix_timestamp * 1000);
    date.setDate(date.getDate() + parseInt(durationInDays));
    return convertDateToString(date);
};

export function getRaffleStartDateStr(timeStamp) {
    let unix_timestamp = timeStamp;
    let date = new Date(unix_timestamp * 1000);
    date.setDate(date.getDate());
    return convertDateToString(date);
};

export function convertDateToString(date) {
    let year = date.getFullYear();
    let month = date.getMonth() + 1;//Because getmonth() start from 0. Y
    let day = date.getDate();
    let hours = date.getHours();
    let minutes = "0" + date.getMinutes();
    let seconds = "0" + date.getSeconds();
    return day + '/' + monthShortNames[month] + '/' + year + " " + hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
}

export function getShortAddressStr(longAddress) {
    return longAddress.substring(0, 6) + "..." + longAddress.substring(longAddress.length - 4, longAddress.length)
};