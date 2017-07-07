'use strict';

const remy = require('remy/legacy');
const mellow = require('mellow');

module.exports = (socket, options) => {
    if (!options)
        options = {};
    
    listen(socket, options);
};

function getRoot(root) {
    if (typeof root === 'function')
        return root();
    
    return root;
}

function isRootWin32(path, root) {
    const isRoot = path === '/';
    const isWin32 = process.platform === 'win32';
    const isConfig = root === '/';
    
    return isWin32 && isRoot && isConfig;
}

function getWin32RootMsg() {
    return Error('Could not copy from/to root on windows!');
}

function check(authCheck) {
    if (authCheck && typeof authCheck !== 'function')
        throw Error('authCheck should be function!');
}

function listen(socket, options) {
    const authCheck = options.authCheck;
    const prefix = options.prefix || 'remedy';
    const root = options.root   || '/';
    
    check(authCheck);
    
    socket.of(prefix)
        .on('connection', (socket) => {
            if (!authCheck)
                return connection(root, socket);
            
            authCheck(socket, () => {
                connection(root, socket);
            });
        });
}

function connection(root, socket) {
    socket.on('remove', (from, files) => {
        const value = getRoot(root);
        
        from = mellow.pathToWin(from, value);
        
        if (![from].some((item) => {
            return isRootWin32(item, value);
        })) {
            remove(socket, from, files);
        } else {
            socket.emit('err',  getWin32RootMsg());
            socket.emit('end');
        }
    });
}

function remove(socket, from, files) {
    const rm = remy(from, files);
    
    socket.on('pause', rm.pause);
    
    rm.on('file', (name) => {
        socket.emit('file', name);
    });
    
    rm.on('progress', (percent) => {
        socket.emit('progress', percent); 
    });
    
    rm.on('error', (error, name) => {
        const msg = error.code + ' :' + error.path;
        const rmListeners = () => {
            socket.removeListener('continue', onContinue);
            socket.removeListener('abort', onAbort);
        };
        
        const onAbort = () => {
            rm.abort();
            rmListeners();
        };
        
       const onContinue  = () => {
            rm.continue();
            rmListeners();
        };
        
        socket.emit('err', msg, name);
        socket.on('continue', onContinue);
        socket.on('abort',  onAbort);
    });
    
    rm.on('end', () => {
        socket.emit('end');
        socket.removeListener('pause', rm.pause);
    });
}

