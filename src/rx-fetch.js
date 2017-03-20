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

  return fetch$.share();
};

const throwHttpError = (response) => {
  let err = new Error('HTTP Error ' + response.status + ' on ' + url + ': ' + response.statusText);
  err.response = response;
  return _throw(err);
};

export const failOnHttpError = function() {
  return this::switchMap(response => {
    if (!response.ok) {
      return throwHttpError(response);
    }

    return of(response);
  });
};

export const failIfStatusNotIn = function(acceptableStatusCodes) {
  return this::switchMap((response) => {
    if (acceptableStatusCodes.indexOf(response.status) === -1) {
      return throwHttpError(response);
    }

    return of(response);
  });
};

export const parseText = function() {
  return this::switchMap((response) => {
    return fromPromise(response.text());
  });
};

export const parseJson = function() {
  return this::parseText()::map((text) => {
    return JSON.parse(text);
  });
};

export default rxFetch;