/* jshint node:true */
/* globals -Promise */
'use strict';

var _          = require('lodash');
var attributes = require('./attributes');
var Classifier = require('./classifier');
var Promise    = require('bluebird');
var fs         = Promise.promisifyAll(require('fs'));
var tokenizer  = require('./tokenizer');

var classifiers = {};

attributes.forEach(function (attr) {
    classifiers[attr.id] = new Classifier(attr.id);
});

exports.import = function (cli, filename) {
    return (
        parseFile(cli, filename)

        .then(massageData)

        .then(function (userAgents) {
            return train(cli, userAgents);
        })
    );
};

exports.modify = function (cli, filename) {
    var count = 0;

    return (
        parseFile(cli, filename)

        .then(function (userAgents) {
            _.forOwn(userAgents, function (attrs) {
                if (attrs.name === 'Konqueror' && !attrs.engine) {
                    attrs.engine = 'KHTML';
                    count += 1;
                }
            });

            if (count) {
                return fs.writeFileAsync(filename, JSON.stringify(userAgents, null, 2));
            }

            return Promise.resolve();
        })

        .then(function () {
            cli.ok('Modified ' + count + ' user agent records.');
        })
    );
};

exports.test = function (cli, filename) {
    var failure = 0;
    var success = 0;
    var uaCount;

    return (
        parseFile(cli, filename)

        .then(massageData)

        .then(function (userAgents) {
            var complete = 0;

            if (cli.options.sample) {
                userAgents = _.sample(userAgents, cli.options.sample);
            }

            uaCount = userAgents.length;

            console.log('Testing the classifier on ' + uaCount + ' user agents...');
            cli.progress(0);

            return Promise.map(userAgents, function (attrs) {
                var promises = [];
                var tokens   = tokenizer.tokenize(attrs.ua);

                _.forOwn(attrs, function (category, attrId) {
                    var classifier = classifiers[attrId];

                    if (!classifier) {
                        return;
                    }

                    promises.push(classifier.classify(tokens).then(function (result) {
                        if (result && result.category === category) {
                            success += 1;
                        } else {
                            failure += 1;
                        }
                    }));
                });

                return Promise.all(promises).then(function () {
                    cli.progress((complete += 1) / uaCount, 2);
                });
            }, {concurrency: 8});
        })

        .then(function () {
            cli.ok('Success rate: ' + Math.round((success / (success + failure)) * 100) + '%');
        })
    );
};

// -- Private Functions --------------------------------------------------------
function massageData(userAgents) {
    return _.map(userAgents, function (attrs, ua) {
        attrs.ua = ua;
        return attrs;
    });
}

function parseFile(cli, filename) {
    console.log('Parsing user agent data...');

    return (
        fs.readFileAsync(filename, {encoding: 'utf8'})

        .then(function (json) {
            return JSON.parse(json);
        })
    );
}

function train(cli, userAgents) {
    console.log('Training the classifier...');
    cli.progress(0);

    // If you want to train only a random sampling:
    if (cli.options.sample) {
        userAgents = _.sample(userAgents, cli.options.sample);
    }

    var complete = 0;
    var total    = userAgents.length;

    return Promise.map(userAgents, function (attrs) {
        var promises = [];
        var tokens   = tokenizer.tokenize(attrs.ua);

        _.forOwn(attrs, function (category, attrId) {
            var classifier = classifiers[attrId];

            if (classifier) {
                promises.push(classifier.train(category, tokens, attrs.ua));
            }
        });

        return Promise.all(promises).then(function () {
            cli.progress((complete += 1) / total, 2);
        });
    }, {concurrency: 8}).then(function () {
        cli.ok('Imported ' + total + ' user agents.');
    });
}
