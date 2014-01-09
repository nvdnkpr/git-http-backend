var Transform = require('stream').Transform;
var inherits = require('inherits');
var url = require('url');
var qs = require('querystring');

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
inherits(Backend, Transform);

function Backend (uri, cb) {
    if (!(this instanceof Backend)) return new Backend(uri, cb);
    var self = this;
    Transform.call(this);
    
    if (cb) {
        this.on('service', function (s) { cb(null, s) });
        this.on('error', cb);
    }
    
    try { uri = decodeURIComponent(uri) }
    catch (err) { return error(msg) }
    
    var u = url.parse(uri);
    if (/\.\/|\.\.|/.test(u.pathname)) return error('invalid git path');
    
    this.parsed = false;
    var parts = u.pathname.split('/');
    if (/\/info\/refs$/.test(u.pathname)) {
        var params = qs.parse(u.query);
        this.service = params.service;
    }
    else {
        this.service = parts[parts.length-1];
    }
    
    if (this.service === 'git-upload-pack') {}
    else if (this.service === 'git-receive-pack') {}
    else error('unsupported git service');
    
    function error (msg) {
        var err = typeof msg === 'string' ? new Error(msg) : msg;
        process.nextTick(function () { self.emit('error', err) });
    }
}

Backend.prototype._transform = function (buf, enc, next) {
    if (this.service === 'git-upload-pack') {
    }
    else if (this.service === 'git-receive-pack') {
    }
};

Backend.prototype._flush = function (next) {
};

function infoPrelude (service) {
    function pack (s) {
        var n = (4 + s.length).toString(16);
        return Array(4 - n.length + 1).join('0') + n + s;
    }
    return pack('# service=git-' + service + '\n') + '0000';
}
