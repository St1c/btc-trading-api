const binanceFeed = require('../services/binance-feed');
const bitstampFeed = require('../services/bitstamp-feed');

let currentPrice;
let binanceOrderBookAsks = [];
let binanceOrderBookBids = [];
let binanceOrderBookBuffer = [];
let binanceOrderBookSnapshotReady = false;

binanceFeed.orderBook.subscribe(processOrderBook);
binanceFeed.orderBookSnapshot.subscribe(processOrderBookSnapshot);
bitstampFeed.bitstampLiveTrades.subscribe(setCurrentPrice);

setInterval(() => {
    resetOrderBook();
}, 60000);

async function orderLevels(ctx, next) {
    let levelSize = ctx.request.query.levelSize || 25;

    ctx.body = {
        bids: Object.entries(createOrderLevels(binanceOrderBookBids, levelSize)),
        asks: Object.entries(createOrderLevels(binanceOrderBookAsks, levelSize))
    };
}

async function significantOrders(ctx, next) {
    bids = binanceOrderBookBids.filter(_ => parseFloat(_[1]) > 50);
    asks = binanceOrderBookAsks.filter(_ => parseFloat(_[1]) > 50);
    if (bids.length == 0) {
        ctx.body = { error: 'No significant orders' };
    } else {
        ctx.body = { bids: bids, asks: asks };
    }
}

async function requiredBtcMovesToChangeByPercent(ctx, next) {
    if (!currentPrice) {
        ctx.body = { error: 'Current price not known yet'};
        return;
    }

    const asks = binanceOrderBookAsks;
    const bids = binanceOrderBookBids;
    const onePercent = currentPrice / 100;

    let asks5Percent = asks.filter(_ => parseFloat(_[0]) <= (currentPrice + (5.5 * onePercent)));
    let asks3Percent = asks5Percent.filter(_ => parseFloat(_[0]) <= (currentPrice + (3.3 * onePercent)));
    let asks1Percent = asks5Percent.filter(_ => parseFloat(_[0]) <= (currentPrice + (1.1 * onePercent)));

    asks5Percent = asks5Percent.reduce((acc, curr) => acc + parseFloat(curr[1]), 0);
    asks3Percent = asks3Percent.reduce((acc, curr) => acc + parseFloat(curr[1]), 0);
    asks1Percent = asks1Percent.reduce((acc, curr) => acc + parseFloat(curr[1]), 0);

    let bids5Percent = bids.filter(_ => parseFloat(_[0]) >= (currentPrice - (5.5 * onePercent)));
    let bids3Percent = bids5Percent.filter(_ => parseFloat(_[0]) >= (currentPrice - (3.3 * onePercent)));
    let bids1Percent = bids5Percent.filter(_ => parseFloat(_[0]) >= (currentPrice - (1.1 * onePercent)));
        
    bids5Percent = bids5Percent.reduce((acc, curr) => acc + parseFloat(curr[1]), 0);
    bids3Percent = bids3Percent.reduce((acc, curr) => acc + parseFloat(curr[1]), 0);
    bids1Percent = bids1Percent.reduce((acc, curr) => acc + parseFloat(curr[1]), 0);

    ctx.body = {
        asks: {
            [currentPrice + (1 * onePercent)]: asks1Percent, 
            [currentPrice + (3 * onePercent)]: asks3Percent, 
            [currentPrice + (5 * onePercent)]: asks5Percent
        },
        bids: {
            [currentPrice - (1 * onePercent)]: bids1Percent, 
            [currentPrice - (3 * onePercent)]: bids3Percent, 
            [currentPrice - (5 * onePercent)]: bids5Percent
        }
    };
}

function resetOrderBook() {
    binanceOrderBookBids = [];
    binanceOrderBookAsks = [];
    binanceOrderBookBuffer = [];
    binanceOrderBookSnapshotReady = false;

    binanceFeed.fetchOrdersBinance();
}

function createOrderLevels(orderBook, levelSize = 25) {
    if (orderBook.length == 0) return;

    let levels = {};

    orderBook.forEach(pair => {
        const level = roundToClosestNumber(pair[0], levelSize);

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
            const res = updateLocalOrderBookLevel(bid, index, d.b, 'bids');
            if (res) temp.push(...res);
        });
        binanceOrderBookBids = JSON.parse(JSON.stringify(temp));

        temp = [];
        binanceOrderBookAsks.forEach((ask, index) => {
            const res = updateLocalOrderBookLevel(ask, index, d.a, 'asks');
            if (res) temp.push(...res);
        });
        binanceOrderBookAsks = JSON.parse(JSON.stringify(temp));

        console.log('orders after update: ', binanceOrderBookBids.length);
    }
}

