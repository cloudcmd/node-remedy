'use strict';

const Emitify = require('emitify/legacy');
const io = require('socket.io-client/dist/socket.io');

module.exports = (prefix, socketPath, callback) => {
    if (!callback) {
        if (!socketPath) {
            callback    = prefix;
            prefix      = '/remedy';
        } else {
            callback    = socketPath;
            socketPath  = '';
        }
    }
    
    socketPath += '/socket.io';
    
    init();
    
    if (typeof callback === 'function')
        callback(Remedy(prefix, socketPath));
}

function Remedy(prefix, socketPath) {
    if (!(this instanceof Remedy))
        return new Remedy(prefix, socketPath);
    
    Emitify.call(this);
    this._progress = ProgressProto(prefix, socketPath, this);
}

function init() {
    Remedy.prototype = Object.create(Emitify.prototype);
    
    Remedy.prototype.remove = function(from, files) {
        this._progress.remove(from, files);
    };
    
    Remedy.prototype.abort = function() {
        this._progress.abort();
    };
    
    Remedy.prototype.pause = function() {
        this._progress.pause();
    };
    
    Remedy.prototype.continue = function() {
        this._progress.continue();
    };
}

function ProgressProto(room, socketPath, remedy) {
    if (!(this instanceof ProgressProto))
        return new ProgressProto(room, socketPath, remedy);
    
    const href = getHost();
    const FIVE_SECONDS = 5000;
    
    const socket = io.connect(href + room, {
        'max reconnection attempts' : Math.pow(2, 32),
        'reconnection limit'        : FIVE_SECONDS,
        path: socketPath,
    });
    
    remedy.on('auth', (username, password) => {
        socket.emit('auth', username, password);
    });
    
    socket.on('accept', () => {
        remedy.emit('accept');
    });
    
    socket.on('reject', () => {
        remedy.emit('reject');
    });
    
    socket.on('err', (error) => {
        remedy.emit('error', error);
    });
    
    socket.on('file', (name) => {
        remedy.emit('file', name);
    });
    
    socket.on('progress', (percent) => {
        remedy.emit('progress', percent);
    });
    
    socket.on('end', () => {
        remedy.emit('end');
    });
    
    socket.on('connect', () => {
        remedy.emit('connect');
    });
    
    socket.on('disconnect', () => {
        remedy.emit('disconnect');
    });
    
    this.pause = () => {
        socket.emit('continue');
    };
    
    this.continue = () => {
        socket.emit('continue');
    };
    
    this.abort = () => {
        socket.emit('abort');
    };
    
    this.remove = (from, files) => {
        socket.emit('remove', from, files);
    };
    
    function getHost() {
        const l = location;
        const href = l.origin || l.protocol + '//' + l.host;
        
        return href;
    }
}

