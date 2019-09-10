const binanceFeed = require('../services/binance-feed');

let binanceOrderBookBids = [];
let binanceOrderBookBuffer = [];
let binanceOrderBookSnapshotReady = false;

binanceFeed.orderBook.subscribe(processOrderBook);
binanceFeed.orderBookSnapshot.subscribe(processOrderBookSnapshot);

setInterval(() => {
    resetOrderBook();
}, 60000);

async function orderLevels(ctx, next) {
    ctx.body = {
        data: Object.entries(createOrderLevels(binanceOrderBookBids))
    };
}

async function significantOrders(ctx, next) {
    bids = binanceOrderBookBids.filter(_ => parseFloat(_[1]) > 50);
    if (bids.length == 0) {
        ctx.body = { error: 'No significant orders' };
    } else {
        ctx.body = { data: bids };
    }
}

function resetOrderBook() {
    binanceOrderBookBids = [];
    binanceOrderBookBuffer = [];
    binanceOrderBookSnapshotReady = false;

    binanceFeed.fetchOrdersBinance();
}

function createOrderLevels(orderBook) {
    if (orderBook.length == 0) return;

    let levels = {};

    orderBook.forEach(pair => {
        const level = roundToClosestNumber(pair[0], 25);

        if (!levels.hasOwnProperty(level)) {
            levels[level] = parseFloat(pair[1]);
        } else {
            levels[level] += parseFloat(pair[1]);
        }
    });

    Object.keys(levels).map(_ => levels[_] = Math.round(100 * levels[_])/100);
    
    return levels;
}

function processOrderBook(data) {
    let d = {
        u: data.u,
        U: data.U,
        E: data.E,
        b: data.b,
        a: data.a
    }
    // console.log(d.b.slice(0,4));
    if (!binanceOrderBookSnapshotReady) {
        binanceOrderBookBuffer.push(d);
    } else {
        binanceOrderBookBuffer = [];
        if (d.b.length == 0) return;

        let temp = [];
        binanceOrderBookBids.forEach((bid, index) => {
            const res = updateLocalOrderBookLevel(bid, index, d.b);
            if (res) temp.push(...res);
        });
        binanceOrderBookBids = JSON.parse(JSON.stringify(temp));

        console.log('orders after update: ', binanceOrderBookBids.length);
    }
}

function processOrderBookSnapshot(data) {
    let filteredBuffer = binanceOrderBookBuffer.filter(_ => _.u > data.lastUpdateId)

    binanceOrderBookBids = [...data.bids];
    filteredBuffer.forEach(diff => {
        if (diff.b.length == 0) return;
        let temp = [];
        binanceOrderBookBids.forEach((bid, index) => {
            const res = updateLocalOrderBookLevel(bid, index, diff.b);
            if (res) temp.push(...res);
        });
        binanceOrderBookBids = JSON.parse(JSON.stringify(temp));
    });

}

function updateLocalOrderBookLevel(level, levelIndex, diff) {
    let res;
    let newLevel;
    diff.forEach(_ => {
        if (_[0] == level[0]) {
            res = _;
        }

        // If diff level is not equal to current level in order book, it neccessary to check if it is new one.
        // If it's smaller then previous, and larger then next one in the order book (assuming descending order)
        // Then it is definitelly a new level, and must be added to the list
        if (levelIndex > 0 && levelIndex < (binanceOrderBookBids.length - 1) && _[0] != level[0]) {
            const previousLevel = parseFloat(binanceOrderBookBids[levelIndex - 1][0]);
            const nextLevel = parseFloat(binanceOrderBookBids[levelIndex + 1][0]);

            if (parseFloat(_[0]) < previousLevel && parseFloat(_[0]) > nextLevel && parseFloat(_[1]) > 0) {
                newLevel = _;
            }
        }
    });

    if (newLevel) {
        // Return new level, together with current level 
        // Decide order based on value compared to current level
        if (parseFloat(newLevel[0]) > parseFloat(level[0])) {
            return [newLevel, level];
        }
        return [level, newLevel];
    };

    if (res) {
        if (parseFloat(res[1]) == 0) {
            return;
        };
        return [res];
    }
    return [level];
}

function roundToClosestNumber(price, limiter) {
    return Math.round(price / limiter) * limiter;
}

module.exports.orderLevels = orderLevels;
module.exports.significantOrders = significantOrders;