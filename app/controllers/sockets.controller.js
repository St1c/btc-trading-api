module.exports.index = index;
// module.exports.onFilterChange = onFilterChange;
module.exports.setupIOListeners = setupIOListeners;

function setupIOListeners(io) {
    io.on('connection', ctx => {
        console.log(ctx.socket.handshake.query)
        ctx.socket.join(ctx.socket.handshake.query.userId);
        console.log(ctx.socket.rooms)
    });
    io.on('disconnect', ctx => console.log('leave event', ctx.socket.id));
    io.on('filterChange', onFilterChange);
}

async function index(ctx, next, io) {
    console.log('socket controller middleware example');
    await next();
}

function onFilterChange(ctx, data) {
    console.log('filter change received: ', data);
    ctx.socket.broadcast.to(data.userId).emit('changeFilter', data.filterValue);
}