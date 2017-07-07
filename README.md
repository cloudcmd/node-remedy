# Remedy

Emitting middleware for file removing based on [socket.io](http://socket.io "Socket.io") and [remy](https://github.com/coderaiser/node-remy "Remy").

## Install

```
npm i remedy --save
```

## Client

Could be loaded from url `/remedy/remedy.js`.

```js
/* could be one argument: callback */
remedy('/remedy', function(remover) {
    const from = '/';
    const to = '/tmp';
    const names = [
        'bin'
    ];
    const progress = (value) => {
        console.log('progress:', value);
    };
    
    const end = () => {
        console.log('end');
        remover.removeListener('progress', progress);
        remover.removeListener('end', end);
    };
    
    const error = (data) => {
        const msg = data + '\n Continue?';
        const is = confirm(msg);
        
        if (is)
            return remover.continue();
        
        remover.abort();
    };
    
    remover(from, names);
    
    remover.on('progress', progress);
    remover.on('end', end);
    remover.on('error', error);
});

```

## Server

```js
const remedy = require('remedy');
const http = require('http');
const express = require('express');
const io = require('socket.io');
const app = express();
const port = 1337;
const server = http.createServer(app);
const socket = io.listen(server);

server.listen(port);

app.use(remedy({
    online: true,
    authCheck: function(socket, success) {
    }
});

remedy.listen(socket, {
    prefix: '/remedy',  /* default              */
    root: '/',          /* string or function   */
});
```

## Environments

In old `node.js` environments that supports `es5` only, `dword` could be used with:

```js
var remedy = require('remedy/legacy');
```

## License

MIT

