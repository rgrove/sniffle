# Sniffle

A CLI app (and someday a web app and REST API) that learns and identifies user
agent strings using a Redis-backed naive Bayes classifier. Because why the hell
not.

Currently incomplete, a bit rough, and not yet terribly useful (will it ever
be?), but with a small training set it's pretty damn accurate (upwards of 90%)
at identifying user agents it's never seen before. I'm working on improving that
accuracy even more.

## Why?

It seemed like a fun problem to solve, I guess.

Browser user agents are notoriously hard to parse accurately, and browsers love
pretending to be other browsers. A parser that works okay today could break
without warning [when a new browser appears that pretends to be every other
browser][spartan].

A naive Bayes classifier isn't a parser, though. It doesn't know crap about user
agent strings, but if you show it enough of them and tell it what they are, it
can learn to make pretty accurate guesses about new user agents it's never seen
before. When a new user agent comes along that parsers don't know how to handle,
a well-trained Bayes classifier might just be able to figure it out without
needing any changes.

Is this useful? I don't know. But it was fun.

[spartan]: http://www.davevoyles.com/microsofts-spartan-browser-uses-chrome-ua-string/

## Install

```
git clone git://github.com/rgrove/sniffle.git
cd sniffle && npm install
```

You'll need to have a Redis server handy. Right now Sniffle only tries to
connect to localhost. I'll make it more configurable eventually.

## Usage

```
bin/sniffle.js [OPTIONS] <command> [ARGS]
```

### Training

Out of the box, Sniffle knows nothing. You could train it yourself, one category
per user agent at a time, but it'd be a lot easier to just import the sizable
set of user agent data included in this repo:

```
$ bin/sniffle.js import data/useragents.json
```

### Classifying a user agent

```
$ bin/sniffle.js classify 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_2) AppleWebKit/600.3.18 (KHTML, like Gecko) Version/8.0.3 Safari/600.3.18'
Name: Safari [38.1086919880846]
Engine: WebKit [40.60950658800003]
OS: Mac OS X [40.98912788439728]
Type: Browser [45.890633451452445]
```

### Other things I'm too lazy to mention here

```
$ bin/sniffle.js --help
```

## Plans

Eventually I'll wrap a pretty web app and REST API around this thing.
Eventually.

## License (MIT)

Copyright (c) 2015 Ryan Grove <ryan@wonko.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

### useragents.json

The file `data/useragents.json` includes data from the MAUL project at
<https://github.com/bholley/maul/tree/master/data>, and is distributed under the
following license:

Copyright (c) 2015
  Ryan Grove <ryan@wonko.com>

Copyright (c) 2010
  Bobby Holley <bobbyholley@gmail.com>
  Daniel Rosenfeld <derosenfeld@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
