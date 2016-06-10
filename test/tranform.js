var test = require('tape');
var trumpet = require('trumpet');
var fs = require('fs');
var nsh = require('node-syntaxhighlighter');

test('can read html', function(t) {

    var tr = trumpet();
    tr.selectAll('code', function(code) {
        console.log(code.getAttributes()['class'])
        code.createReadStream().pipe(process.stdout);
    })

    var html = fs.createReadStream('../articles/howto-install-docker-kubernets-local-registry/index.html');
    html.pipe(tr);

    t.end();
})
