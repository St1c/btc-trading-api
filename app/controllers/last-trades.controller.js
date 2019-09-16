const { WebClient } = require('@slack/web-api');
var Pushover = require('node-pushover');
const bitstampLiveTrades = require('../services/bitstamp-feed').bitstampLiveTrades;

module.exports.index = index;

bitstampLiveTrades.subscribe(
    data => processLiveTrades(data)
)

const allowedPercentageChange = 1.09;
var priceHistory = [];
let lastIntervalData = {};
let lastSignificantChanges = [];

let lastMaxInNotification = 0;
let lastMinInNotification = 0;
let lastNotificationTime;
let lastNotificationTimeSlack;
let lastNotificationTimePush;

var push = new Pushover({
    token: process.env.PUSHOVER_TOKEN,
    user: process.env.PUSHOVER_USERID
});


async function index(ctx, next) {
    ctx.body = lastSignificantChanges;
}

function processLiveTrades(data) {
    const memoryWindowLength = 15 * 60;
    const lowestAllowedTimestamp = data.timestamp - memoryWindowLength;

    priceHistory = priceHistory.filter(_ => +_.timestamp > lowestAllowedTimestamp);

    let min = data.price;
    let max = data.price;
    let sum = 0;
    const count = priceHistory.length;

    priceHistory.map(_ => {
        if (_.price < min) min = _.price;
        if (_.price > max) max = _.price;
        sum += _.price;
    });

    const decreaseRelativeToMax = Math.round(100 * (100 - (100 * data.price / max))) / 100;
    const increaseRelativeToMin = Math.round(100 * (100 * data.price / min - 100)) / 100;
    
    let decreaseRelativeToNotifiedMax = lastMaxInNotification != 0 ? Math.round(100 * (100 - (100 * data.price / lastMaxInNotification))) / 100 : allowedPercentageChange;
    let increaseRelativeToNotifiedMin = lastMinInNotification != 0 ? Math.round(100 * (100 * data.price / lastMinInNotification - 100)) / 100 : allowedPercentageChange;

    if ((Date.now() - lastNotificationTime) > memoryWindowLength * 1000 ) {
        decreaseRelativeToNotifiedMax = allowedPercentageChange;
        increaseRelativeToNotifiedMin = allowedPercentageChange;
    }

    const d = new Date(Date.now());
    const time = d.toLocaleString()
    lastIntervalData = { min, max, time, currentPrice: data.price };

    if (priceHistory.length > 0) {
        lastIntervalData.direction = data.price > priceHistory[priceHistory.length - 1].price;
    }

    console.log((Date.now() - lastNotificationTime)/1000, decreaseRelativeToMax, decreaseRelativeToNotifiedMax, data.price, max);
    if (decreaseRelativeToMax > allowedPercentageChange && decreaseRelativeToNotifiedMax >= allowedPercentageChange) {
        lastMaxInNotification = data.price;
        lastSignificantChanges.unshift({
            type: -1,
            time, min, max, count, decreaseRelativeToMax, increaseRelativeToMin, price: data.price
        });

        notify(`DOWN: ${ decreaseRelativeToMax }% decrease from ${ max }$ to: ${ data.price }$`);
        notifySlack(`<@UM53EKDS5> DOWN: ${decreaseRelativeToMax}% decrease from ${max}$ to: ${data.price}$`, -1);
        notifyPusher(`DOWN: ${decreaseRelativeToMax}% from ${max}$ to ${data.price}$`, decreaseRelativeToMax, -1);
    };
    if (increaseRelativeToMin > allowedPercentageChange && increaseRelativeToNotifiedMin >= allowedPercentageChange) {
        lastMinInNotification = data.price;
        lastSignificantChanges.unshift({
            type: 1,
            time, min, max, count, decreaseRelativeToMax, increaseRelativeToMin, price: data.price
        });
        notify(`UP: ${increaseRelativeToMin}% increase from ${min}$ to: ${data.price}$`);
        notifySlack(`<@UM53EKDS5> UP: ${increaseRelativeToMin}% increase from ${min}$ to: ${data.price}$`, 1)
        notifyPusher(`UP: ${increaseRelativeToMin}% from ${min}$ to: ${data.price}$`, increaseRelativeToMin, 1)
    };

    priceHistory.push({ timestamp: data.timestamp, price: data.price });
}

function notify(message) {
    let timeLimit = 0;
    let now = Date.now();

    if (!lastNotificationTime || (now - lastNotificationTime) > timeLimit) {
        console.log(message);
        lastNotificationTime = now;
    }
}

function notifySlack(message, type) {
    let timeLimit = 1 * 60 * 1000;
    let now = Date.now();
    const token = process.env.SLACK_TOKEN;

    const web = new WebClient(token);
    const conversationId = 'data-analytics-apps';

    if (!lastNotificationTimeSlack || (now - lastNotificationTimeSlack) > timeLimit) {
        lastNotificationTimeSlack = now;
        const color = type > 0 ? 'good' : 'danger';
        const messsageTitle = type > 0 ? 'Price increase' : 'Price decrease';

        (async () => {
            // See: https://api.slack.com/methods/chat.postMessage
            const res = await web.chat.postMessage({
                channel: conversationId,
                text: messsageTitle,
                attachments: [{
                    text: message,
                    color: color
                }],
                link_names: true
            });
        })();
    }
}

function notifyPusher(message, change, type) {
    let timeLimit = 1 * 60 * 1000;
    let now = Date.now();

    if (!lastNotificationTimePush || (now - lastNotificationTimePush) > timeLimit) {
        lastNotificationTimePush = now;
        const messsageTitle = type > 0 ? `BTC Up ${change}%` : `BTC Down ${change}%`;
        push.send(messsageTitle, message);
    }
}
