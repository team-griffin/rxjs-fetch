# rxjs-fetch
RxJS-flavored version of HTTP fetch API for node.js.

**IMPORTANT:** This library only supports RxJS 5.x.

This package uses binding syntax to provide the ability to chain
custom operators on a standard observable.

## Requirements

- Promise polyfill
- Fetch polyfill

## Installation

```sh
npm install --save @team-griffin/rxjs-fetch
```

```sh
yarn add @team-griffin/rxjs-fetch
```

## Usage

```javascript
import rxFetch, {
  failOnHttpError,
  failIfStatusNotIn,
  parseText,
  parseJson,
} from '@team-griffin/rxjs-fetch';

// This function expects the same args
// as window.fetch
const obs = rxFetch('http://www.example.com/', {
  method: 'GET',
});

const subscription = obs.subscribe((response) => {
  // Response here is the same as what
  // you'd get back from standard fetch
  console.log(response);
});

const subscription = obs::failOnHttpError()
  .subscribe((response) => {
    console.log(response);
  }, (err) => {
    console.log(err);
  });

const subscription = obs
  ::failOnHttpError()
  ::parseJson()
  .subscribe((json) => {
    console.log(json);
  }, (err) => {
    console.log(err);
  });

```


## License

MIT
