# We've moved!

This project's maintenance has moved to a [different repository](https://gitlab.com/cepharum-foss/instant-yaml).

# Instant YAML

A very simple parser for _sort of YAML_ format

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

* I'm pretty sure it doesn't comply with YAML specifications in several situations. Maybe it is thus misleading to call it a YAML parser at all. But the supported syntax is a subset of YAML as specified. Please checkout the [conversion test data](https://github.com/cepharum/instant-yaml/tree/master/test/conversion/data) to see the syntax actually supported by this parser.
* It doesn't support any of the more fancy types of data that come with latest specifications.
* It doesn't care for schemes.

## Why should you use it?

First of all, just return to the question about what it is. If this isn't motivation enough you might miss a use case for sure or this parser simply doesn't match your particular requirements.

Maybe it helps to explain, why we are using it: We prefer YAML over JSON when asking human users to provide structured information for YAML is a more human-friendly format. So, when you have an application that processes user-provided data you might want to use YAML instead of JSON as well. And if you happen to have an application to be run in a user's browser using this YAML parser might be an option. Why? Return to the top! ;)

## What are we using it for?

This parser has been developed as part of our [forms processor](https://www.npmjs.com/package/forms-processor) which is an engine for having quite complex sequences of forms rendered in a browser. This engine takes a just as complex definition of that sequence. As it turned out YAML is much easier to manage long term than JSON and it's much easier to comprehend and to master for users that come from a less technical background. 

That engine is designed to run in a browser. We've checked out [js-yaml](https://www.npmjs.com/package/js-yaml) and [yaml](https://www.npmjs.com/package/yaml) but dropped them for their dependencies on additional packages and for increasing the engine's size by roughly 50%. That's unacceptable ... in the end we've started developing our own YAML parser.

## You need instant details?

* The parser basically supports sequences:

  ```yaml
  - first
  - second
  - third
  ```

* The parser basically supports collections:

  ```yaml
  lastname: Doe
  firstname: John
  age: unknown
  ```

* Collections and sequences can be nested:

  ```yaml
  - lastname: Doe
    firstname: John
    age: unknown
  - lastname: Doe
    firstname: Jane
    age: unknown
  ```

  or

  ```yaml
  lastname: Doe
  firstname: John
  likes:
    - bikes
    - cars
    - planes
  ```

* It supports basic types of scalar values such string, numeric, boolean and null value.

  ```yaml
  string: any text
  quoted-value: "using double quotes"
  alt-quoted: 'using single quotes'
  "quoted names": supported
  numeric: 1.0
  boolean: true
  explicit-null: null
  ```

* It doesn't support multiple documents using `---` to separate documents from each other.

* At root level, any document must start with a collection or a sequence.

* Long strings can be folded to span multiple lines. But flow-style scalars are not supported.

  ```yaml
  story: |
    Well, this is going to take some lines to write down
    my story. But let's start at the beginning ...
  ```
  
  Folding with `>` is supported as well.

* You can use comments starting with `#`.

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

The first script block is used to _forward_ the module's export to become globally available in context of current window. That's why importing the module in second script block exposes the parser in global variable `YAML` which is then used in third script block. 

### The Preferred Way

When using as a dependency you should always rely on tools such as WebPack or Browserify to merge all your code and your dependencies like this one into one file. Thus, you first have to add this package as a dependency:

    npm install instant-yaml

After that you might import it in your code:

    const { YAML } = require( "instant-yaml" );

or

    import { YAML } from "instant-yaml";
