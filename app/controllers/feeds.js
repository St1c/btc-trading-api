const Subject = require('rxjs/Subject').Subject;
const WebSocket = require('websocket').w3cwebsocket;
const ajax = require('rxjs/ajax').ajax;
const map = require('rxjs/operators/map').map;
const catchError = require('rxjs/operators/catchError').catchError;
var request = require('request');

const binanceOrderBook = new Subject();
const binanceOrderBookSnapshot = new Subject();
const bitstampLastTrades = new Subject();

module.exports.bitstampLastTrades = bitstampLastTrades
module.exports.binanceOrderBook = binanceOrderBook
module.exports.binanceOrderBookSnapshot = binanceOrderBookSnapshot

initOrderBook();
initLiveOrders();

function initLiveOrders() {
    let ws = new WebSocket("wss://ws.bitstamp.net");

    const subscribeMsg = {
        "event": "bts:subscribe",
        "data": {
            "channel": "live_trades_btcusd"
        }
    };

    ws.onopen = () => {
        ws.send(JSON.stringify(subscribeMsg));
        console.log('Websocket connection opened');
    };

    ws.onmessage = (evt) => {
        let response = JSON.parse(evt.data);
        /**
         * This switch statement handles message logic. It processes data in case of trade event
         * and it reconnects if the server requires.
         */
        switch (response.event) {
            case 'trade': {
                // processLastOrders(response.data);
                bitstampLastTrades.next(response.data);
                break;
            }
            case 'bts:request_reconnect': {
                initLiveOrders();
                break;
            }
        }

    };

    /**
     * In case of unexpected close event, try to reconnect.
     */
    ws.onclose = () => {
        console.log('Websocket connection closed');
        initLiveOrders();
    };
}

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
        binanceOrderBook.next(response);
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
            console.error(data.msg)
            return;
        }
        binanceOrderBookSnapshot.next(data)
    });
}