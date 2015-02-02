/* jshint node:true */
'use strict';

var NGRAMS = require('../data/ngrams.json');

// Regex that matches one or more characters in a user agent that should be
// discarded and replaced with a single space.
var RE_DISCARD_CHARS = /[^ \w\d@+:.\/\\-]+/g;

// Regex that matches a token containing an MD5 or SHA hash of some kind.
var RE_HASH_TOKEN = /[0-9a-f]{32,}/i;

// Regex that matches a probable language token, such as "en" or en-US".
var RE_LANG_TOKEN = /^[a-z]{2}(?:-[A-Za-z]{2})?$/;

// Regex that matches a token consisting only of digits, with no decimals.
var RE_NUMBER_TOKEN = /^\d+$/;

// Regex that matches a version token, such as "Mozilla/5.0" or "rv:1.9.2b7pre".
var RE_VERSION_TOKEN = /^([\w-]+)(?:[\/:](\d[\w.+-]*))+$/;

/**
Returns the number of n-gram tokens found starting at _startIndex_, or `0` if no
n-grams were found at that position.

@param {String[]} tokens
    Array of tokens.

@param {Number} [startIndex=0]
    Index at which to start looking for n-grams.

@return {Number}
**/
exports.nGramCount = function (tokens, startIndex) {
    var index  = startIndex || 0;
    var ngrams = NGRAMS;

    while (true !== ngrams && (ngrams = ngrams[tokens[index]])) { // assignment
        index += 1;
    }

    return ngrams === true ? index - startIndex : 0;
};

/**
Tokenizes the given user agent string.

@param {String} input
    User agent string to tokenize.

@return {String[]}
    Array of unique tokens.
**/
exports.tokenize = function (input) {
    var tokens       = input.trim().replace(RE_DISCARD_CHARS, ' ').split(/ +/);
    var uniqueTokens = Object.create(null);

    tokens.forEach(function (token, index) {
        token = token.trim();

        if (!token || RE_NUMBER_TOKEN.test(token) || RE_LANG_TOKEN.test(token) || RE_HASH_TOKEN.test(token)) {
            return;
        }

        var matches;

        if ((matches = token.match(RE_VERSION_TOKEN)) && 'Mozilla' !== matches[1]) { // assignment
            uniqueTokens[matches[1]] = true;
            return;
        }

        var nGramCount = exports.nGramCount(tokens, index);

        if (nGramCount) {
            uniqueTokens[token + ' ' + tokens.splice(index + 1, nGramCount - 1).join(' ')] = true;
        } else {
            uniqueTokens[token] = true;
        }
    });

    return Object.keys(uniqueTokens);
};
