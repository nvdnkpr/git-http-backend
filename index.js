var Duplex = require('stream').Duplex;
var inherits = require('inherits');
var url = require('url');
var qs = require('querystring');

var Service = require('./lib/service.js');

var regex = {
    //         last           commit
    //            (branch|tag)  (tag version|branch name)
    receive: '([0-9a-fA-F]+) ([0-9a-fA-F]+)'
        + ' refs\/(heads|tags)\/(.*?)( |00|\u0000)'
        + '|^(0000)$'
    ,
    upload: '^\\S+ ([0-9a-fA-F]+)'
};

module.exports = Backend;
inherits(Backend, Duplex);

function Backend (uri, cb) {
    if (!(this instanceof Backend)) return new Backend(uri, cb);
    var self = this;
    Duplex.call(this);
    
    if (cb) {
        this.on('service', function (s) { cb(null, s) });
        this.on('error', cb);
    }
    
    try { uri = decodeURIComponent(uri) }
    catch (err) { return error(msg) }
    
    var u = url.parse(uri);
    if (/\.\/|\.\./.test(u.pathname)) return error('invalid git path');
    
    this.parsed = false;
    var parts = u.pathname.split('/');
    var name;
    
    if (/\/info\/refs$/.test(u.pathname)) {
        var params = qs.parse(u.query);
        name = params.service;
        this.info = true;
    }
    else {
        name = parts[parts.length-1];
    }
    
    if (name === 'git-upload-pack') {}
    else if (name === 'git-receive-pack') {}
    else return error('unsupported git service');
    
    var service = self._createService({ name: name, info: this.info });
    process.nextTick(function () {
        self.emit('service', service);
    });
    
    function error (msg) {
        var err = typeof msg === 'string' ? new Error(msg) : msg;
        process.nextTick(function () { self.emit('error', err) });
    }
}

Backend.prototype._createService = function (opts) {
    var self = this;
    
    var service = new Service(opts, function (stream) {
        self._serviceStream = stream;
        stream._read = function (n) { self._read(n) };
        stream._write = function (buf, enc, next) {
            self.push(buf);
            next();
        };
        
        read();
        stream.on('readable', read);
        
        stream.on('finish', function () {
            if (!self._bands) self.push(null);
        });
        
        if (self._ready) self._read(self._ready);
        if (self._next) {
            var buf = self._buffer;
            var next = self._next;
            self._buffer = null;
            self._next = null;
            stream.write(buf);
            next();
        }
        
        function read () {
            var chunk;
            while (null !== (chunk = stream.read())) {
                self.push(chunk);
            }
        }
    });
    self._service = service;
    return service;
};

Backend.prototype._read = function (n) {
    if (!this._serviceStream) this._ready = n;
};

Backend.prototype._write = function (buf, enc, next) {
    if (!this._serviceStream) {
        this._buffer = buf;
        this._next = next;
    }
    else this._serviceStream.write(buf, enc, next);
};
