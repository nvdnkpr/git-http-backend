var http = require('http');
var spawn = require('child_process').spawn;
var path = require('path');
var backend = require('../');

var server = http.createServer(function (req, res) {
    var repo = req.url.split('/')[1];
    var dir = path.join(__dirname, 'repos', repo);
    
    req.pipe(backend(req.url, function (err, service) {
        if (err) return res.end(err + '\n');
        
        console.log(service.action, service.repo, service.branch);
        
        var ps = spawn(service.name, service.args.concat(dir));
        ps.stdout.pipe(service.createStream()).pipe(ps.stdin);
        
    })).pipe(res);
});
server.listen(5000);
