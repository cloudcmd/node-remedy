var io, exec, Emitify, loadRemote;

(function(global) {
    'use strict';
    
    if (typeof module !== 'undefined' && module.exports)
        module.exports  = new RemedyProto();
    else
        global.remedy   = new RemedyProto();
    
    function RemedyProto() {
        var Progress;
        
        function Remedy(prefix, callback) {
            if (!callback) {
                callback    = prefix;
                prefix      = '/remedy';
            }
            
            loadAll(prefix, function() {
                Progress                = new ProgressProto(prefix);
                Object.setPrototypeOf(Remedy, Emitify());
                
                if (typeof callback === 'function')
                    callback();
            });
        }
        
        Remedy.remove  = function(from, files) {
            Progress.remove(from, files);
        };
        
        Remedy.abort = function() {
            Progress.abort();
        };
        
        Remedy.pause = function() {
            Progress.pause();
        };
        
        Remedy.continue = function() {
            Progress.continue();
        };
        
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
            var dir     = '/modules/',
                libdir  = (lib || '') + '/',
                path    = dir + name + libdir + name + '.js';
            
            return path;
        }
        
        function loadFiles(prefix, callback) {
            exec.series([
                function(callback) {
                    var obj     = {
                            loadRemote  : getModulePath('loadremote', 'lib'),
                            load        : getModulePath('load'),
                            Emitify     : getModulePath('emitify', 'lib'),
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
                        prefix: prefix,
                        noPrefix: true
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
        
        function ProgressProto(room) {
            var socket;
            
            init(room);
            
            function init(room) {
                var href            = getHost(),
                    FIVE_SECONDS    = 5000;
                
                socket = io.connect(href + room, {
                    'max reconnection attempts' : Math.pow(2, 32),
                    'reconnection limit'        : FIVE_SECONDS
                });
                
                socket.on('err', function(error) {
                    Remedy.emit('error', error);
                });
                
                socket.on('file', function(name) {
                    Remedy.emit('file', name);
                });
                
                socket.on('progress', function(percent) {
                    Remedy.emit('progress', percent);
                });
                
                socket.on('end', function() {
                    Remedy.emit('end');
                });
                
                socket.on('connect', function() {
                    Remedy.emit('connect');
                });
                
                socket.on('disconnect', function() {
                    Remedy.emit('disconnect');
                });
            }
            
            this.pause       = function() {
                socket.emit('pause');
            };
            
            this.continue   = function() {
                socket.emit('continue');
            };
            
            this.abort      = function() {
                socket.emit('abort');
            };
            
            this.remove     = function(from, files) {
                socket.emit('remove', from, files);
            };
            
            function getHost() {
                var l       = location,
                    href    = l.origin || l.protocol + '//' + l.host;
                
                return href;
            }
        }
        
        return Remedy;
    }
    
})(this);
