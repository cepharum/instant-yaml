/**
 * (c) 2019 cepharum GmbH, Berlin, http://cepharum.de
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2019 cepharum GmbH
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * @author: cepharum
 */

"use strict";

const Path = require( "path" );
const File = require( "fs" );
const Child = require( "child_process" );


const [name] = process.argv.slice( 2 );

if ( name ) {
	process.stderr.write( "* testing " + Path.relative( __dirname, name ) + " ...", "utf8" ); // eslint-disable-line no-console

	const { YAML } = require( "../../" );

	const code = File.readFileSync( name + ".yml", { encoding: "utf8" } );
	const expected = require( name + ".json" );
	const tokens = [];
	let parsed;

	try {
		parsed = YAML.parse( code, tokens );
	} catch ( error ) {
		console.error( "\n  - Parser Error: " + error.stack ); // eslint-disable-line no-console
		process.exit( 1 );
	}

	if ( !deepCompare( parsed, expected ) ) {
		console.log( tokens ); // eslint-disable-line no-console
		process.exit( 1 );
	}

	process.stderr.write( " SUCCESS!\n" );
	process.exit( 0 );
} else {
	const collected = enumerate( Path.join( __dirname, "data" ), [] );

	testNext( collected, 0, collected.length );
}

/**
 * Deeply enumerates some folder looking for pairs of files consisting of a
 * YAML and a JSON file.
 *
 * @param {string} path path name of folder to enumerate
 * @param {string[]} collected list of found files' names without extension
 * @return {string[]} same list of collected file names
 */
function enumerate( path, collected ) {
	const entries = File.readdirSync( path, { withFileTypes: true } );

	entries.forEach( entry => {
		if ( /^\./.test( entry.name ) ) {
			return;
		}

		if ( entry.isFile() ) {
			if ( !/\.yml/.test( entry.name ) ) {
				return;
			}

			const subName = Path.join( path, entry.name.replace( /\.[^.]+$/, "" ) );
			if ( File.statSync( subName + ".json" ).isFile() ) {
				collected.push( subName );
			}
		} else if ( entry.isDirectory() ) {
			enumerate( Path.join( path, entry.name ), collected );
		}
	} );

	return collected;
}

/**
 * Sequentially spawns current process for running gone of the enumerated tests.
 *
 * @param {string[]} allPairs lists all enumerated file pairs without extension
 * @param {int} current index of pair in provided list to be tested
 * @param {int} stopAt index at which testing finishes}
 * @returns {void}
 */
function testNext( allPairs, current, stopAt ) {
	if ( current < stopAt ) {
		const pairname = allPairs[current];

		const child = Child.execFile( process.argv[0], [
			process.argv[1],
			pairname,
		], {
			windowsHide: true,
		} );

		child.stdout.pipe( process.stdout );
		child.stderr.pipe( process.stderr );

		child.on( "exit", code => {
			if ( code ) {
				process.exit( code );
			} else {
				process.nextTick( testNext, allPairs, current + 1, stopAt );
			}
		} );
	} else {
		process.exit( 0 );
	}
}

/**
 * Deeply compares two values.
 *
 * @param {*} actual first value
 * @param {*} expected second value
 * @param {string} prefix path of properties used to reach current pair of values
 * @return {boolean} true if both values are equivalent, false otherwise
 */
function deepCompare( actual, expected, prefix = "" ) {
	const label = prefix === "" ? "<root>" : prefix;

	if ( typeof actual !== typeof expected ) {
		console.error( `\n  - type of value different @ ${label}: expected ${typeof expected} ${expected}, but got ${typeof actual} ${actual}` ); // eslint-disable-line no-console
		return false;
	}

	if ( Boolean( actual ) !== Boolean( expected ) ) {
		console.error( `\n  - boolean value different @ ${label}: expected ${expected}, but got ${actual}` ); // eslint-disable-line no-console
		return false;
	}

	switch ( typeof actual ) {
		case "object" :
			if ( actual ) {
				const suba = Object.keys( actual ).sort();
				const subx = Object.keys( expected ).sort();

				if ( suba.length !== subx.length ) {
					console.error( `\n  - different number of properties @ ${label}: expected ${subx.length}, but got ${suba.length}` ); // eslint-disable-line no-console
					return false;
				}

				const num = suba.length;

				for ( let i = 0; i < num; i++ ) {
					if ( suba[i] !== subx[i] ) {
						console.error( `\n  - different properties @ ${label}: expected ${subx[i]}, but got ${suba[i]}` ); // eslint-disable-line no-console
						return false;
					}
				}

				for ( let i = 0; i < num; i++ ) {
					const sub = suba[i];

					if ( !deepCompare( actual[sub], expected[sub], prefix === "" ? String( sub ) : prefix + "." + sub ) ) {
						return false;
					}
				}
			}
			return true;

		case "function" :
			if ( actual.toString() === expected.toString() ) {
				return true;
			}

			console.error( `\n  - different functions @ ${label}: expected ${expected}, but got ${actual}` ); // eslint-disable-line no-console
			return false;

		default :
			if ( actual === expected ) {
				return true;
			}

			console.error( `\n  - different scalar values @ ${label}: expected '${expected}', but got '${actual}'` ); // eslint-disable-line no-console
			return false;
	}
}
