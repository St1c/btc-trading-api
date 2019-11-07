const Subject = require('rxjs/Subject').Subject;
const WebSocket = require('websocket').w3cwebsocket;
// var request = require('request');

const blockchainTransactions = new Subject();
// const orderBookSnapshot = new Subject();

initBlockchainTransactions();

function initBlockchainTransactions() {
    // let firstSocketReceived = false;
    console.log('Connecting to Blockchain...')
    let ws = new WebSocket('wss://ws.blockchain.info/inv');

    ws.onopen = () => {
        console.log('Blockchain websocket connection opened');
        ws.send(JSON.stringify({ "op": "unconfirmed_sub" }));
    };

    ws.onmessage = (evt) => {
        let response = JSON.parse(evt.data);
        // if (!firstSocketReceived) {
        //     fetchOrdersBinance();
        // }
        // firstSocketReceived = true;
        blockchainTransactions.next(response);
    };

    /**
     * In case of unexpected close event, try to reconnect.
     */
    ws.onclose = () => {
        console.log('Blockchain websocket connection closed');
        initBlockchainTransactions();
    };
}

// function fetchOrdersBinance() {
//     request.get({
//         url: 'https://www.binance.com/api/v1/depth?symbol=BTCUSDT&limit=5000',
//         json: true,
//         headers: { 'User-Agent': 'request' }
//     }, (err, res, data) => {
//         if (err) {
//             console.error(err)
//             return;
//         };
//         if (data.msg) {
//             console.error('Binance error: ', data.msg)
//             return;
//         }
//         orderBookSnapshot.next(data)
//     });
// }

module.exports.blockchainTransactions = blockchainTransactions
// module.exports.orderBookSnapshot = orderBookSnapshot
// module.exports.fetchOrdersBinance = fetchOrdersBinance