'use strict';

var remy = require('remy/legacy');
var mellow = require('mellow');

module.exports = function(socket, options) {
    if (!options)
        options = {};
    
    listen(socket, options);
};

function getRoot(root) {
    var value;
    
    if (typeof root === 'function')
        value = root();
    else
        value = root;
    
    return value;
}

function isRootWin32(path, root) {
    var isRoot      = path === '/',
        isWin32     = process.platform === 'win32',
        isConfig    = root === '/';
    
    return isWin32 && isRoot && isConfig;
}

function getWin32RootMsg() {
    var message  = 'Could not copy from/to root on windows!',
        error       = Error(message);
    
    return error;
}

function check(authCheck) {
    if (authCheck && typeof authCheck !== 'function')
        throw Error('authCheck should be function!');
}

function listen(socket, options) {
    var authCheck   = options.authCheck,
        prefix      = options.prefix || 'remedy',
        root        = options.root   || '/';
    
    check(authCheck);
    
    socket.of(prefix)
        .on('connection', function(socket) {
            if (!authCheck)
                connection(root, socket);
            else
                authCheck(socket, function() {
                    connection(root, socket);
                });
        });
}

function connection(root, socket) {
    socket.on('remove', function(from, files) {
        var value   = getRoot(root);
        
        from        = mellow.pathToWin(from, value);
        
        if (![from].some(function(item) {
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
    var rm = remy(from, files);
    
    socket.on('pause', rm.pause);
    
    rm.on('file', function(name) {
        socket.emit('file', name);
    });
    
    rm.on('progress', function(percent) {
        socket.emit('progress', percent); 
    });
    
    rm.on('error', function(error, name) {
        var msg         = error.code + ' :' + error.path,
            rmListeners = function() {
                socket.removeListener('continue', onContinue);
                socket.removeListener('abort', onAbort);
            },
            
            onAbort     = function() {
                rm.abort();
                rmListeners();
            },
            
            onContinue  = function() {
                rm.continue();
                rmListeners();
            };
        
        socket.emit('err', msg, name);
        socket.on('continue', onContinue);
        socket.on('abort',  onAbort);
    });
    
    rm.on('end', function() {
        socket.emit('end');
        socket.removeListener('pause', rm.pause);
    });
}

