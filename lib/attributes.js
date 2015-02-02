/* jshint node:true */
'use strict';

var attributes = [{
    id  : 'name',
    name: 'Name',
    desc: 'Common browser or robot name, such as "Firefox", "Safari", "Chrome", or "GoogleBot".'
}, {
    id  : 'engine',
    name: 'Engine',
    desc: 'Browser or robot engine, such as "Gecko", "WebKit", or "Blink".'
}, {
    id  : 'os',
    name: 'OS',
    desc: 'Operating system name, such as "Mac OS X", "iOS", or "Windows".'
}, {
    id  : 'type',
    name: 'Type',
    desc: 'User agent type, such as "Browser", "Robot", "Mobile", etc.'
}, {
    id  : 'device',
    name: 'Device',
    desc: 'User agent device name, such as "iPhone", "iPad", "HTC One", etc.'
}];

attributes.forEach(function (attribute) {
    attributes[attribute.id] = attribute;
});

module.exports = attributes;
