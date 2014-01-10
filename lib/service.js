var Duplex = require('stream').Duplex;
var Writable = require('stream').Writable;
var encode = require('git-side-band-message');

module.exports = Service;

function Service (opts, backend) {
    this.info = opts.info;
    this.name = opts.name;
    this.action = this.info ? 'info' : {
        'git-receive-pack': (opts.tag ? 'tag' : 'push'),
        'git-upload-pack': 'pull'
    }[this.name];
    this._backend = backend;
    
    this.args = [ '--stateless-rpc' ];
    if (this.info) this.args.push('--advertise-refs');
}

Service.prototype.createStream = function () {
    var stream = new Duplex;
    var backend = this._backend;
    
    stream._write = function (buf, enc, next) {
        backend.push(buf);
        next();
    };
    
    stream._read = function () {
        var next = backend._next;
        var buf = backend._buffer;
        backend._next = null;
        backend._buffer = null;
        if (buf) stream.push(buf);
        if (next) next();
    };
    
    backend._stream = stream;
    if (backend._ready) stream._read();
    
    stream.on('finish', function () { backend.push(null) });
    
    if (this.info) backend.push(infoPrelude(this.name));
    return stream;
};

Service.prototype.createBand = function () {
    var stream = new Writable;
    stream._read = function () {};
    this.emit('band', stream);
};

function infoPrelude (service) {
    function pack (s) {
        var n = (4 + s.length).toString(16);
        return Array(4 - n.length + 1).join('0') + n + s;
    }
    return pack('# service=' + service + '\n') + '0000';
}
