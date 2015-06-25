# Remedy

File remove emitter middleware based on [socket.io](http://socket.io "Socket.io") and [remy](https://github.com/coderaiser/node-remy "Remy").

## Install

```
npm i remedy --save
```

## Client

Could be loaded from url `/remedy/remedy.js`.

```js
/* could be one argument: callback */
remedy('/remedy', function() {
    var from        = '/',
        to          = '/tmp',
        names       = [
            'bin'
        ],
        progress    = function(value) {
            console.log('progress:', value);
        },
        
        end     = function() {
            console.log('end');
            remedy.removeListener('progress', progress);
            remedy.removeListener('end', end);
        },
    
    error   = function(data) {
        var msg = data + '\n Continue?',
            is = confirm(msg);
        
        if (is)
            remedy.continue();
        else
            remedy.abort();
    };
    
    remedy(from, names);
    
    remedy.on('progress', progress);
    remedy.on('end', end);
    remedy.on('error', error);
});

```

## Server

```js
var remedy      = require('remedy'),
    http        = require('http'),
    express     = require('express'),
    io          = require('socket.io'),
    app         = express(),
    port        = 1337,
    server      = http.createServer(app),
    socket      = io.listen(server);
    
server.listen(port);

app.use(remedy({
    minify: true,
    online: true
});

remedy.listen(socket, {
    prefix: '/remedy',  /* default              */
    root: '/',          /* string or function   */
});
```

## License

MIT