function processOrderBookSnapshot(data) {
    binanceOrderBookSnapshotReady = true;

    let filteredBuffer = binanceOrderBookBuffer.filter(_ => _.u > data.lastUpdateId)

    binanceOrderBookBids = [...data.bids];
    filteredBuffer.forEach(diff => {
        if (diff.b.length == 0) return;
        let temp = [];
        binanceOrderBookBids.forEach((bid, index) => {
            const res = updateLocalOrderBookLevel(bid, index, diff.b, 'bids');
            if (res) temp.push(...res);
        });
        binanceOrderBookBids = JSON.parse(JSON.stringify(temp));
    });


    binanceOrderBookAsks = [...data.asks];
    filteredBuffer.forEach(diff => {
        if (diff.a.length == 0) return;
        let temp = [];
        binanceOrderBookAsks.forEach((ask, index) => {
            const res = updateLocalOrderBookLevel(ask, index, diff.a, 'asks');
            if (res) temp.push(...res);
        });
        binanceOrderBookAsks = JSON.parse(JSON.stringify(temp));
    });

    console.log('Received orders: ', binanceOrderBookBids.length);
}

function updateLocalOrderBookLevel(level, levelIndex, diff, type) {
    let res;
    let newLevel;
    diff.forEach(currentDiff => {
        if (currentDiff[0] == level[0]) {
            res = currentDiff;
        }

        if (type == 'bids') {
            newLevel = checkIfNewBidsLevel(level, levelIndex, currentDiff);
        }
        
        if (type == 'asks') {
            newLevel = checkIfNewAsksLevel(level, levelIndex, currentDiff);
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

/**
 * If diff level is not equal to current level in order book, it neccessary to check if it is new one. 
 * If it's smaller then previous, and larger then next one in the order book (assuming descending order) 
 * Then it is definitelly a new level, and must be added to the list
 * 
 * @param {*} level current level value
 * @param {*} levelIndex current level index in bids/asks  
 * @param {*} currentDiff New order book diff level
 */
function checkIfNewBidsLevel(level, levelIndex, currentDiff) {
    if (levelIndex > 0 && levelIndex < (binanceOrderBookBids.length - 1) && currentDiff[0] != level[0]) {
        const previousLevel = parseFloat(binanceOrderBookBids[levelIndex - 1][0]);
        const nextLevel = parseFloat(binanceOrderBookBids[levelIndex + 1][0]);

        if (parseFloat(currentDiff[0]) < previousLevel && parseFloat(currentDiff[0]) > nextLevel && parseFloat(currentDiff[1]) > 0) {
            return currentDiff;
        }
    }

    return;
}

/**
 * If diff level is not equal to current level in order book, it neccessary to check if it is new one. 
 * If it's larger then previous, and smaller then next one in the order book (assuming ascending order) 
 * Then it is definitelly a new level, and must be added to the list
 * 
 * @param {*} level current level value
 * @param {*} levelIndex current level index in bids/asks
 * @param {*} currentDiff New order book diff level
 */
function checkIfNewAsksLevel(level, levelIndex, currentDiff) {
    if (levelIndex > 0 && levelIndex < (binanceOrderBookAsks.length - 1) && currentDiff[0] != level[0]) {
        const previousLevel = parseFloat(binanceOrderBookAsks[levelIndex - 1][0]);
        const nextLevel = parseFloat(binanceOrderBookAsks[levelIndex + 1][0]);

        if (parseFloat(currentDiff[0]) > previousLevel && parseFloat(currentDiff[0]) < nextLevel && parseFloat(currentDiff[1]) > 0) {
            return currentDiff;
        }
    }

    return;
}

/**
 * Round to closes defined integer value (e.g. if limiter=25, then round price=31 to 25)
 * 
 * @param {number} price Current price
 * @param {number} limiter Closes integer value to round to
 */
function roundToClosestNumber(price, limiter) {
    return Math.round(price / limiter) * limiter;
}

/**
 * Set current price
 * 
 * @param {timestamp, price} data Current price from WS stream
 */
function setCurrentPrice(data) {
    currentPrice = data.price;
}

module.exports.orderLevels = orderLevels;
module.exports.significantOrders = significantOrders;
module.exports.requiredBtcMovesToChangeByPercent = requiredBtcMovesToChangeByPercent;