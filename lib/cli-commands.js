/* jshint node:true */
/* globals -Promise */
'use strict';

var _          = require('lodash');
var attributes = require('../lib/attributes');
var Classifier = require('../lib/classifier');
var Promise    = require('bluebird');
var redis      = require('../lib/redis');
var tokenizer  = require('../lib/tokenizer');

exports.classify = function (cli, args) {
    if (args.length < 1) {
        cli.fatal("Usage: sniffle classify <user agent>");
    }

    var promises = [];
    var results  = [];
    var ua       = args[0];
    var tokens   = tokenizer.tokenize(ua);

    attributes.forEach(function (attr) {
        var classifier = new Classifier(attr.id);

        promises.push(classifier.classify(tokens, ua).then(function (result) {
            if (result) {
                results.push(attr.name + ': ' + result.category + ' [' + result.score + ']');
            }
        }));
    });

    return Promise.all(promises).then(function () {
        if (results.length) {
            results.forEach(function (result) {
                console.log(result);
            });
        } else {
            console.log('Unknown!');
        }
    });
};

exports.export = function () {
    function sortFn(a, b) {
        return a[0] < b[0] ? -1 : (a[0] > b[0] ? 1 : 0);
    }

    return (
        redis.hgetall(redis.KEY_PREFIX + 'user-agents')

        .then(function (response) {
            var userAgents;

            // Parse the response array.
            userAgents = _.map(response, function (attrJSON, ua) {
                var attrs = _.map(JSON.parse(attrJSON), function (category, attr) {
                    return [attr, category];
                });

                // Sort attributes.
                attrs.sort(sortFn);

                // Convert attributes back to a hash.
                var attrHash = Object.create(null);

                attrs.forEach(function (attr) {
                    attrHash[attr[0]] = attr[1];
                });

                return [ua, attrHash];
            });

            // Sort by user agent.
            userAgents.sort(sortFn);

            // Create a hash.
            var result = Object.create(null);

            userAgents.forEach(function (ua) {
                result[ua[0]] = ua[1];
            });

            console.log(JSON.stringify(result, null, 2));
        })
    );
};

exports.import = function (cli, args) {
    if (args.length < 1) {
        cli.fatal("Usage: sniffle import <data file>");
    }

    return require('./importer').import(cli, args[0]);
};

exports.modify = function (cli, args) {
    if (args.length < 1) {
        cli.fatal("Usage: sniffle modify <data file>");
    }

    return require('./importer').modify(cli, args[0]);
};

exports.scores = function (cli, args) {
    if (args.length < 2) {
        cli.fatal("Usage: sniffle scores <user agent> <attribute id>");
    }

    var attr   = attributes[args[1]];
    var tokens = tokenizer.tokenize(args[0]);

    if (!attr) {
        cli.fatal("Unknown attribute id: " + args[1]);
    }

    var classifier = new Classifier(attr.id);

    return classifier.getScores(tokens).then(function (scores) {
        scores.forEach(function (item) {
            console.log(item[0] + ': ' + item[1]);
        });
    });
};

exports.test = function (cli, args) {
    if (args.length < 1) {
        cli.fatal("Usage: sniffle test <data file>");
    }

    return require('./importer').test(cli, args[0]);
};

exports.tokenize = function (cli, args) {
    if (args.length < 1) {
        cli.fatal("Usage: sniffle tokenize <user agent>");
    }

    console.log(tokenizer.tokenize(args[0]));

    return Promise.resolve();
};

exports.train = function (cli, args) {
    if (args.length < 3) {
        cli.fatal("Usage: sniffle train <user agent> <attribute id> <category>");
    }

    var attr     = attributes[args[1]];
    var category = args[2];
    var ua       = args[0];
    var tokens   = tokenizer.tokenize(ua);

    if (!attr) {
        cli.fatal("Unknown attribute id: " + args[1]);
    }

    var classifier = new Classifier(attr.id);

    return classifier.train(category, tokens, ua).then(function () {
        cli.ok('Learned 1 user agent: ' + attr.name + ' -> ' + category);
    });
};

exports.untrain = function (cli, args) {
    if (args.length < 3) {
        cli.fatal("Usage: sniffle untrain <user agent> <attribute id> <category>");
    }

    var attr     = attributes[args[1]];
    var category = args[2];
    var ua       = args[0];
    var tokens   = tokenizer.tokenize(ua);

    if (!attr) {
        cli.fatal("Unknown attribute id: " + args[1]);
    }

    var classifier = new Classifier(attr.id);

    return classifier.untrain(category, tokens, ua).then(function () {
        cli.ok('Unlearned 1 user agent: ' + attr.name + ' -> ' + category);
    });
};
