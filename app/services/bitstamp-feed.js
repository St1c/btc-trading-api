const Subject = require('rxjs/Subject').Subject;
const WebSocket = require('websocket').w3cwebsocket;

const bitstampLiveTrades = new Subject();

initLiveTrades();

function initLiveTrades() {
    let ws = new WebSocket("wss://ws.bitstamp.net");

    const subscribeMsg = {
        "event": "bts:subscribe",
        "data": {
            "channel": "live_trades_btcusd"
        }
    };

    ws.onopen = () => {
        ws.send(JSON.stringify(subscribeMsg));
        console.log('Bitstamp websocket connection opened');
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
                bitstampLiveTrades.next(response.data);
                break;
            }
            case 'bts:request_reconnect': {
                initLiveTrades();
                break;
            }
        }

    };

    /**
     * In case of unexpected close event, try to reconnect.
     */
    ws.onclose = () => {
        console.log('Bitstamp websocket connection closed');
        initLiveTrades();
    };
}

module.exports.bitstampLiveTrades = bitstampLiveTrades;