const { WebClient } = require('@slack/web-api');
var Pushover = require('node-pushover');

const blockchainFeed = require('../services/blockchain-feed');
const whaleAddresses = require('../services/whale-addresses');

blockchainFeed.blockchainTransactions.subscribe(processBlockchainTransactions);

let moves = [];

let lastNotificationTimePush;
var push = new Pushover({
    token: process.env.PUSHOVER_TOKEN,
    user: process.env.PUSHOVER_USERID
});

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

    let knownWalletMoveInSum = 0;
    let knownWalletMoveOutSum = 0;

    data.x.inputs.map((curr) => {
        inputValues.push(curr.prev_out.value);
        inAddr.push(curr.prev_out.addr)

        if (whaleAddresses.wallet_25603268.includes(curr.prev_out.addr)) {
            knownWalletMoveInSum += curr.prev_out.value;
        }
    });

    data.x.out.map((curr) => {
        outputValues.push(curr.value);
        outAddr.push(curr.addr)

        if (whaleAddresses.wallet_25603268.includes(curr.addr)) {
            knownWalletMoveOutSum += curr.value;
        }
    });

    let outgoingSum = 0;
    outAddr.map((_, index) => {
        if (inAddr.indexOf(_) == -1) {
            outgoingSum += outputValues[index];
        }
    });

    outgoingSum /= satoshi;
    outgoingSum = Math.round(100 * outgoingSum) / 100;

    const incomingValue = inputValues.reduce((prev, curr) => prev + curr, 0) / satoshi;
    const outgoingValue = outputValues.reduce((prev, curr) => prev + curr, 0) / satoshi;

    if (outgoingSum > 300) {
        console.log(data.x.hash, outgoingSum);
    }

    if (outgoingSum > 500) {
        notifySlack(`<@UM53EKDS5> ${outgoingSum}BTC moved, Fee: ${incomingValue - outgoingValue}, Tx details: https://www.blockchain.com/btc/tx/${data.x.hash}`);
    }

    let knownWalletMoveDiff = Math.round(100 * (knownWalletMoveOutSum / satoshi - knownWalletMoveInSum / satoshi)) / 100;

    if (Math.abs(knownWalletMoveDiff) > 400) {
        let direction = knownWalletMoveDiff > 0 ? 'to' : 'from';
        notifyPusher(`${knownWalletMoveDiff} BTC moved ${direction} known wallet. Whole move volume: ${outgoingSum} BTC. Tx details: https://www.blockchain.com/btc/tx/${data.x.hash}`, knownWalletMoveDiff, knownWalletMoveDiff > 0)
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

function notifyPusher(message, amount, type) {
    let timeLimit = 1 * 10 * 1000;
    let now = Date.now();

    if (!lastNotificationTimePush || (now - lastNotificationTimePush) > timeLimit) {
        lastNotificationTimePush = now;
        const messsageTitle = type ? `Wallet in: ${amount} BTC` : `Wallet out: ${amount} BTC`;
        push.send(messsageTitle, message);
    }
}

module.exports.whaleMoves = whaleMoves;


/**
 * For testing only
 */

// processBlockchainTransactions(getOutgoing());
// processBlockchainTransactions(getIncoming());

function getOutgoing() {
    let raw = {
        "ver": 2,
        "inputs": [
            {
                "sequence": 4294967295,
                "witness": "",
                "prev_out": {
                    "spent": true,
                    "spending_outpoints": [
                        {
                            "tx_index": 508277629,
                            "n": 0
                        }
                    ],
                    "tx_index": 500956517,
                    "type": 0,
                    "addr": "3Kzh9qAqVWQhEsfQz7zEQL1EuSx5tyNLNS",
                    "value": 100000000000,
                    "n": 3,
                    "script": "a914c8ca150ee82589d47f69b8dcd7cad684d88283f187"
                },
                "script": "0047304402205fe5900fa4e4fdf41a189ecc870bcd0e48e0b82f4b39b459391280f243815cb002200780883cd6c40f3aa6882f1588cf8ecc5af14b4fedc765c638290d85fa58cf550147304402200fa59ef6047baeef54e7e42b354d408252127d4a759bcc9a5732d8dfe376a68502207c02f964cacf45ce8e716fb0d0ea23b02f917f240492f72c6e7c03991f29f631014cc95241040e72849f4f214cbe608806b1f5d03c8cd29364455a7e8ea2ab43afd090c083bb9a7925a76ee7d0c34a387af0497fd24ed6b9678e37b2a2a93fe2ebf9ced62e1f410429c8a5b5e875a6f057b215bc704e253b313c70d4ce8d6c7445288ff6ee6dbb898596577fdf4c19100c68659e8cb3ee1f8a5dd033043db09d7f0d2e5a7e10f4a34104d185e90f051ba98ab32c425a0152f9b8c8638b616f1101ec4247a526cac37c5172cf2615dd8eb864291770579b39963915b42d44dd903b52e29e9c95c36b4a2b53ae"
            },
            {
                "sequence": 4294967295,
                "witness": "",
                "prev_out": {
                    "spent": true,
                    "spending_outpoints": [
                        {
                            "tx_index": 508277629,
                            "n": 1
                        }
                    ],
                    "tx_index": 500943082,
                    "type": 0,
                    "addr": "3Kzh9qAqVWQhEsfQz7zEQL1EuSx5tyNLNS",
                    "value": 99999964781,
                    "n": 1,
                    "script": "a914c8ca150ee82589d47f69b8dcd7cad684d88283f187"
                },
                "script": "00483045022100abdd3d26f27fc43b5969871968dedab49542587c29d2052584102d3f52583f1502202d3bb7f6dde58ed3e8b53299fcf95896199f8d9a0894769fc7171b6894fa070901483045022100a90824667115787d0a69f3902cdebb27f1fa2057d1956ac815021868435bd19502205763f8151a9162c75273eafec09d85ddc4f8e917292508cf4819286921389e61014cc95241040e72849f4f214cbe608806b1f5d03c8cd29364455a7e8ea2ab43afd090c083bb9a7925a76ee7d0c34a387af0497fd24ed6b9678e37b2a2a93fe2ebf9ced62e1f410429c8a5b5e875a6f057b215bc704e253b313c70d4ce8d6c7445288ff6ee6dbb898596577fdf4c19100c68659e8cb3ee1f8a5dd033043db09d7f0d2e5a7e10f4a34104d185e90f051ba98ab32c425a0152f9b8c8638b616f1101ec4247a526cac37c5172cf2615dd8eb864291770579b39963915b42d44dd903b52e29e9c95c36b4a2b53ae"
            }
        ],
        "weight": 3428,
        "block_height": 602892,
        "relayed_by": "0.0.0.0",
        "out": [
            {
                "spent": true,
                "spending_outpoints": [
                    {
                        "tx_index": 508338547,
                        "n": 0
                    }
                ],
                "tx_index": 508277629,
                "type": 0,
                "addr": "bc1quq29mutxkgxmjfdr7ayj3zd9ad0ld5mrhh89l2",
                "value": 100000000000,
                "n": 0,
                "script": "0014e0145df166b20db925a3f7492889a5eb5ff6d363"
            },
            {
                "spent": false,
                "tx_index": 508277629,
                "type": 0,
                "addr": "3Kzh9qAqVWQhEsfQz7zEQL1EuSx5tyNLNS",
                "value": 99999945024,
                "n": 1,
                "script": "a914c8ca150ee82589d47f69b8dcd7cad684d88283f187"
            }
        ],
        "lock_time": 0,
        "size": 857,
        "double_spend": false,
        "block_index": 1795516,
        "time": 1573233498,
        "tx_index": 508277629,
        "vin_sz": 2,
        "hash": "9162d88b8f65fe53d94596bc4f30d32b15053602057c5492d88e41494bec7149",
        "vout_sz": 2
    }

    return {
        x: raw
    }
};

function getIncoming() {
    const raw =

    {
        "ver": 2,
        "inputs": [
            {
                "sequence": 4294967295,
                "witness": "",
                "prev_out": {
                    "spent": true,
                    "spending_outpoints": [
                        {
                            "tx_index": 507906245,
                            "n": 0
                        }
                    ],
                    "tx_index": 507885919,
                    "type": 0,
                    "addr": "1NYAd6fA2dc5xowuweFUSDRqRTEzDwk28",
                    "value": 40000000000,
                    "n": 1,
                    "script": "76a9140412c04d8aeebca177ab239d85bb2cc8011d188288ac"
                },
                "script": "47304402205764456556638668c0b65a994056d1f4311c6e7c90d3b109eee4edf7de465d5602205a5c18220bbc67004c20b2cb90d8eeb0d993f21d6c9887534cc33e0e5b44799b0141047eb2045de0efd814b666cc888c19f329e177a5a437ba8926a6f196c878b16c2cec06b0ee8d18e6f87e87fb26db71051be3cdc2a80f8448ef0314d8461675f5fb"
            },
            {
                "sequence": 4294967295,
                "witness": "",
                "prev_out": {
                    "spent": true,
                    "spending_outpoints": [
                        {
                            "tx_index": 507906245,
                            "n": 1
                        }
                    ],
                    "tx_index": 507823075,
                    "type": 0,
                    "addr": "1NYAd6fA2dc5xowuweFUSDRqRTEzDwk28",
                    "value": 42512087600,
                    "n": 0,
                    "script": "76a9140412c04d8aeebca177ab239d85bb2cc8011d188288ac"
                },
                "script": "483045022100950e676e06b84ea44c9069f7e902c1415cf2e87d73753abb764669fabc4a7563022008232d74ac0d35ff6c4d7c87f402bec1d998767518aa1f3f342b667f7c30040c0141047eb2045de0efd814b666cc888c19f329e177a5a437ba8926a6f196c878b16c2cec06b0ee8d18e6f87e87fb26db71051be3cdc2a80f8448ef0314d8461675f5fb"
            }
        ],
        "weight": 1728,
        "block_height": 602738,
        "relayed_by": "0.0.0.0",
        "out": [
            {
                "spent": false,
                "tx_index": 507906245,
                "type": 0,
                "addr": "3Kzh9qAqVWQhEsfQz7zEQL1EuSx5tyNLNS",
                "value": 50100000000,
                "n": 0,
                "script": "a914c8ca150ee82589d47f69b8dcd7cad684d88283f187"
            },
            {
                "spent": true,
                "spending_outpoints": [
                    {
                        "tx_index": 507927140,
                        "n": 0
                    }
                ],
                "tx_index": 507906245,
                "type": 0,
                "addr": "bc1quq29mutxkgxmjfdr7ayj3zd9ad0ld5mrhh89l2",
                "value": 32412074177,
                "n": 1,
                "script": "0014e0145df166b20db925a3f7492889a5eb5ff6d363"
            }
        ],
        "lock_time": 0,
        "size": 432,
        "double_spend": false,
        "block_index": 1795362,
        "time": 1573139273,
        "tx_index": 507906245,
        "vin_sz": 2,
        "hash": "6cc8799643b4439271d34cf3dc0f0bd1cf734c22f326bc2cb85611f8298be018",
        "vout_sz": 2
    };

    return {
        x: raw
    }
}