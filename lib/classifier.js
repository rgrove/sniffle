/* jshint node:true */
/* globals -Promise */
'use strict';

var _       = require('lodash');
var Promise = require('bluebird');
var redis   = require('./redis');

// Smoothing value to use instead of 0 when a token being scored hasn't been
// seen before.
//
// The lower the smoothing value is, the lower the probability will be when a
// user agent is missing tokens that are very common in a category, or
// contains tokens that aren't very common.
//
// In other words, if most Safari user agents contain the token "AppleWebKit"
// but the user agent we're classifying does not, then it's less likely to be a
// Safari user agent. Likewise if this user agent contains the token "Trident"
// but most Safari user agents don't, then this UA is even less likely to be
// Safari.
//
// A smoothing value of 0 would result in very strict matching, decreasing
// accuracy with novel UAs, but a very low non-zero value tends to produce
// excellent results.
var SMOOTHING = 0.001;

// Confidence threshold. Scores below this will be discarded and the associated
// category will be considered unknown.
var THRESHOLD = 0;

/**
Constructs a classifier associated with the specified user agent attribute id,
such as "name", "os", "engine", "type", etc.

The classifier for a given attribute can be trained to recognize and classify
user agent strings among various exclusive categories within that attribute. For
example, the "name" attribute contains the categories "Safari", "Firefox",
"Chrome", etc.

A given user agent string may be associated with many attributes, but may only
belong to a single category per attribute.

@constructor
@param {String} attrId
    Id of the attribute this classifier is responsible for.
**/
function Classifier(attrId) {
    this._attrId = attrId;
    this._prefix = redis.KEY_PREFIX + attrId + ':';
}

var proto = Classifier.prototype;

/**
Returns a promise that resolves to the category to which the tokens most likely
belong, or `null` if the classifier isn't confident enough to categorize the
tokens.

@param {String[]} tokens
    Tokens to classify.

@param {String} [ua]
    Raw user agent string.

@return {Promise->Object|null}
**/
proto.classify = function (tokens, ua) {
    var attrId     = this._attrId;
    var classifier = this;

    return (
        // If we've seen this user agent before, get its existing attributes.
        (function () {
            if (ua) {
                return redis.hget(redis.KEY_PREFIX + 'user-agents', ua);
            }

            return Promise.resolve();
        }())

        .then(function (attrJSON) {
            // If we already know about this user agent, we can skip the
            // Bayes classification and return a confident result.
            if (attrJSON) {
                var attrs = JSON.parse(attrJSON);

                if (attrs && attrs[attrId]) {
                    return Promise.resolve({
                        category: attrs[attrId],
                        score   : 1000
                    });
                }
            }

            return classifier.getScores(tokens).then(function (scores) {
                // Discard all but the top score.
                if (scores.length) {
                    var category = scores[0][0];
                    var score    = scores[0][1];

                    // If the score doesn't meet the minimum confidence
                    // threshold, throw it away. Better to give no answer than
                    // a wrong answer.
                    if (score < THRESHOLD) {
                        return null;
                    }

                    return {
                        category: category,
                        score   : score
                    };
                }

                return null;
            });
        })
    );
};

