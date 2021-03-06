/*
 * (C) 2014 Seth Lakowske
 */

var fs             = require('fs');
var path           = require('path');
var http           = require('http');
var router         = require('routes')();
var ecstatic       = require('ecstatic');
var trumpet        = require('trumpet');
var articles       = require('blog-articles');
var nsh            = require('node-syntaxhighlighter');
var slurp          = require('slurp-some').slurp;

//parse the cli arguments
var port   = parseInt(process.argv[2], 10);
var contentPath = path.normalize(process.argv[3]);

//the mount point (i.e. url prefix to static content)
var staticContent         = '/'

//the relative path to a directory containing articles
var public = contentPath;
var articleDir = public;

var st     = ecstatic({
    root : contentPath
})




//Find a set of discovered articles and add them to the router
articles.articles(articleDir, public, function(discovered) {

    //Apply url generation step
    var urls = discovered.map(function(article) {
        var url = article.url
        if (article.url === '/about/') {
            routeArticle('/', article, discovered)
        }
        routeArticle(url, article, discovered)
    });

    console.log('attempting to listen on ' + port);    
    var server = http.createServer(function(req, res) {
        console.info(req.method + ' ' + req.url);
        var m = router.match(req.url);
        if (m) m.fn(req, res, m.params);
        else st(req, res);
    }).listen(port);
        
})

/*
    Read an article, add related articles, append some style to each article and pipe it to
    the response.
*/
function articleFn(discovered, article) {

    return function(req, res, params) {
        var articleStream = fs.createReadStream(article.path);
        var related = articles.related(discovered);
        var type = article.type
        
        //Compose the article and pipe to response
        var syntaxCss      = append('head', '<link rel="stylesheet" type="text/css" href="/static/style/syntax.css">');
        var mobileViewport = append('head', '<meta name="viewport" content="width=device-width, initial-scale=1.0">')
        var transform      = mobileViewport
        
        if (!type.hasOwnProperty('prism')) {
            console.log('not a prism article');
            articleStream.pipe(related).pipe(mobileViewport).pipe(highlighter()).pipe(syntaxCss).pipe(res);
        } else {
            articleStream.pipe(related).pipe(transform).pipe(res);
        }
    }
}

/*
 * Add article to router and decorate with the articleFn
 */
function routeArticle(url, article, discovered) {
    //Generated url to respond to (could be multiple urls if desired)
    var type = article.type
    console.log(url, type, article.root);
    
    //Lamda to apply on url request
    router.addRoute(url, articleFn(discovered, article));

    return url;
}

function highlighter() {
    var langMap = {
        'language-bash' : 'bash',
        'language-javascript' : 'js',
        'language-glsl' : 'c'
    }

    var tr = trumpet();

    tr.selectAll('pre > code', function(code) {
        var codeClass = code.getAttributes()['class'];
        var langDesc = langMap[codeClass];
        
        if (typeof langDesc === 'undefined') {
            langDesc = 'plain';
        }

        var lang = nsh.getLanguage(langDesc);
        
        var rStream = code.createReadStream();
        var wStream = code.createWriteStream({outer:true});        
        slurp(rStream, 8096, function(err, content) {
            
            wStream.end(nsh.highlight(content, lang, {gutter:false}));
        })
    })
    
    return tr;
}

function append(selector, string) {
    var tr = trumpet();

    tr.selectAll(selector, function(code) {
        
        var stream = code.createStream();
        
        slurp(stream, 8096, function(err, content) {
            stream.end(content + string);
        })
        
    })
    
    return tr;
}

