'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseJson = exports.parseText = exports.failIfStatusNotIn = exports.failOnHttpError = undefined;

var _defer = require('rxjs/observable/defer');

var _share = require('rxjs/operator/share');

var _fromPromise = require('rxjs/observable/fromPromise');

var _switchMap = require('rxjs/operator/switchMap');

var _of = require('rxjs/observable/of');

var _throw2 = require('rxjs/observable/throw');

var _map = require('rxjs/operator/map');

var rxjsFetch = function rxjsFetch(url, options) {
  var fetch$ = (0, _defer.defer)(function () {
    var fetchPromise = fetch(url, options);

    return (0, _fromPromise.fromPromise)(fetchPromise);
  });

  return fetch$.share();
};

var throwHttpError = function throwHttpError(response) {
  var err = new Error('HTTP Error ' + response.status + ' on ' + url + ': ' + response.statusText);
  err.response = response;
  return (0, _throw2._throw)(err);
};

var failOnHttpError = exports.failOnHttpError = function failOnHttpError() {
  return _switchMap.switchMap.call(undefined, function (response) {
    if (!response.ok) {
      return throwHttpError(response);
    }

    return (0, _of.of)(response);
  });
};

var failIfStatusNotIn = exports.failIfStatusNotIn = function failIfStatusNotIn(acceptableStatusCodes) {
  return _switchMap.switchMap.call(undefined, function (response) {
    if (acceptableStatusCodes.indexOf(response.status) === -1) {
      return throwHttpError(response);
    }

    return (0, _of.of)(response);
  });
};

var parseText = exports.parseText = function parseText() {
  return _switchMap.switchMap.call(undefined, function (response) {
    return (0, _fromPromise.fromPromise)(response.text());
  });
};

var parseJson = exports.parseJson = function parseJson() {
  var _context;

  return (_context = parseText.call(undefined), _map.map).call(_context, function (text) {
    return JSON.parse(text);
  });
};

exports.default = rxjsFetch;