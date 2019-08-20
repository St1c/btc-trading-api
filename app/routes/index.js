const Router = require('koa-router');
const lastTradesRouter = require('./last-trades.router');;

const router = new Router();

router.use('/api/last-trades', lastTradesRouter.routes());

module.exports = router;