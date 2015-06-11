
/**
 * To do: move most of the body parsing stuff to a separate library.
 */

var get = require('raw-body');
var qs = require('querystring');
var busboy = require('co-busboy');

module.exports = function (app) {
  Object.keys(request).forEach(function (key) {
    app.request[key] = request[key];
  });
  Object.keys(response).forEach(function (key) {
    app.response[key] = response[key];
  });
  Object.keys(context).forEach(function (key) {
    app.context[key] = context[key];
  });
  return app
}

var context = {};
var request = {};
var response = {};

request.json = function* (limit) {
  if (!this.is('json')) return;
  if (!this.length) return;
  var text = yield* this.text(limit);
  return this._parse_json(text);
}

request._parse_json = function (text) {
  if (this.app.jsonStrict !== false) {
    text = text.trim();
    var first = text[0];
    if (first !== '{' && first !== '[')
      this.ctx.throw(400, 'only json objects or arrays allowed');
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    this.ctx.throw(400, 'invalid json received');
  }
}

request.urlencoded = function* (limit) {
  if (!this.is('urlencoded')) return;
  if (!this.length) return;
  var text = yield* this.text(limit);
  return this._parse_urlencoded(text);
}

request._parse_urlencoded = function (text) {
  var parse = (this.app.querystring || qs).parse;
  try {
    return parse(text);
  } catch (err) {
    this.ctx.throw(400, 'invalid urlencoded received');
  }
}

request.text = function* (limit) {
  this.response.writeContinue();
  return yield get(this.req, {
    limit: limit || '100kb',
    length: this.length,
    encoding: 'utf8',
  })
}

request.buffer = function* (limit) {
  this.response.writeContinue();
  return yield get(this.req, {
    limit: limit || '1mb',
    length: this.length,
  })
}

request.parts = function (options) {
  this.response.writeContinue();
  return busboy(this, options)
}

response.writeContinue = function () {
  if (!this._checkedContinue && this.req.checkContinue) {
    this.res.writeContinue();
    this._checkedContinue = true;
  }
  return this;
}

context.save = require('save-to');