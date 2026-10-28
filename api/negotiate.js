'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { preferredType } = require('./_accept');

function resolveSiteRoot() {
    const cwd = process.cwd();
    return fs.existsSync(path.join(cwd, 'index.html')) ? cwd : path.join(cwd, 'website');
}

function readSiteFile(name) {
    return fs.readFileSync(path.join(resolveSiteRoot(), name), 'utf8');
}

function appendCommonHeaders(res, contentType) {
    res.setHeader('Content-Type', `${contentType}; charset=utf-8`);
    res.setHeader('Vary', 'Accept');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300');
}

function send(res, req, status, contentType, body, alternatePath) {
    appendCommonHeaders(res, contentType);
    if (alternatePath) {
        res.setHeader('Link', `<${alternatePath}>; rel="alternate"; type="text/markdown"`);
    }
    res.statusCode = status;
    res.end(req.method === 'HEAD' ? '' : body);
}

module.exports = function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.setHeader('Allow', 'GET, HEAD');
        return send(res, req, 405, 'text/plain', 'Method Not Allowed\n');
    }

    const pathname = new URL(req.url || '/', 'https://tokenstudio.dev').pathname;
    const isHomepage = pathname === '/' || pathname === '/index.html';
    const selected = preferredType(req.headers.accept);

    if (!selected) {
        return send(
            res,
            req,
            406,
            'text/plain',
            'Not Acceptable\n\nAvailable representations: text/html, text/markdown\n'
        );
    }

    if (isHomepage && selected === 'text/markdown') {
        return send(res, req, 200, 'text/markdown', readSiteFile('index.md'));
    }

    if (isHomepage) {
        return send(res, req, 200, 'text/html', readSiteFile('index.html'), '/index.md');
    }

    if (selected === 'text/markdown') {
        return send(res, req, 404, 'text/markdown', readSiteFile('404.md'));
    }

    return send(res, req, 404, 'text/html', readSiteFile('404.html'), '/404.md');
};

module.exports._private = { resolveSiteRoot, appendCommonHeaders, send };
