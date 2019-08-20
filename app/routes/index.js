const Router = require('koa-router');
const lastTradesRouter = require('./last-trades.router');;

const router = new Router();

router.use('/api/tr_exporter', lastTradesRouter.routes());

module.exports = router;