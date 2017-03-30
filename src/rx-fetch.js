import { defer } from 'rxjs/observable/defer';
import { share } from 'rxjs/operator/share';
import { fromPromise } from 'rxjs/observable/fromPromise';
import { switchMap } from 'rxjs/operator/switchMap';
import { of } from 'rxjs/observable/of';
import { _throw } from 'rxjs/observable/throw';
import { map } from 'rxjs/operator/map';

const rxFetch = (url, options) => {
  const fetch$ = defer(() => {
    const fetchPromise = fetch(url, options);

    return fromPromise(fetchPromise);
  });

  return fetch$::share();
};

const throwHttpError = (response) => {
  const err = new Error(`HTTP Error ${response.status} on ${response.url}: ${response.statusText}`);
  err.response = response;
  return _throw(err);
};

export const failOnHttpError = function() {
  // eslint-disable-next-line no-invalid-this
  return this::switchMap((response) => {
    if (!response.ok) {
      return throwHttpError(response);
    }

    return of(response);
  });
};

export const failIfStatusNotIn = function(acceptableStatusCodes) {
  // eslint-disable-next-line no-invalid-this
  return this::switchMap((response) => {
    if (acceptableStatusCodes.indexOf(response.status) === -1) {
      return throwHttpError(response);
    }

    return of(response);
  });
};

export const parseText = function() {
  // eslint-disable-next-line no-invalid-this
  return this::switchMap((response) => {
    return fromPromise(response.text());
  });
};

export const parseJson = function() {
  // eslint-disable-next-line no-invalid-this
  return this::parseText()::map((text) => {
    return JSON.parse(text);
  });
};

export default rxFetch;