/**
Returns a promise that resolves to an array of `[category, score]` arrays,
sorted from highest to lowest score, of the categories the given tokens are most
likely to belong to.

@param {String[]} tokens
    Tokens to classify.

@return {Promise->Array[]}
**/
proto.getScores = function (tokens) {
    var categories            = [];
    var categoryCounts        = Object.create(null);
    var prefix                = this._prefix;
    var tokenCount            = tokens.length;
    var tokenCountsByCategory = Object.create(null);
    var totalUAs;

    redis.multi();

    // Get the total count of all user agents seen.
    redis.hlen(redis.KEY_PREFIX + 'user-agents');

    // Get a hash of all categories and their user agent counts.
    redis.hgetall(prefix + 'categories');

    return (
        redis.exec()

        .then(function (results) {
            // Category counts come back as a single array in the form
            // `["Category", 1, "OtherCategory", 5]` etc., so we convert it to a
            // hash for easier lookups.
            //
            // We also create a flat array of category names to simplify token
            // count lookups later on (we need a stable, indexed set of names in
            // order to map lookup responses correctly).
            var rawCategoryCounts = results[1];

            for (var i = 0, len = rawCategoryCounts.length; i < len; i += 2) {
                categories.push(rawCategoryCounts[i]);
                categoryCounts[rawCategoryCounts[i]] = +rawCategoryCounts[i + 1];
            }

            totalUAs = +results[0];

            // Next, we need to look up the counts for every input token in
            // every category.
            return redis.evalsha.apply(redis, [
                redis.scriptHashes['get-token-counts'], categories.length
            ].concat(_.map(categories, function (category) {
                return prefix + 'category:' + category;
            })).concat(tokens));
        })

        .then(function (results) {
            // `results` is an array of token count arrays, one per category:
            // `[['1', null, null], [null, '5', '6']]` etc.
            results.forEach(function (tokenCounts, categoryIndex) {
                var category            = categories[categoryIndex];
                var categoryTokenCounts = tokenCountsByCategory[category] = Object.create(null);

                for (var i = 0, len = tokenCounts.length; i < len; ++i) {
                    categoryTokenCounts[tokens[i]] = +tokenCounts[i];
                }
            });

            // Now we have everything we need to classify the input!
            var scores = [];

            _.forOwn(categoryCounts, function (categoryCount, category) {
                var categoryTokenCounts = tokenCountsByCategory[category];

                // The initial probability of this user agent being in this
                // category is determined by how frequent UAs in this category
                // are among all UAs.
                //
                // In other words, if this category is "FooBrowser" and we've
                // only seen two other FooBrowser UAs out of thousands total,
                // then before we even look at this UA's tokens we know that
                // it's pretty unlikely this is a FooBrowser UA.
                var probability = Math.log(categoryCount / totalUAs);

                // The final probability is determined by looking at how many
                // times this user agent's tokens have been seen in other UAs in
                // this category, vs. how many tokens of all types we've seen
                // in both this category and all other categories.
                //
                // If this UA has lots of tokens from this category and doesn't
                // have many tokens we haven't seen in this category, then it
                // probably belongs to this category. Conversely, if this UA
                // doesn't have tokens most other UAs in this category have, or
                // if it has tokens most other UAs in this category don't have,
                // then it's less likely to belong to this category.
                _.forOwn(categoryTokenCounts, function (categoryTokenCount) {
                    probability += Math.log(categoryTokenCount + SMOOTHING / (categoryCount + tokenCount));
                });

                scores.push([category, probability]);
            });

            // Sort scores in descending order and return.
            return _.sortBy(scores, function (item) {
                return -item[1];
            });
        })
    );
};

/**
Trains the classifier by teaching it that the given tokens belong to the
specified category.

@param {String} category
    Category the tokens belong to.

@param {String[]} tokens
    Tokens to learn from.

@param {String} ua
    Raw user agent string.

@return {Promise}
**/
proto.train = function (category, tokens, ua) {
    var attrId = this._attrId;
    var prefix = this._prefix;

    category = category.trim();
    ua       = ua.trim();

    return (
        // Untrain this UA in this category first (if it exists) to avoid
        // diluting our data.
        this.untrain('*', tokens, ua)

        .then(function () {
            return redis.evalsha.apply(redis, [
                redis.scriptHashes['train-ua'],
                3,

                // Keys.
                redis.KEY_PREFIX + 'user-agents',
                prefix + 'categories',
                prefix + 'category:' + category,

                // Args.
                ua,
                attrId,
                category
            ].concat(tokens));
        })
    );
};

/**
Untrains the classifier by undoing the effect of training the given tokens in
the specified category.

@param {String} category
    Category to untrain, or "*" to untrain any currently trained category for
    this attribute.

@param {String[]} tokens
    Tokens to unlearn.

@param {String} ua
    Raw user agent string.

@return {Promise}
**/
proto.untrain = function (category, tokens, ua) {
    var attrId = this._attrId;
    var prefix = this._prefix;

    category = category.trim();
    ua       = ua.trim();

    return (
        (function () {
            if (category === '*') {
                return redis.evalsha(
                    redis.scriptHashes['get-ua-attr'],
                    1,

                    // Keys.
                    redis.KEY_PREFIX + 'user-agents',

                    // Args.
                    ua,
                    attrId
                );
            }

            return Promise.resolve(category);
        }())

        .then(function (actualCategory) {
            if (!actualCategory) {
                return Promise.resolve();
            }

            return redis.evalsha.apply(redis, [
                redis.scriptHashes['untrain-ua'],
                3,

                // Keys.
                redis.KEY_PREFIX + 'user-agents',
                prefix + 'categories',
                prefix + 'category:' + actualCategory,

                // Args.
                ua,
                attrId,
                actualCategory
            ].concat(tokens));
        })
    );
};

module.exports = Classifier;
