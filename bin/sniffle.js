#!/usr/bin/env node

/* jshint node:true */
'use strict';

var cli      = require('cli');
var commands = require('../lib/cli-commands');

cli.enable('status');

cli.parse({
    sample: ['s', 'Import or test a random sample of this size instead of all UAs.', 'number']
}, [
    'classify',
    'export',
    'import',
    'modify',
    'scores',
    'test',
    'tokenize',
    'train',
    'untrain'
]);

cli.main(function (args, options) {
    if (!commands[cli.command]) {
        cli.fatal('Unsupported command: ' + cli.command);
    }

    require('../lib/redis').sniffleInit().then(function () {
        commands[cli.command](cli, args, options).then(function () {
            process.exit();
        }).catch(function (err) {
            cli.fatal(err);
        });
    });
});
