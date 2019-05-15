# Simple YAML Parser

A very simple YAML parser suitable for parsing basic YAML files.

## License

MIT

## What is it?

* It is small.  
  The minified non-GZipped version is about 7 KiByte in size, only.
* It is fast.  
  Files are parsed in a single pass. Information is often cached. The processor consists of two functions preventing deep stack frames while parsing. There is little use of intermittent data.
* It works out of the box.  
  Due to including minified version you can fetch the package via a CDN like [jsdelivr](https://cdn.jsdelivr.net/npm/instant-yaml@0.1.2/parser.min.js) or [unpkg](https://unpkg.com/instant-yaml@0.1.2/parser.min.js). 
* It runs in a browser without need for any shim to fake NodeJS features. The included sandbox works in MSIE 11.
* It reads simple YAML files.

## What is it not?

* I'm pretty sure it doesn't _fully_ comply with any YAML specification. Please note the focus on _fully_. Just checkout the [conversion test data](https://github.com/cepharum/instant-yaml/tree/master/test/conversion/data) to see the syntax actually supported by this parser.
* It doesn't support any of the more fancy types of data that come with latest specifications.
* It doesn't care for schemes.

## Why should you use it?

First of all, just return to the question about what it is. If this isn't motivation enough you might miss a use case for sure.

Replacing JSON with YAML is often useful on receiving structured information from human users as YAML is a more human-friendly format. So, when you have an application that processes user-provided data you should consider using YAML instead of JSON. And if you happen to have an application to be run in a user's browser using this YAML parser might be an option. Why? Return to the top! ;)

## What are we using it for?

This parser has been developed as part of our [forms processor](https://www.npmjs.com/package/forms-processor) which is an engine for having quite complex sequences of forms rendered in a browser. This engine takes a just as complex definition of that sequence and it turned out YAML is much easier to manage long term than JSON. That engine is designed to run in a browser. We've checked out [js-yaml](https://www.npmjs.com/package/js-yaml) and [yaml](https://www.npmjs.com/package/yaml) but dropped them for their dependency and for increasing the engine's size by roughly 50%. That's unacceptable ... in the end we've started our own YAML parser.

## How To Use It

### The Instant Way

The parser is implemented as a CommonJS module. Thus you might inject it in an HTML document like this:

	<script type="application/javascript">
		const module = {
			exports: window,
		};
	</script>
	<script type="application/javascript" src="parser.min.js"></script>
	<script type="application/javascript">
		const data = YAML.parse( "# This is some sort of YAML code\n\n" )
	</script>

The first block is used to _forward_ the module's export to become globally available in context of current window. That's why the parser is available as `YAML` after importing it in second block. 

### The Preferred Way

When using as a dependency you should always rely on tools such as WebPack or Browserify to merge all your code and your dependencies like this one into one file. Thus, you first have to add this package as a dependency:

    npm install instant-yaml

After that you might import it in your code:

    const { YAML } = require( "instant-yaml" );

or

    import { YAML } from "instant-yaml";
