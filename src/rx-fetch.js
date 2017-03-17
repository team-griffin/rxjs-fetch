'use strict';
const Rx = require('rxjs');
const ParsedUrl = require('url-parse');

const addSlashes = str => (str + '').replace(/'/g, '\\\'');

const RxResponse = function (promiseResponse, recordToSubject) {
  this._promiseResponse = promiseResponse;
  this._recordTo = recordToSubject;

  this.status = promiseResponse.status;
  this.ok = promiseResponse.ok;
  this.statusText = promiseResponse.statusText;
  this.headers = promiseResponse.headers;
  this.url = promiseResponse.url;

  let observableText = Rx.Observable.defer(() => Rx.Observable.fromPromise(promiseResponse.text()));
  if (this._recordTo) {
    // Note that this has the side effect of always evaluating the body text
    // of the response. We constrain that behavior to recording mode only, since
    // that would typically not occur in production code.
    observableText = observableText.publish();
    const response = this;
    observableText.connect();
    observableText.subscribe(text => {
      response._recordTo.next(`  .reply(${response.status}, '${addSlashes(text)}')`);
    });
  }

  this._observableText = observableText;
  return this;
};

/* Disabled for now as I'm not sure what the use case is.
   Send me a PR with test coverage if you need these. :-)
RxResponse.prototype.blob = function () {
  return Rx.Observable.fromPromise(this._promiseResponse.blob());
};

RxResponse.prototype.arrayBuffer = function () {
  return Rx.Observable.fromPromise(this._promiseResponse.arrayBuffer());
};

RxResponse.prototype.formData = function () {
  return Rx.Observable.fromPromise(this._promiseResponse.formData());
};
*/

RxResponse.prototype.text = function () {
  return this._observableText;
};

RxResponse.prototype.json = function () {
  return this.text().map(JSON.parse);
};

module.exports = (url, options) => {
  // At first glance, Rx.Observable.fromPromise would seem like the correct way
  // to implement this, *but* calling fetch(...) causes work to start on the
  // call right away, making this effectively a hot observable. In order to
  // preserve the semantics of this being a cold observable, we defer invocation
  // until subscription time.

  // See https://github.com/Reactive-Extensions/RxJS/blob/master/doc/gettingstarted/creating.md#cold-vs-hot-observables
  // for a definition of the "hot" and "cold" terms.

  let didSubscribe = false;

  let result = Rx.Observable.defer(() => {
    if (didSubscribe) {
      throw new Error('can not subscribe to rxjs-fetch result more than once');
    }

    didSubscribe = true;

    const subject = new Rx.AsyncSubject();

    const recordTo = result._recordTo;
    if (recordTo) {
      const parsedUrl = new ParsedUrl(url);
      const pathname = parsedUrl.pathname;
      const query = parsedUrl.query;
      parsedUrl.set('pathname', '');
      parsedUrl.set('query', '');
      parsedUrl.set('hash', '');
      recordTo.next(`nock('${parsedUrl.href}')`);

      let fragment = pathname;
      if (query) {
        fragment += query;
      }

      const method = ((options && options.method) || 'get').toLowerCase();
      const requestBody = (options && options.body) ? `, '${addSlashes(options.body)}'` : '';

      switch (method) {
        case 'get':
        case 'post':
        case 'put':
        case 'head':
        case 'delete':
          recordTo.next(`  .${method}('${fragment}'${requestBody})`);
          break;
        default:
          recordTo.next(`  .intercept('${options.method}', '${fragment}'${requestBody})`);
      }
    }

    fetch(url, options)
      .then(promiseResponse => {
        subject.next(new RxResponse(promiseResponse, result._recordTo));
        subject.complete();
      })
      .catch(err => subject.error(err));

    return subject;
  });

  if (options && options.recordTo) {
    result._recordTo = options.recordTo;
  }

  const rawThrowHttpError = response => {
    let err = new Error('HTTP Error ' + response.status + ' on ' + url + ': ' + response.statusText);
    err.response = response;
    return Rx.Observable.throw(err);
  };

  const throwHttpError = response => {
    // When recording, we need to allow the recording of the error text
    // to complete before throwing the error.
    if (result._recordTo) {
      return response.text().switchMap(() => rawThrowHttpError(response));
    } else {
      return rawThrowHttpError(response);
    }
  };

  result.recordTo = subject => {
    result._recordTo = subject;
    return result;
  };

  result.failOnHttpError = () => {
    return result.switchMap(response => {
      if (!response.ok) {
        return throwHttpError(response);
      } else {
        return Rx.Observable.of(response);
      }
    });
  };

  result.failIfStatusNotIn = acceptableStatusCodes => {
    if (!Array.isArray(acceptableStatusCodes)) {
      throw new Error('acceptableStatusCodes must be an Array');
    }

    return result.switchMap(response => {
      if (acceptableStatusCodes.indexOf(response.status) === -1) {
        return throwHttpError(response);
      } else {
        return Rx.Observable.of(response);
      }
    });
  };

  result.text = () => {
    return result.failOnHttpError()
      .switchMap(response => response.text());
  };

  result.json = () => {
    return result.failOnHttpError()
      .switchMap(response => response.json());
  };

  return result;
};
