var io, exec, Emitify, loadRemote;

(function(global) {
    'use strict';
    
    if (typeof module !== 'undefined' && module.exports)
        module.exports  = new RemedyProto();
    else
        global.remedy   = new RemedyProto();
    
    function RemedyProto() {
        function load(prefix, socketPath, callback) {
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
            
            loadAll(prefix, function() {
                init();
                
                if (typeof callback === 'function')
                    callback(Remedy(prefix, socketPath));
            });
        }
        
        function Remedy(prefix, socketPath) {
            if (!(this instanceof Remedy))
                return new Remedy(prefix, socketPath);
            
            Emitify.call(this);
            this._progress = ProgressProto(prefix, socketPath, this);
        }
        
        function init() {
            Remedy.prototype = Object.create(Emitify.prototype);
            
            Remedy.prototype.remove  = function(from, files) {
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
        
        function loadAll(prefix, callback) {
            var scripts = [];
            
            if (!exec)
                scripts.push('/modules/execon/lib/exec.js');
            
            if (!scripts.length)
                loadFiles(prefix, callback);
            else
                loadScript(scripts.map(function(name) {
                    return prefix + name;
                }), function() {
                    loadFiles(prefix, callback);
                }); 
        }
        
        function getModulePath(name, lib) {
            var path    = '',
                libdir  = '/',
                dir     = '/modules/';
                
            if (lib)
                libdir  = '/' + lib + '/';
            
            path    = dir + name + libdir + name + '.js';
            
            return path;
        }
        
        function loadFiles(prefix, callback) {
            exec.series([
                function(callback) {
                    var obj     = {
                            loadRemote  : getModulePath('loadremote', 'lib'),
                            load        : getModulePath('load'),
                            Emitify     : getModulePath('emitify', 'dist'),
                            join        : '/join/join.js'
                        },
                        
                        scripts = Object.keys(obj)
                            .filter(function(name) {
                                return !window[name];
                            })
                            .map(function(name) {
                                return prefix + obj[name];
                            });
                    
                    exec.if(!scripts.length, callback, function() {
                        loadScript(scripts, callback);
                    });
                },
                
                function(callback) {
                    loadRemote('socket', {
                        name : 'io',
                        prefix: prefix
                    }, callback);
                },
                
                function() {
                    callback();
                }
            ]);
        }
        
        function loadScript(srcs, callback) {
            var i       = srcs.length,
                func    = function() {
                    --i;
                    
                    if (!i)
                        callback();
                };
            
            srcs.forEach(function(src) {
                var element = document.createElement('script');
                
                element.src = src;
                element.addEventListener('load', function load() {
                    func();
                    element.removeEventListener('load', load);
                });
                
                document.body.appendChild(element);
            });
        }
        
        function ProgressProto(room, socketPath, remedy) {
            var socket,
                href            = getHost(),
                FIVE_SECONDS    = 5000;
            
            if (!(this instanceof ProgressProto))
                return new ProgressProto(room, socketPath, remedy);
            
            socket = io.connect(href + room, {
                'max reconnection attempts' : Math.pow(2, 32),
                'reconnection limit'        : FIVE_SECONDS,
                path                        : socketPath
            });
            
            remedy.on('auth', function(username, password) {
                socket.emit('auth', username, password);
            });
            
            socket.on('accept', function() {
                remedy.emit('accept');
            });
            
            socket.on('reject', function() {
                remedy.emit('reject');
            });
            
            socket.on('err', function(error) {
                remedy.emit('error', error);
            });
            
            socket.on('file', function(name) {
                remedy.emit('file', name);
            });
            
            socket.on('progress', function(percent) {
                remedy.emit('progress', percent);
            });
            
            socket.on('end', function() {
                remedy.emit('end');
            });
            
            socket.on('connect', function() {
                remedy.emit('connect');
            });
            
            socket.on('disconnect', function() {
                remedy.emit('disconnect');
            });
            
            this.pause       = function() {
                socket.emit('pause');
            };
            
            this.continue   = function() {
                socket.emit('continue');
            };
            
            this.abort      = function() {
                socket.emit('abort');
            };
            
            this.remove     = function(from, to, files) {
                socket.emit('remove', from, to, files);
            };
            
            function getHost() {
                var l       = location,
                    href    = l.origin || l.protocol + '//' + l.host;
                
                return href;
            }
        }
        
        return load;
    }
    
})(this);
