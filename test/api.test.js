require('isomorphic-fetch');
require('co-mocha');
require('rxjs-to-async-iterator');
require('babel-polyfill');
import rxFetch, {
  parseJson,
  parseText,
  failOnHttpError,
  failIfStatusNotIn
} from '../src/rx-fetch';

const Rx = require('rxjs');
const expect = require('chai').expect;
const nock = require('nock');

const good = 'hello world';
const bad = 'good bye cruel world';

describe('rxjs-fetch', () => {
  describe('rxjsFetch', function () {
    it('should return an Observable which yields a single Response object', function * () {
      nock('http://tangledfruit.com/')
        .get('/succeed.txt')
        .reply(200, good);

      const result = yield rxFetch('http://tangledfruit.com/succeed.txt').shouldGenerateOneValue();

      expect(result.status).to.equal(200);
      expect(result.ok).to.equal(true);
      expect(result.statusText).to.equal('OK');
      expect(typeof (result.headers)).to.equal('object');
      expect(result.url).to.equal('http://tangledfruit.com/succeed.txt');
    });
    it('should not start work until the Observable has been subscribed to', function * () {
      const scope = nock('http://tangledfruit.com/')
        .get('/succeed.txt')
        .reply(200, good);

      const fetchResult = rxFetch('http://tangledfruit.com/succeed.txt');

      expect(scope.isDone()).to.equal(false);

      const result = yield fetchResult.shouldGenerateOneValue();

      expect(result.status).to.equal(200);
      expect(result.ok).to.equal(true);
      expect(result.statusText).to.equal('OK');
      expect(typeof (result.headers)).to.equal('object');
      expect(result.url).to.equal('http://tangledfruit.com/succeed.txt');
    });
    it('should allow you to post with a request body', function * () {
      nock('http://tangledfruit.com/')
        .post('/post.txt', "Yo, what's up?")
        .reply(200, good);

      const result = yield rxFetch('http://tangledfruit.com/post.txt',
        {
          method: 'POST',
          body: "Yo, what's up?"
        }).shouldGenerateOneValue();

      expect(result.status).to.equal(200);
      expect(result.ok).to.equal(true);
      expect(result.statusText).to.equal('OK');
      expect(typeof (result.headers)).to.equal('object');
      expect(result.url).to.equal('http://tangledfruit.com/post.txt');
    });
    it('should catch any error and convert that to an Observable error', function * () {
      nock('http://tangledfruit.com/')
        .post('/post.txt', "Yo, what's up?")
        .replyWithError('simulated network failure');

      yield rxFetch('http://tangledfruit.com/post.txt',
        {
          method: 'POST',
          body: "Yo, what's up?"
        })
        .shouldThrow(/simulated network failure/);
    });

    it('should still resolve with a Response object if the request fails', function * () {
      nock('http://tangledfruit.com/')
        .get('/fail.txt')
        .reply(404, bad);

      const result = yield rxFetch('http://tangledfruit.com/fail.txt').shouldGenerateOneValue();

      expect(result.status).to.equal(404);
      expect(result.ok).to.equal(false);
      expect(result.statusText).to.equal('Not Found');
      expect(typeof (result.headers)).to.equal('object');
      expect(result.url).to.equal('http://tangledfruit.com/fail.txt');
    });
  });

  describe('parseText', () => {
    nock('http://tangledfruit.com/')
      .get('/succeed.txt')
      .reply(200, good);

    const fetchResult = rxFetch('http://tangledfruit.com/succeed.txt');

    it('should return an Observable which yields the body of the response as a string', function * () {
      const textResult = yield fetchResult
        ::parseText()
        .shouldGenerateOneValue();
      expect(textResult).to.equal(good);
    });
  });

  describe('parseJson', () => {
    nock('http://tangledfruit.com/')
      .get('/json.txt')
      .reply(200, '{"x":["hello", "world", 42]}');

    const fetchResult = rxFetch('http://tangledfruit.com/json.txt');

    it('should return an Observable which yields the body of the response as parsed JSON', function * () {
      const jsonResult = yield fetchResult
        ::parseJson()
        .shouldGenerateOneValue();
      expect(jsonResult).to.deep.equal({x: ['hello', 'world', 42]});
    });
  });


  describe('failOnHttpError', () => {
    it('should return an Observable which yields a single Response object on HTTP success', function * () {
      nock('http://tangledfruit.com/')
        .get('/succeed.txt')
        .reply(200, good);

      const result = yield rxFetch('http://tangledfruit.com/succeed.txt')
        ::failOnHttpError()
        .shouldGenerateOneValue();

      expect(result.status).to.equal(200);
      expect(result.ok).to.equal(true);
      expect(result.statusText).to.equal('OK');
      expect(typeof (result.headers)).to.equal('object');
      expect(result.url).to.equal('http://tangledfruit.com/succeed.txt');
    });

    it('should yield an error notification if the request fails', function * () {
      nock('http://tangledfruit.com/')
        .get('/fail.txt')
        .reply(404, bad);

      const error = yield rxFetch('http://tangledfruit.com/fail.txt')
        ::failOnHttpError()
        .shouldThrow();

      expect(error).to.be.an.instanceof(Error);
    });
  });

  describe('failIfStatusNotIn', () => {
    it('should return an Observable which yields a single Response object on HTTP success', function * () {
      nock('http://tangledfruit.com/')
        .get('/succeed.txt')
        .reply(200, good);

      const result = yield rxFetch('http://tangledfruit.com/succeed.txt')
        ::failIfStatusNotIn([200])
        .shouldGenerateOneValue();

      expect(result.status).to.equal(200);
      expect(result.ok).to.equal(true);
      expect(result.statusText).to.equal('OK');
      expect(typeof (result.headers)).to.equal('object');
      expect(result.url).to.equal('http://tangledfruit.com/succeed.txt');
    });

    it('should yield an error notification if the request fails', function * () {
      nock('http://tangledfruit.com/')
        .get('/fail.txt')
        .reply(404, bad);

      const error = yield rxFetch('http://tangledfruit.com/fail.txt')
        ::failIfStatusNotIn([200, 400])
        .shouldThrow();

      expect(error).to.be.an.instanceof(Error);
    });
  });
});
