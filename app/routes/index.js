const Router = require('koa-router');
const lastTradesRouter = require('./last-trades.router');;
const orderBookRouter = require('./order-book.router');

const router = new Router();

router.use('/api/tr_exporter/last-trades', lastTradesRouter.routes());
router.use('/api/tr_exporter/order-book', orderBookRouter.routes());

module.exports = router;