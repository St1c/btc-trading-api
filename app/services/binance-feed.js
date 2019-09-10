const Subject = require('rxjs/Subject').Subject;
const WebSocket = require('websocket').w3cwebsocket;
var request = require('request');

// const ajax = require('rxjs/ajax').ajax;
// const map = require('rxjs/operators/map').map;
// const catchError = require('rxjs/operators/catchError').catchError;

const orderBook = new Subject();
const orderBookSnapshot = new Subject();

module.exports.orderBook = orderBook
module.exports.orderBookSnapshot = orderBookSnapshot

initOrderBook();

function initOrderBook() {
    let firstSocketReceived = false;
    console.log('Connecting to Binance...')
    let ws = new WebSocket("wss://stream.binance.com:9443/ws/btcusdt@depth");

    ws.onopen = () => {
        console.log('Binance websocket connection opened');
    };

    ws.onmessage = (evt) => {
        let response = JSON.parse(evt.data);
        if (!firstSocketReceived) {
            fetchOrdersBinance();
        }
        firstSocketReceived = true;
        orderBook.next(response);
    };

    /**
     * In case of unexpected close event, try to reconnect.
     */
    ws.onclose = () => {
        console.log('Binance websocket connection closed');
        initOrderBook();
    };
}

function fetchOrdersBinance() {
    request.get({
        url: 'https://www.binance.com/api/v1/depth?symbol=BTCUSDT&limit=5000',
        json: true,
        headers: { 'User-Agent': 'request' }
    }, (err, res, data) => {
        if (err) {
            console.error(err)
            return;
        };
        if (data.msg) {
            console.error('Binance error: ', data.msg)
            return;
        }
        orderBookSnapshot.next(data)
    });
}