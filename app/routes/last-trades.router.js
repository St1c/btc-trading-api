const Router = require('koa-router');
const lastTrades = require('../controllers/last-trades.controller');

const router = new Router();

router
    .get('/', lastTrades.index);

module.exports = router;