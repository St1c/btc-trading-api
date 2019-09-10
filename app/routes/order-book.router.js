const Router = require('koa-router');
const orderBookController = require('../controllers/order-book.controller');

const router = new Router();

router
    .get('/order-levels', orderBookController.orderLevels)
    .get('/significant-orders', orderBookController.significantOrders);

module.exports = router;