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
/**
 * Instant YAML - a very simple and fast YAML parser
 *
 * @copyright 2019 cepharum GmbH, Berlin, Germany - https://cepharum.de
 * @license MIT
 */

"use strict";

(function() {
	const ParserModes = {
		// processing leading whitespace in a line
		LEADING_SPACE: 0,
		// requiring LF
		LF: 1,
		// reading characters of unquoted property name
		NAME: 2,
		// reading characters of quoted property name searching for closing quote
		QUOTED_NAME: 3,
		// reading single escaped characters in a quoted property name
		ESCAPED_QUOTED_NAME: 4,
		// searching for colon separating property's name from its value
		COLON: 5,
		// reading characters of unquoted, unfolded property value
		VALUE: 6,
		// reading characters of unquoted, folded property value
		FOLDED_VALUE: 7,
		// reading characters of quoted, unfolded property value searching for
		// closing quote
		QUOTED_VALUE: 8,
		// reading single escaped characters in a quoted property value
		ESCAPED_QUOTED_VALUE: 9,
		// reading characters in a comment
		COMMENT: 10,
		// skipping any trailing space while searching next linebreak
		LINEBREAK: 11,
		// tries to detect reason for a leading dash
		GOT_DASH: 12,
	};

	const Errors = {
		character: "invalid character",
		indentation: "invalid indentation",
		linebreak: "invalid linebreak",
		comment: "invalid comment",
		depth: "invalid depth of hierarchy",
		exists: "replacing existing property of same object",
		collection: "invalid mix of collections",
		scalar: "collection expected, but got scalar",
		folded: "invalid folded value",
		quote: "missing closing quote",
		eof: "unexpected end of file",
	};

	const EmptyObject = {};
	const EmptyArray = [];

	/**
	 * Throws error due to parsing issue.
	 *
	 * @param {string} type partial message describing cause
	 * @param {int} line index of line of code error was encountered in
	 * @param {int} column index of column of code error was encountered at
	 * @throws Error
	 * @returns {void}
	 */
	function ParserError( type, line, column ) {
		throw new Error( type + " in line " + line + ", column " + column );
	}

	/**
	 * Replaces discovered escape sequence with character represented by sequence.
	 *
	 * @param {*} _ ignored (assumed full match in pattern matching)
	 * @param {string} code code following backslash
	 * @return {string} character represented by escape sequence
	 */
	function escapes( _, code ) {
		switch ( code ) {
			case "n" : return "\n";
			case "t" : return "\t";
			case "f" : return "\f";
			case "v" : return "\v";

			default :
				return code;
		}
	}

	/**
	 * Implements very basic YAML parser not complying with any standard most
	 * probably.
	 */
	module.exports.YAML = {
		/**
		 * Extracts data structure from provided string assumed to contain some YAML
		 * code.
		 *
		 * @param {string} code string assumed to contain YAML code
		 * @param {object[]} tokens array used to successively consume passed tokens
		 * @returns {object} data structure described by YAML code
		 */
		parse: function( code, tokens ) {
			const _tokens = tokens ? tokens : [];

			if ( typeof code === "object" && code ) {
				return code;
			}

			if ( typeof code !== "string" ) {
				throw new TypeError( "invalid or missing code to be parsed" );
			}

			const numCharacters = code.length;
			const stack = [{
				depth: 0,
				selector: null,
				ref: {},
			}];

			let mode = ParserModes.LEADING_SPACE;
			let node = null;
			let line = 1;
			let column = 1;
			let startBlock = 0;
			let startLine = 0;
			let lineIndentation = 0;


			for ( let cursor = 0; cursor <= numCharacters; cursor++, column++ ) {
				const ch = cursor < numCharacters ? code[cursor] : "\n";

				switch ( mode ) {
					case ParserModes.LEADING_SPACE :
						switch ( ch ) {
							case " " :
							case "\t" :
								break;

							case "\r" :
								mode = ParserModes.LF;
								break;

							case "\n" :
								startBlock = cursor + 1;
								break;

							case "#" :
								if ( !node || !node.folded ) {
									mode = ParserModes.COMMENT;
									break;
								}

								// falls through
							default : {
								startLine = startBlock;
								lineIndentation = cursor - startLine;

								if ( node ) {
									if ( node.folded ) {
										if ( lineIndentation > node.depth ) {
											// line is folded continuation of previous line
											if ( node.value == null ) { // eslint-disable-line max-depth
												node.foldedIndentation = lineIndentation - node.depth;
											}

											startBlock += node.depth;

											mode = ParserModes.FOLDED_VALUE;
											break;
										}

										// previous folded node has actually ended
										// at most recently passed line break
										this.consume( node, stack, _tokens );
										node = null;
									}
								}


								node = {
									depth: lineIndentation,
									line: line,
									column: column,
								};

								startBlock = cursor;

								switch ( ch ) {
									case "'" :
									case '"' :
										mode = ParserModes.QUOTED_NAME;
										break;

									case "-" :
										mode = ParserModes.GOT_DASH;
										startBlock = cursor;
										break;

									default :
										mode = ParserModes.NAME;
										cursor--;
										column--;
								}
							}
						}
						break;

					case ParserModes.GOT_DASH :
						if ( /\s/.test( ch ) ) {
							if ( node.isArrayItem || node.isProperty ) {
								const passed = code.substring( startBlock, cursor );

								node.value = node.isArrayItem ? EmptyArray : EmptyObject;
								this.consume( node, stack, _tokens );

								node = {
									depth: node.depth + 1 + passed.match( /^\s*/ )[0].length,
									isArrayItem: true,
									line: line,
									column: column,
								};
							} else {
								node.isArrayItem = true;
							}

							switch ( ch ) {
								case "\r" :
									node.value = EmptyObject;
									this.consume( node, stack, _tokens );

									mode = ParserModes.LF;
									break;

								case "\n" :
									node.value = EmptyArray;
									this.consume( node, stack, _tokens );

									mode = ParserModes.LEADING_SPACE;

									startBlock = cursor + 1;
									break;

								case " " :
								case "\t" :
									mode = ParserModes.VALUE;
									startBlock = cursor + 1;
									break;

								default :
									// some unexpected type of whitespace
									ParserError( Errors.character, line, column );
							}
						} else if ( node.isProperty || ( node.isArrayItem && /[\d.]/.test( ch ) ) ) {
							mode = ParserModes.VALUE;
						} else {
							ParserError( Errors.character, line, column );
						}
						break;

					case ParserModes.LF :
						// requiring LF (having read CR before)
						if ( ch !== "\n" ) {
							ParserError( Errors.linebreak, line, column );
						}

						mode = ParserModes.LEADING_SPACE;

						startBlock = cursor + 1;
						break;

					case ParserModes.NAME :
						// passing regular content of a non-quoted property name
						// while searching for colon marking end of name
						switch ( ch ) {
							case ":" :
								node.isProperty = true;
								node.propertyName = code.substring( startBlock, cursor ).trim();

								mode = ParserModes.VALUE;
								startBlock = cursor + 1;
								break;

							case " " :
							case "\t" : {
								node.isProperty = true;
								node.propertyName = code.substring( startBlock, cursor ).trim();

								mode = ParserModes.COLON;
								break;
							}

							case "\r" :
							case "\n" :
								ParserError( Errors.linebreak, line, column );
								break;

							case "#" :
								ParserError( Errors.comment, line, column );
								break;

							default :
								if ( /[a-zA-Z0-9_]/.test( ch ) ) {
									break;
								}

								ParserError( Errors.character, line, column );
						}
						break;

					case ParserModes.QUOTED_NAME :
						// passing regular content of a quoted property name while
						// searching for closing quotes
						switch ( ch ) {
							case "\\" :
								mode = ParserModes.ESCAPED_QUOTED_NAME;
								break;

							case "\r" :
							case "\n" :
								ParserError( Errors.linebreak, line, column );
								break;

							case code[startBlock] :
								node.isProperty = true;
								node.propertyName = code.substring( startBlock + 1, cursor ).replace( /\\(.)/g, escapes );

								mode = ParserModes.COLON;
								break;
						}
						break;

					case ParserModes.ESCAPED_QUOTED_NAME :
						// ignoring single character in a quoted name
						switch ( ch ) {
							case "\r" :
							case "\n" :
								ParserError( Errors.linebreak, line, column );
								break;

							default :
								mode = ParserModes.QUOTED_NAME;
						}
						break;

					case ParserModes.COLON :
						// searching for colon separating name from value
						switch ( ch ) {
							case ":" :
								mode = ParserModes.VALUE;
								startBlock = cursor + 1;
								break;

							case " " :
							case "\t" :
								break;

							case "\r" :
							case "\n" :
								ParserError( Errors.linebreak, line, column );
								break;

							case "#" :
								ParserError( Errors.comment, line, column );
								break;

							default :
								ParserError( Errors.character, line, column );
						}
						break;

					case ParserModes.VALUE :
						switch ( ch ) {
							case "#" :
								node.value = code.substring( startBlock, cursor ).trim();
								mode = ParserModes.COMMENT;
								break;

							case "'" :
							case '"' :
								if ( !/\S/.test( code.substring( startBlock, cursor ) ) ) {
									mode = ParserModes.QUOTED_VALUE;
									startBlock = node.quotedValue = cursor;
								}
								break;

							case "\r" :
								node.value = code.substring( startBlock, cursor ).trim();
								if ( node.value === "" ) {
									node.value = EmptyObject;
								}

								mode = ParserModes.LF;
								break;

							case "\n" :
								node.value = code.substring( startBlock, cursor ).trim();
								if ( node.value === "" ) {
									node.value = EmptyObject;
								}

								mode = ParserModes.LEADING_SPACE;

								startBlock = cursor + 1;
								break;

							case ":" :
								if ( node.isArrayItem || node.isProperty ) {
									const passed = code.substring( startBlock, cursor );
									const trimmed = passed.trim();

									if ( /^[a-zA-Z0-9_]+$/.test( trimmed ) ) {
										node.value = EmptyObject;
										this.consume( node, stack, _tokens );

										node = {
											depth: node.depth + 1 + passed.match( /^\s*/ )[0].length,
											isProperty: true,
											propertyName: trimmed,
											line: line,
											column: column,
										};

										startBlock = cursor + 1;
									}
								}
								break;

							case "-" :
								if ( node.isArrayItem || node.isProperty ) {
									const passed = code.substring( startBlock, cursor );
									const trimmed = passed.trim();

									if ( !trimmed.length ) {
										mode = ParserModes.GOT_DASH;
									}
								}
								break;
						}

						switch ( node.value ) {
							case ">" :
							case ">-" :
							case ">+" :
							case "|" :
							case "|-" :
							case "|+" :
								// got marker for starting folded string in next line
								node.folded = node.value;
								node.value = null;
								break;

							case null :
							case undefined :
								// keep searching for end of value
								break;

							case "" :
								// assume another line with deeper indentation
								node.value = EmptyObject;

							// falls through
							default :
								this.consume( node, stack, _tokens );
								node = null;
						}

						break;

					case ParserModes.QUOTED_VALUE :
						// passing regular content of a quoted value while searching
						// for closing quotes
						switch ( ch ) {
							case "\\" :
								mode = ParserModes.ESCAPED_QUOTED_VALUE;
								break;

							case "\r" :
							case "\n" :
								ParserError( Errors.linebreak, line, column );
								break;

							case code[startBlock] :
								node.value = code.substring( startBlock + 1, cursor ).replace( /\\(.)/g, escapes );

								mode = ParserModes.LINEBREAK;
								startBlock = cursor + 1;
								break;
						}
						break;

					case ParserModes.ESCAPED_QUOTED_VALUE :
						// ignoring single character in a quoted name
						switch ( ch ) {
							case "\r" :
							case "\n" :
								ParserError( Errors.linebreak, line, column );
								break;

							default :
								mode = ParserModes.QUOTED_VALUE;
						}
						break;

					case ParserModes.FOLDED_VALUE : {
						// reading another line of a folded value's content
						let isCrLf = false;

						switch ( ch ) {
							case "\r" :
								isCrLf = true;

							// falls through
							case "\n" : {
								const _pre = code.substr( startBlock, node.foldedIndentation );
								let _line = code.substring( startBlock + node.foldedIndentation, cursor );

								const match = /\S/.exec( _pre );
								if ( match ) {
									const diff = node.foldedIndentation - match.index;
									let padding = "";

									for ( let n = 0; n < diff; n++ ) {
										padding += " ";
									}

									node.value = node.value.replace( /(^|\n(?=\s*\S))/g, "$1" + padding );

									node.foldedIndentation = match.index;

									_line = _pre.substr( match.index ) + _line;
								}

								node.value = ( node.value == null ? "" : node.value ) + _line;

								if ( isCrLf ) {
									mode = ParserModes.LF;
								} else {
									mode = ParserModes.LEADING_SPACE;

									startBlock = cursor + 1;
								}
								break;
							}
						}
						break;
					}

					case ParserModes.COMMENT :
						switch ( ch ) {
							case "\r" :
								mode = ParserModes.LF;
								break;

							case "\n" :
								mode = ParserModes.LEADING_SPACE;

								startBlock = cursor + 1;
						}
						break;

					case ParserModes.LINEBREAK :
						// skipping trailing whitespace after some quoted value
						// while searching next linebreak
						switch ( ch ) {
							case " " :
							case "\t" :
								break;

							case "\r" :
								this.consume( node, stack, _tokens );
								node = null;

								mode = ParserModes.LF;
								break;

							case "\n" :
								this.consume( node, stack, _tokens );
								node = null;

								mode = ParserModes.LEADING_SPACE;

								startBlock = cursor + 1;
								break;

							case "#" :
								this.consume( node, stack, _tokens );
								node = null;

								mode = ParserModes.COMMENT;
								break;

							case ":" :
								if ( node.isArrayItem && typeof node.value === "string" ) {
									const trimmed = node.value;

									if ( /^[a-zA-Z0-9_]+$/.test( trimmed ) ) {
										node.value = EmptyObject;
										this.consume( node, stack, _tokens );

										node = {
											depth: node.startQuote + 1 + node.value.match( /^\s*/ )[0].length,
											isProperty: true,
											propertyName: trimmed,
											line: line,
											column: column,
										};

										mode = ParserModes.VALUE;
										startBlock = cursor + 1;

										break;
									}
								}

								ParserError( Errors.character, line, column );
								break;

							default :
								ParserError( Errors.character, line, column );
						}
						break;
				}

				if ( ch === "\n" && cursor < numCharacters ) {
					if ( node && node.folded && node.value != null ) {
						node.value += "\n";
					}

					line++;
					column = 0;
				}
			}


			// handle last token discovered before
			switch ( mode ) {
				case ParserModes.VALUE :
					node.value = code.substring( startBlock ).trim();
					switch ( node.value ) {
						case "|" :
						case ">" :
							ParserError( Errors.folder, line, column );
							break;

						case "" :
							// assume another line with deeper indentation
							node.value = EmptyObject;

						// falls through
						default :
							this.consume( node, stack, _tokens );
							node = null;
					}
					break;

				case ParserModes.LINEBREAK :
					this.consume( node, stack, _tokens );
					break;

				case ParserModes.LEADING_SPACE :
					if ( node && node.folded ) {
						this.consume( node, stack, _tokens );
					}
					break;

				case ParserModes.COMMENT :
					break;

				case ParserModes.QUOTED_NAME :
				case ParserModes.ESCAPED_QUOTED_NAME :
				case ParserModes.QUOTED_VALUE :
				case ParserModes.ESCAPED_QUOTED_VALUE :
					ParserError( Errors.quote, line, column );
					break;

				default :
					ParserError( Errors.eof, line, column );
			}

			return stack[stack.length - 1].ref;
		},

		/**
		 * Collects provided node in given context.
		 *
		 * @param {object} node description of parsed node to be collected
		 * @param {object} contextStack LIFO queue of objects to consume data
		 * @param {object[]} tokensCollector list provided to collect all passed tokens
		 * @returns {void}
		 */
		consume: function( node, contextStack, tokensCollector ) {
			const depth = node.depth;

			for ( ;; ) {
				const frame = contextStack[0];
				if ( !frame ) {
					ParserError( Errors.depth, node.line, node.column );
					return;
				}

				const frameDepth = frame.depth;

				if ( isNaN( frameDepth ) && ( contextStack[1] || {} ).depth < depth ) {
					// started new level before without knowing its level
					// -> adopting level of now provided node
					frame.depth = depth;
					break;
				}

				if ( frameDepth === depth ) {
					// found existing frame matching node's indentation
					break;
				}

				if ( frameDepth < depth ) {
					ParserError( Errors.indentation, node.line, node.column );
				}

				contextStack.shift();
			}


			// found existing frame with less indentation than node in stack
			// sorted by indentation
			switch ( node.value ) {
				case EmptyArray :
				case EmptyObject : {
					// got proper node marking start of another level of hierarchy
					// -> put another frame with node's indentation onto stack
					let ref = contextStack[0].ref;
					let isArray = Array.isArray( ref );

					if ( node.isArrayItem && !isArray ) {
						if ( Object.keys( ref ).length === 0 ) {
							ref = contextStack[0].ref = [];
							isArray = true;

							if ( contextStack.length > 1 ) {
								contextStack[1].ref[contextStack[0].selector] = ref;
							}
						}
					}

					const selector = isArray ? ref.length : node.propertyName;
					const sub = node.value === EmptyArray ? [] : {};

					contextStack.unshift( {
						depth: NaN,
						selector: selector,
						ref: sub,
					} );

					if ( isArray ) {
						ref.push( sub );
					} else {
						ref[node.propertyName] = sub;
					}

					tokensCollector.push( node );
					return;
				}
			}


			let collection = contextStack[0].ref;


			if ( node.isArrayItem ^ Array.isArray( collection ) ) {
				// mismatching type of collection at current level of hierarchy
				if ( Object.keys( collection ).length > 0 ) {
					ParserError( Errors.collection, node.line, node.column );
					return;
				}

				// need to switch current level's type of collection
				const selector = contextStack[0].selector;

				if ( node.isArrayItem ) {
					collection = contextStack[0].ref = [];
				} else {
					collection = contextStack[0].ref = {};
				}

				if ( selector != null && contextStack.length > 1 ) {
					contextStack[1].ref[selector] = collection;
				}
			}


			switch ( node.value ) {
				case EmptyObject :
				case EmptyArray :
					ParserError( Errors.indentation, node.line, node.column );
					break;

				default :
					if ( node.folded ) {
						const mode = /^([|>])([+-])?$/.exec( node.folded );
						node.value = node.value.replace( /(\n\s*$)|(?:\n([^ \t]))/g, function( _, end, inner ) {
							if ( end ) {
								switch ( mode[2] ) {
									case "+" :
										return end;

									case "-" :
										return "";

									default :
										return "\n";
								}
							}

							return ( mode[1] === ">" ? inner === "\n" ? "" : " " : "\n" ) + inner;
						} );
					} else if ( !node.quotedValue ) {
						const trimmedValue = node.value.trim();

						if ( trimmedValue === "null" ) {
							node.value = null;
						} else if ( /^(?:y(?:es)?|true|on)$/i.test( trimmedValue ) ) {
							node.value = true;
						} else if ( /^(?:no?|false|off)$/i.test( trimmedValue ) ) {
							node.value = false;
						} else if ( trimmedValue.replace( /^[+-]/, "" ).length > 0 && /^(?:[+-])?(?:\d+)?(?:\.\d+)?$/i.test( trimmedValue ) ) {
							node.value = parseFloat( trimmedValue );
						} else {
							node.value = trimmedValue;
						}
					}
			}

			if ( node.isArrayItem ) {
				collection.push( node.value );
			} else if ( node.isProperty ) {
				collection[node.propertyName] = node.value;
			} else {
				ParserError( Errors.scalar, node.line, node.column );
			}

			tokensCollector.push( node );
		},
	};
})();
