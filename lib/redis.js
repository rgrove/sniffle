/* jshint node:true */
/* globals -Promise */
'use strict';

var Promise  = require('bluebird');
var readFile = Promise.promisify(require('fs').readFile);

var redis = require('then-redis').createClient({
    retry_max_delay: 10000
});

redis.on('error', function (err) {
    console.error('Redis error: ' + err);
});

// Prefix to prepend to all keys stored in Redis.
redis.KEY_PREFIX = 'sniffle:';

var scripts = [
    'get-token-counts',
    'get-ua-attr',
    'train-ua',
    'untrain-ua'
];

redis.scriptHashes = {};

redis.sniffleInit = function () {
    return Promise.map(scripts, function (scriptName) {
        return readFile(__dirname + '/redis-scripts/' + scriptName + '.lua', {encoding: 'utf8'});
    }).map(function (script) {
        return redis.script('load', script);
    }).map(function (hash, index) {
        redis.scriptHashes[scripts[index]] = hash;
    });
};

module.exports = redis;
