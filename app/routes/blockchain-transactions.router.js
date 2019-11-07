const Router = require('koa-router');
const blockchainController = require('../controllers/blockchain-transactions.controller');

const router = new Router();

router
    .get('/whale-moves', blockchainController.whaleMoves);

module.exports = router;