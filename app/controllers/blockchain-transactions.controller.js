const { WebClient } = require('@slack/web-api');
const blockchainFeed = require('../services/blockchain-feed');

blockchainFeed.blockchainTransactions.subscribe(processBlockchainTransactions);

const limitBTC = 10;
let moves = []

async function whaleMoves(ctx, next) {
    if (moves.length == 0) {
        ctx.body = { error: 'No moves recorded yet' };
        return;
    }

    ctx.body = {

    };
}

function processBlockchainTransactions(data) {
    const satoshi = 100000000;

    let inputValues = [];
    let outputValues = [];
    let inAddr = [];
    let outAddr = [];

    data.x.inputs.map((curr) => {
        inputValues.push(curr.prev_out.value);
        inAddr.push(curr.prev_out.addr)
    });
    data.x.out.map((curr) => {
        outputValues.push(curr.value);
        outAddr.push(curr.addr)
    });

    let outgoingSum = 0;
    outAddr.map((_, index) => {
        if (inAddr.indexOf(_) == -1) {
            outgoingSum += outputValues[index];
        }
    });

    outgoingSum /= satoshi;
    const incomingValue = inputValues.reduce((prev, curr) => prev + curr, 0) / satoshi;
    const outgoingValue = outputValues.reduce((prev, curr) => prev + curr, 0) / satoshi;

    if (outgoingSum > 300) {
        console.log(data.x.hash, outgoingSum);
    }

    if (outgoingSum > 500) {
        notifySlack(`<@UM53EKDS5> ${outgoingSum}BTC moved, Fee: ${incomingValue - outgoingValue}, Hash: ${data.x.hash}`);
    }
}

function notifySlack(message) {
    const token = process.env.SLACK_TOKEN;

    const web = new WebClient(token);
    const conversationId = 'data-analytics-apps';
    const messsageTitle = 'Whale move';

    (async () => {
        // See: https://api.slack.com/methods/chat.postMessage
        const res = await web.chat.postMessage({
            channel: conversationId,
            text: messsageTitle,
            attachments: [{
                text: message,
                color: 'danger'
            }],
            link_names: true
        });
    })();
}


module.exports.whaleMoves = whaleMoves;