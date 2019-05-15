# Simple YAML Parser

A very simple YAML parser suitable for parsing basic YAML files.

## What is it?

* It is small.
* It is fast
* It works out of the box.
* It runs in a browser without need for any shim to fake NodeJS features. The included sandbox works in MSIE 11.
* It reads simple YAML files.

## What is it not?

* I'm pretty sure it doesn't _fully_ comply with any YAML specification. Please note the focus on _fully_.
* It doesn't support any of the more fancy types of data that come with latest specifications.
* It doesn't care for schemes.

## Why should you use it?

First of all, just return to the question about what it is. If this isn't motivation enough you might miss a use case for sure.

Replacing JSON with YAML is often useful on receiving structured information from human users as YAML is a more human-friendly format. So, when you have an application that processes user-provided data you should consider using YAML instead of JSON. And if you happen to have an application to be run in a user's browser using this YAML parser might be an option. Why? Return to the top! ;)

## What are we using it for?

This parser has been developed as part of our [forms processor](https://www.npmjs.com/package/forms-processor) which is an engine for having quite complex sequences of forms rendered in a browser. This engine takes a just as complex definition of that sequence and it turned out YAML is much easier to manage long term than JSON. That engine is designed to run in a browser. We've checked out [js-yaml](https://www.npmjs.com/package/js-yaml) and [yaml](https://www.npmjs.com/package/yaml) but dropped them for their dependency and for increasing the engine's size by roughly 50%. That's unacceptable ... in the end we've started our own YAML parser.

## License

MIT
