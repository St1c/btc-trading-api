require('dotenv').config();
var path = require('path');
global.appRoot = path.resolve(__dirname);

const Koa = require('koa');
const IO = require('koa-socket-2');
var bodyParser = require('koa-bodyparser');

const catchErrors = require('./app/middlewares/catch-errors.middleware');
const cors = require('./app/middlewares/cors');
const router = require('./app/routes/index');
const socketsController = require('./app/controllers/sockets.controller');

const app = new Koa();
const PORT = process.env.APP_PORT || 3000;
const HOST = process.env.APP_HOST || '0.0.0.0';

// Default error handler
app.use(catchErrors(async (ctx, next) => await next()));

// Main app middlewares
app
    .use(bodyParser())
    .use(cors)
    .use(router.routes())
    .use(router.allowedMethods());


/**
 * Socket handlers */
const io = new IO();
io.attach(app);
socketsController.setupIOListeners(io);
// io.use(catchErrors(async (ctx, next) => await socketsController.index(ctx, next, io)));

// Exporting server for use in tests
const server = app.listen(PORT, HOST);

module.exports = server;