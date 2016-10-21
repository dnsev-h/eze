// ==UserScript==
// @name           eze (dev)
// @version        1.0.8.4
// @author         dnsev-h
// @namespace      dnsev-h
// @homepage       https://dnsev-h.github.io/eze/
// @description    Additional features for E*Hentai
// @grant          GM_xmlhttpRequest
// @run-at         document-start
// @include        http://exhentai.org/*
// @include        https://exhentai.org/*
// @include        http://g.e-hentai.org/*
// @include        https://g.e-hentai.org/*
// @connect        exhentai.org
// @connect        e-hentai.org
// @connect        ehgt.org
// @connect        *
// @icon           data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwAQMAAABtzGvEAAAABlBMVEUAAABmBhHV14kpAAAAAXRSTlMAQObYZgAAADFJREFUeAFjIB4w//9BLPWBgSLq//HH/w8QQYE18GOj6hgwKCBCpcDOZQaZQpgiGgAA0dhUnSJVLdEAAAAASUVORK5CYII=
// ==/UserScript==
// ==Meta==
// @updateURL      https://raw.githubusercontent.com/dnsev-h/eze/master/builds/{{meta}}
// @downloadURL    https://raw.githubusercontent.com/dnsev-h/eze/master/builds/{{target}}
// ==/Meta==



// Main scope
(function (window) {
	"use strict";

	// Tampermonkey bug fix
	if (window.document === undefined) window = window.unsafeWindow;
	var document = window.document;

/*<debug>*/
	// Debugging
	var stack_trace = function () {
		var s = "";
		try {
			null.null = null;
		}
		catch (e) {
			s = e.stack;
		}
		console.log(e);
	};

	var get_stack = function () {
		var s = "";
		try {
			null.null = null;
		}
		catch (e) {
			s = e.stack;
		}
		return s;
	};

	var LOGJ = function (obj) {
		console.log(JSON.stringify(obj, null, 2));
	};

	var debug_log = function () {
		console.log.apply(console, arguments);
	};

	(function () {

		var log_exception = function (e) {
			console.log(e);
		};

		var wrapper_fn = "_w";

		if (wrapper_fn in Function.prototype || Function.prototype[wrapper_fn]) {
			console.log(wrapper_fn + " already in Function.prototype");
			throw "";
		}
		Function.prototype[wrapper_fn] = function () {
			var fn = this;
			return function () {
				try {
					return fn.apply(this, arguments);
				}
				catch (e) {
					log_exception(e);
					throw e;
				}
			};
		};

	})();
/*</debug>*/

	// Hash updating
	var Hash = (function () {

		var Hash = function () {
			var self = this;

			// Vars
			this.path = "";
			this.path_array = [];
			this.vars = {};
			this.vars_array = [];

			// Change listeners
			this.onchange_listener = function () {
				trigger_change.call(self, "pop");
			};

			this.change_listeners = [];
		};



		var ParsedHash = function (hash_part) {
			this.path = "";

			if (hash_part === null) {
				// Init to empty
				this.path_array = [];
				this.vars = {};
				this.vars_array = [];
			}
			else {
				// Don't init to objects
				this.path_array = null;
				this.vars = null;
				this.vars_array = null;
				parse_state.call(this, hash_part);
			}
		};



		var hash_sep = "#!",
			re_decode_var = /^(.*?)(?:=(.*))?$/,
			re_parts = /^(.*?)(?:\?(.*?))?$/,
			re_hash_find = /#(.*)$/,
			re_remove_slashes = /^\/+|\/{2,}/g,
			re_encode_replacer = /\+|%20/ig,
			encode_map = { "+": "%2B", "%20": "+" };

		var parse_state = function (h) {
			var i, m, v;

			// Normalize
			for (i = 0; i < hash_sep.length && h[i] === hash_sep[i]; ++i);
			if (i > 0) h = h.substr(i);

			// Match
			m = re_parts.exec(h);

			// Parse path
			this.path = m[1].replace(re_remove_slashes, "");
			this.path_array = this.path.split("/");
			for (i = 0; i < this.path_array.length; ++i) {
				this.path_array[i] = decodeURIComponent(this.path_array[i]);
			}

			// Parse vars
			v = Hash.decode_vars(m[2] || "");
			this.vars = v[0];
			this.vars_array = v[1];
		};

		var trigger_change = function (reason) {
			// Update state
			parse_state.call(this, window.location.hash);

			// Trigger a change event
			for (var i = 0; i < this.change_listeners.length; ++i) {
				this.change_listeners[i].call(null, this, reason);
			}
		};




		Hash.prototype = {
			init: function () {
				// Events
				window.addEventListener("popstate", this.onchange_listener, false);

				// Init trigger
				trigger_change.call(this, "init");
			},

			on_change: function (callback) {
				this.change_listeners.push(callback);
			},
			off_change: function (callback) {
				for (var i = 0; i < this.change_listeners.length; ++i) {
					if (this.change_listeners[i] == callback) {
						this.change_listeners.splice(i, 1);
						return true;
					}
				}
				return false;
			},
		};



		Hash.sep = hash_sep;

		Hash.decode = function (url) {
			var m = re_hash_find.exec(url),
				obj;

			if (m !== null) {
				obj = new ParsedHash(m[0]);
			}
			else {
				obj = new ParsedHash(null);
			}

			return obj;
		};
		Hash.encode = function (path, vars) {
			var str = hash_sep;

			if (typeof(path) == "string") {
				str += path;
			}
			else {
				str += path.join("/");
			}

			if (vars) {
				str += "?";
				str += Hash.encode_vars(vars);
			}

			return str;
		};
		Hash.encode_component = function (c) {
			return encodeURIComponent(c).replace(re_encode_replacer, function (m) {
				return encode_map[m];
			});
		};
		Hash.decode_component = function (c) {
			return decodeURIComponent(c.replace(/\+/g, " "));
		};
		Hash.encode_vars = function (vars) {
			var str = "",
				first = true,
				v;

			if (Array.isArray(vars)) {
				for (v = 0; v < vars.length; ++v) {
					if (v > 0) str += "&";

					str += Hash.encode_component(vars[v][0]);
					if (vars[v][1] !== null) {
						str += "=";
						str += Hash.encode_component(vars[v][1]);
					}
				}
			}
			else {
				for (v in vars) {
					if (first) first = false;
					else str += "&";

					str += Hash.encode_component(v);
					if (vars[v] !== null) {
						str += "=";
						str += Hash.encode_component(vars[v]);
					}
				}
			}

			return str;
		};
		Hash.decode_vars = function (var_str) {
			var vars = {},
				vars_array = [],
				m, k, v, s, i;

			s = var_str.split("&");
			for (i = 0; i < s.length; ++i) {
				// Skip
				if (s[i].length === 0) continue;

				// Match
				m = re_decode_var.exec(s[i]);

				// Set the var
				k = Hash.decode_component(m[1]);
				v = (m[2] === undefined) ? null : Hash.decode_component(m[2]);
				vars[k] = v;
				vars_array.push([ k , v ]);
			}

			return [ vars , vars_array ];
		};



		return Hash;

	})();



	// Generic classes/modules
	// Ready state
	var on_ready = (function () {

		// Vars
		var callbacks = [],
			check_interval = null,
			check_interval_time = 250;

		// Check if ready and run callbacks
		var callback_check = function () {
			if (
				(document.readyState === "interactive" || document.readyState === "complete") &&
				callbacks !== null
			) {
				// Run callbacks
				var cbs = callbacks,
					cb_count = cbs.length,
					i;

				// Clear
				callbacks = null;

				for (i = 0; i < cb_count; ++i) {
					cbs[i].call(null);
				}

				// Clear events and checking interval
				window.removeEventListener("load", callback_check, false);
				window.removeEventListener("readystatechange", callback_check, false);

				if (check_interval !== null) {
					clearInterval(check_interval);
					check_interval = null;
				}

				// Okay
				return true;
			}

			// Not executed
			return false;
		};

		// Listen
		window.addEventListener("load", callback_check, false);
		window.addEventListener("readystatechange", callback_check, false);

		// Callback adding function
		return function (cb) {
			if (callbacks === null) {
				// Ready to execute
				cb.call(null);
			}
			else {
				// Delay
				callbacks.push(cb);

				// Set a check interval
				if (check_interval === null && callback_check() !== true) {
					check_interval = setInterval(callback_check, check_interval_time);
				}
			}
		};

	})();

	// Date formatting
	var date_format = (function () {

		var months = [ "January" , "February" , "March" , "April" , "May" , "June" , "July" , "August" , "September" , "October" , "November" , "December" ],
			months_short = [ "Jan" , "Feb" , "Mar" , "Apr" , "May" , "Jun" , "Jul" , "Aug" , "Sep" , "Oct" , "Nov" , "Dec" ],
			days = [ "Sunday" , "Monday" , "Tuesday" , "Wednesday" , "Thursday" , "Friday" , "Saturday" ],
			days_short = [ "Sun" , "Mon" , "Tue" , "Wed" , "Thu" , "Fri" , "Sat" ],
			ordinals = [ "th" , "st" , "nd" , "rd" ],
			formatter_keys = [],
			re_formatter, k, formatters;

		formatters = {
			d: function (date) { // Day of the month, 2 digits with leading zeros
				var s = date.getDate().toString();
				if (s.length < 2) s = "0" + s;
				return s;
			},
			j: function (date) { // Day of the month without leading zeros
				return date.getDate().toString();
			},
			l: function (date) { // A full textual representation of the day of the week
				return days[date.getDay()];
			},
			D: function (date) { // A textual representation of a day, three letters
				return days_short[date.getDay()];
			},
			S: function (date) { // English ordinal suffix for the day of the month, 2 characters
				var i = (date.getDate() - 1); // % 100
				if ((i < 10 || i > 19) && (i = i % 10) <= 3) return ordinals[i];
				return ordinals[0];
			},
			w: function (date) { // Numeric representation of the day of the week
				return date.getDay().toString();
			},
			F: function (date) { // A full textual representation of a month, such as January or March
				return months[date.getMonth()];
			},
			M: function (date) { // A short textual representation of a month, three letters
				return months_short[date.getMonth()];
			},
			m: function (date) { // Numeric representation of a month, with leading zeros
				var s = (date.getMonth() + 1).toString();
				if (s.length < 2) s = "0" + s;
				return s;
			},
			n: function (date) { // Numeric representation of a month, without leading zeros
				return (date.getMonth() + 1).toString();
			},
			y: function (date) { // Year, 2 digits
				return date.getFullYear().toString().substr(2);
			},
			Y: function (date) { // A full numeric representation of a year, 4 digits
				return date.getFullYear().toString();
			},
			a: function (date) { // Lowercase Ante meridiem and Post meridiem
				return (date.getHours() >= 11 && date.getHours() <= 22 ? "pm" : "am");
			},
			A: function (date) { // Uppercase Ante meridiem and Post meridiem
				return (date.getHours() >= 11 && date.getHours() <= 22 ? "PM" : "AM");
			},
			g: function (date) { // 12-hour format of an hour without leading zeros
				return ((date.getHours() % 12) + 1).toString();
			},
			h: function (date) { // 12-hour format of an hour with leading zeros
				var s = ((date.getHours() % 12) + 1).toString();
				if (s.length < 2) s = "0" + s;
				return s;
			},
			G: function (date) { // 24-hour format of an hour without leading zeros
				return date.getHours().toString();
			},
			H: function (date) { // 24-hour format of an hour with leading zeros
				var s = date.getHours().toString();
				if (s.length < 2) s = "0" + s;
				return s;
			},
			i: function (date) { // Minutes with leading zeros
				var s = date.getMinutes().toString();
				if (s.length < 2) s = "0" + s;
				return s;
			},
			s: function (date) { // Seconds with leading zeros
				var s = date.getSeconds().toString();
				if (s.length < 2) s = "0" + s;
				return s;
			},
			u: function (date) { // Milliseconds (note: this is different from PHP)
				var s = date.getMilliseconds().toString();
				if (s.length < 2) s = "00" + s;
				else if (s.length < 3) s = "0" + s;
				return s;
			},
		};

		for (k in formatters) formatter_keys.push(k);
		formatter_keys.sort();
		re_formatter = new RegExp("(\\\\*)([" + formatter_keys.join("").replace(/([^a-zA-Z0-9])/g, "\\$1") + "])", "g");



		// Final function
		return function (date, format) {
			// https://php.net/manual/en/function.date.php
			if (typeof(date) == "number") date = new Date(date);

			return format.replace(re_formatter, function (full, esc, fmt) {
				if (esc.length > 0) {
					if ((esc.length % 2) == 1) {
						// Escaped
						return esc.substr(0, (esc.length - 1) / 2) + fmt;
					}
					// Remove some escapes
					return esc.substr(0, esc.length / 2) + formatters[fmt](date);
				}
				// Not escaped
				return formatters[fmt](date);
			});
		};

	})();

	// Zip creator
	var ZipCreator = (function () {

		var ZipCreator = function () {
			this.files = [];

			this.comment = "";
			this.comment_data = string_to_array(this.comment, max_lengths.comment);

			this.date = new Date();
		};



		var max_lengths = {
			data: 0XFFFFFFFF,
			name: 0xFFFF,
			extra: 0xFFFF,
			comment: 0xFFFF,
		};
		var signatures = {
			file: new Uint8Array([ 0x50 , 0x4B , 0x03 , 0x04 ]),
			cd: new Uint8Array([ 0x50 , 0x4B , 0x01 , 0x02 ]),
			footer: new Uint8Array([ 0x50 , 0x4B , 0x05 , 0x06 ]),
		};
		var data_sizes = {
			file: 26, // 30 - 4
			cd: 42, // 46 - 4
			footer: 18, // 22 - 4
		};

		var ZIP_FLAG_UTF8 = 1 << 11;

		var typeof_str = typeof("");



		var FileData = function (data, filename, extra, comment, date) {
			// Setup
			this.set_data(data);
			this.set_name(filename);
			this.set_extra(extra);
			this.set_comment(comment);
			this.set_date(date);

			// Other stuff
			this.offset = 0;
			this.crc = null;
			this.utf8 = true;
		};
		FileData.prototype = {
			constructor: FileData,

			prepare: function (offset) {
				this.offset = offset;
				this.utf8 = (
					this.name.length != this.name_data.length ||
					this.extra.length != this.extra_data.length ||
					this.comment.length != this.comment_data.length
				);
				if (this.crc === null) {
					this.crc = crc32(this.data);
				}
			},

			set_data: function (data) {
				if (typeof(data) == typeof_str) {
					// Convert to array
					this.data = string_to_array(data, max_lengths.data);
				}
				else {
					// Set and truncate if necessary
					this.data = data;
					if (this.data.length > max_lengths.data) {
						this.data = this.data.subarray(0, max_lengths.data);
					}
				}

				this.crc = null;
			},
			set_name: function (filename) {
				this.name = filename;
				this.name_data = string_to_array(this.name, max_lengths.name);
			},
			set_extra: function (extra) {
				this.extra = extra;
				this.extra_data = string_to_array(this.extra, max_lengths.extra);
			},
			set_comment: function (comment) {
				this.comment = comment;
				this.comment_data = string_to_array(this.comment, max_lengths.comment);
			},
			set_date: function (date) {
				this.date = date;
				this.date_zip = date_to_ziptime(this.date);
			},
		};

		var BufferWriter = function (buffer) {
			this.buffer = buffer;
			this.pos = 0;
			this.buffers = buffer;
		};
		BufferWriter.prototype = {
			constructor: BufferWriter,

			reset: function (buffer) {
				this.buffer = buffer;
				this.pos = 0;
			},

			get_pos: function () {
				return this.pos;
			},

			write_ushort: function (value) {
				// Bound
				value = (value & 0x0000FFFF) >>> 0;

				// Write
				for (var i = 0; i < 2; ++i) {
					this.buffer[this.pos++] = value & 0xFF;
					value = value >>> 8;
				}
			},
			write_uint: function (value) {
				// Bound
				value = (value & 0xFFFFFFFF) >>> 0;

				// Write
				for (var i = 0; i < 4; ++i) {
					this.buffer[this.pos++] = value & 0xFF;
					value = value >>> 8;
				}
			},
			write_data: function (data) {
				// Write
				for (var i = 0, len = data.length; i < len; ++i) {
					this.buffer[this.pos++] = data[i];
				}
			},
			write_string: function (str) {
				// Write
				for (var i = 0, len = str.length; i < len; ++i) {
					this.buffer[this.pos++] = str.charCodeAt(i);
				}
			},
		};

		var MultiBufferWriter = function (total_length, max_segment_length) {
			max_segment_length = Math.max(1, max_segment_length);

			this.pos = 0;
			this.pos_offset = 0;
			this.remaining_length = total_length;
			this.max_segment_length = max_segment_length;

			this.buffer = new Uint8Array(Math.min(this.remaining_length, this.max_segment_length));
			this.buffers = [ this.buffer ];
			this.remaining_length -= this.buffer.length;
		};
		MultiBufferWriter.prototype = {
			constructor: MultiBufferWriter,

			bounds_check: function () {
				if (this.pos >= this.buffer.length) {
					this.buffer = new Uint8Array(this.remaining_length <= 0 ? this.max_segment_length : Math.min(this.remaining_length, this.max_segment_length));
					this.buffers.push(this.buffer);
					this.remaining_length -= this.buffer.length;
					this.pos_offset += this.pos;
					this.pos = 0;
				}
			},

			get_pos: function () {
				return this.pos + this.pos_offset;
			},

			write_ushort: function (value) {
				// Bound
				value = (value & 0x0000FFFF) >>> 0;

				// Write
				for (var i = 0; i < 2; ++i) {
					this.bounds_check();
					this.buffer[this.pos++] = value & 0xFF;
					value = value >>> 8;
				}
			},
			write_uint: function (value) {
				// Bound
				value = (value & 0xFFFFFFFF) >>> 0;

				// Write
				for (var i = 0; i < 4; ++i) {
					this.bounds_check();
					this.buffer[this.pos++] = value & 0xFF;
					value = value >>> 8;
				}
			},
			write_data: function (data) {
				// Write
				for (var i = 0, len = data.length; i < len; ++i) {
					this.bounds_check();
					this.buffer[this.pos++] = data[i];
				}
			},
			write_string: function (str) {
				// Write
				for (var i = 0, len = str.length; i < len; ++i) {
					this.bounds_check();
					this.buffer[this.pos++] = str.charCodeAt(i);
				}
			},
		};



		var crc32 = (function () {

			var crc_table = new Uint32Array([ //{
				0x00000000, 0x77073096, 0xEE0E612C, 0x990951BA, 0x076DC419, 0x706AF48F, 0xE963A535, 0x9E6495A3,
				0x0EDB8832, 0x79DCB8A4, 0xE0D5E91E, 0x97D2D988, 0x09B64C2B, 0x7EB17CBD, 0xE7B82D07, 0x90BF1D91,
				0x1DB71064, 0x6AB020F2, 0xF3B97148, 0x84BE41DE, 0x1ADAD47D, 0x6DDDE4EB, 0xF4D4B551, 0x83D385C7,
				0x136C9856, 0x646BA8C0, 0xFD62F97A, 0x8A65C9EC, 0x14015C4F, 0x63066CD9, 0xFA0F3D63, 0x8D080DF5,
				0x3B6E20C8, 0x4C69105E, 0xD56041E4, 0xA2677172, 0x3C03E4D1, 0x4B04D447, 0xD20D85FD, 0xA50AB56B,
				0x35B5A8FA, 0x42B2986C, 0xDBBBC9D6, 0xACBCF940, 0x32D86CE3, 0x45DF5C75, 0xDCD60DCF, 0xABD13D59,
				0x26D930AC, 0x51DE003A, 0xC8D75180, 0xBFD06116, 0x21B4F4B5, 0x56B3C423, 0xCFBA9599, 0xB8BDA50F,
				0x2802B89E, 0x5F058808, 0xC60CD9B2, 0xB10BE924, 0x2F6F7C87, 0x58684C11, 0xC1611DAB, 0xB6662D3D,
				0x76DC4190, 0x01DB7106, 0x98D220BC, 0xEFD5102A, 0x71B18589, 0x06B6B51F, 0x9FBFE4A5, 0xE8B8D433,
				0x7807C9A2, 0x0F00F934, 0x9609A88E, 0xE10E9818, 0x7F6A0DBB, 0x086D3D2D, 0x91646C97, 0xE6635C01,
				0x6B6B51F4, 0x1C6C6162, 0x856530D8, 0xF262004E, 0x6C0695ED, 0x1B01A57B, 0x8208F4C1, 0xF50FC457,
				0x65B0D9C6, 0x12B7E950, 0x8BBEB8EA, 0xFCB9887C, 0x62DD1DDF, 0x15DA2D49, 0x8CD37CF3, 0xFBD44C65,
				0x4DB26158, 0x3AB551CE, 0xA3BC0074, 0xD4BB30E2, 0x4ADFA541, 0x3DD895D7, 0xA4D1C46D, 0xD3D6F4FB,
				0x4369E96A, 0x346ED9FC, 0xAD678846, 0xDA60B8D0, 0x44042D73, 0x33031DE5, 0xAA0A4C5F, 0xDD0D7CC9,
				0x5005713C, 0x270241AA, 0xBE0B1010, 0xC90C2086, 0x5768B525, 0x206F85B3, 0xB966D409, 0xCE61E49F,
				0x5EDEF90E, 0x29D9C998, 0xB0D09822, 0xC7D7A8B4, 0x59B33D17, 0x2EB40D81, 0xB7BD5C3B, 0xC0BA6CAD,
				0xEDB88320, 0x9ABFB3B6, 0x03B6E20C, 0x74B1D29A, 0xEAD54739, 0x9DD277AF, 0x04DB2615, 0x73DC1683,
				0xE3630B12, 0x94643B84, 0x0D6D6A3E, 0x7A6A5AA8, 0xE40ECF0B, 0x9309FF9D, 0x0A00AE27, 0x7D079EB1,
				0xF00F9344, 0x8708A3D2, 0x1E01F268, 0x6906C2FE, 0xF762575D, 0x806567CB, 0x196C3671, 0x6E6B06E7,
				0xFED41B76, 0x89D32BE0, 0x10DA7A5A, 0x67DD4ACC, 0xF9B9DF6F, 0x8EBEEFF9, 0x17B7BE43, 0x60B08ED5,
				0xD6D6A3E8, 0xA1D1937E, 0x38D8C2C4, 0x4FDFF252, 0xD1BB67F1, 0xA6BC5767, 0x3FB506DD, 0x48B2364B,
				0xD80D2BDA, 0xAF0A1B4C, 0x36034AF6, 0x41047A60, 0xDF60EFC3, 0xA867DF55, 0x316E8EEF, 0x4669BE79,
				0xCB61B38C, 0xBC66831A, 0x256FD2A0, 0x5268E236, 0xCC0C7795, 0xBB0B4703, 0x220216B9, 0x5505262F,
				0xC5BA3BBE, 0xB2BD0B28, 0x2BB45A92, 0x5CB36A04, 0xC2D7FFA7, 0xB5D0CF31, 0x2CD99E8B, 0x5BDEAE1D,
				0x9B64C2B0, 0xEC63F226, 0x756AA39C, 0x026D930A, 0x9C0906A9, 0xEB0E363F, 0x72076785, 0x05005713,
				0x95BF4A82, 0xE2B87A14, 0x7BB12BAE, 0x0CB61B38, 0x92D28E9B, 0xE5D5BE0D, 0x7CDCEFB7, 0x0BDBDF21,
				0x86D3D2D4, 0xF1D4E242, 0x68DDB3F8, 0x1FDA836E, 0x81BE16CD, 0xF6B9265B, 0x6FB077E1, 0x18B74777,
				0x88085AE6, 0xFF0F6A70, 0x66063BCA, 0x11010B5C, 0x8F659EFF, 0xF862AE69, 0x616BFFD3, 0x166CCF45,
				0xA00AE278, 0xD70DD2EE, 0x4E048354, 0x3903B3C2, 0xA7672661, 0xD06016F7, 0x4969474D, 0x3E6E77DB,
				0xAED16A4A, 0xD9D65ADC, 0x40DF0B66, 0x37D83BF0, 0xA9BCAE53, 0xDEBB9EC5, 0x47B2CF7F, 0x30B5FFE9,
				0xBDBDF21C, 0xCABAC28A, 0x53B39330, 0x24B4A3A6, 0xBAD03605, 0xCDD70693, 0x54DE5729, 0x23D967BF,
				0xB3667A2E, 0xC4614AB8, 0x5D681B02, 0x2A6F2B94, 0xB40BBE37, 0xC30C8EA1, 0x5A05DF1B, 0x2D02EF8D,
			]); //}

			return function (data) {
				var crc = (0 ^ (-1)),
					data_len = data.length,
					ct = crc_table,
					i;

				for (i = 0; i < data_len; ++i) {
					crc = (crc >>> 8) ^ ct[(crc ^ data[i]) & 0xFF];
				}

				return (crc ^ (-1)) >>> 0;
			};

		})();

		var date_to_ziptime = function (date) {
			return [
				(date.getDate()) | ((date.getMonth() + 1) << 5) | ((date.getFullYear() - 1980) << 9), // Date
				Math.floor(date.getSeconds() / 2) | (date.getMinutes() << 5) | (date.getHours() << 11) // Time
			];
		};

		var array_to_string = function (arr) {
			// Copy
			var str = "",
				len = arr.length,
				chunk_size = 1024,
				i;

			for (i = 0; i < len; i += chunk_size) {
				str += String.fromCharCode.apply(null, arr.subarray(i, i + chunk_size));
			}

			// Decode uft-8
			return decodeURIComponent(escape(str));
		};
		var string_to_array = function (str, max_length) {
			// Encode to uft-8
			str = unescape(encodeURIComponent(str));

			// Copy
			var len = str.length,
				buffer, i;

			if (max_length !== undefined && len > max_length) len = max_length;
			buffer = new Uint8Array(len);

			for (i = 0; i < len; ++i) {
				buffer[i] = str.charCodeAt(i);
			}

			// Done
			return buffer;
		};

		var write_file_header = function (writer, file_data) {
			// Write the file header
			writer.write_ushort(20); // Version
			writer.write_ushort(file_data.utf8 ? ZIP_FLAG_UTF8 : 0); // Flags
			writer.write_ushort(0); // Compression (store)
			writer.write_ushort(file_data.date_zip[1]); // Modified time
			writer.write_ushort(file_data.date_zip[0]); // Modified date
			writer.write_uint(file_data.crc); // CRC32
			writer.write_uint(file_data.data.length); // Compressed size
			writer.write_uint(file_data.data.length); // Unompressed size
			writer.write_ushort(file_data.name_data.length); // Filename length
			writer.write_ushort(file_data.extra_data.length); // Extra length
		};
		var write_central_directory_header = function (writer, file_data) {
			// Write the central directory header
			writer.write_ushort(20); // Version
			writer.write_ushort(20); // Version required
			writer.write_ushort(file_data.utf8 ? ZIP_FLAG_UTF8 : 0); // Flags
			writer.write_ushort(0); // Compression (store)
			writer.write_ushort(file_data.date_zip[1]); // Modified time
			writer.write_ushort(file_data.date_zip[0]); // Modified date
			writer.write_uint(file_data.crc); // CRC32
			writer.write_uint(file_data.data.length); // Compressed size
			writer.write_uint(file_data.data.length); // Unompressed size
			writer.write_ushort(file_data.name_data.length); // Filename length
			writer.write_ushort(file_data.extra_data.length); // Extra length
			writer.write_ushort(file_data.comment_data.length); // Comment length
			writer.write_ushort(0); // Disk number start
			writer.write_ushort(0); // Internal attr
			writer.write_uint(0); // External attr
			writer.write_uint(file_data.offset); // Offset
		};
		var write_footer = function (writer, file_count, pos_cd, pos_footer) {
			// Write file footer
			writer.write_ushort(0); // Disk number
			writer.write_ushort(0); // Disk number with central directory
			writer.write_ushort(file_count); // Disk entries
			writer.write_ushort(file_count); // Total entries
			writer.write_uint(pos_footer - pos_cd); // Central directory size
			writer.write_uint(pos_cd); // Central directory start
			writer.write_ushort(this.comment_data.length); // Comment length
		};

		var arraybuffer_to_blob = function (arraybuffer) {
			return new Blob([ arraybuffer ], { type: "application/zip" });
		};

		var write_to_buffer = function (bw) {
			var total_size = this.calculate_size(),
				file_count = this.files.length,
				pos_cd, pos_footer, i, f;

			// Write file data
			for (i = 0; i < file_count; ++i) {
				f = this.files[i];
				f.prepare(bw.get_pos());

				// Header
				bw.write_data(signatures.file); // Signature
				write_file_header.call(this, bw, f);

				// Data
				bw.write_data(f.name_data); // Name
				bw.write_data(f.extra_data); // Extra
				bw.write_data(f.data); // Data
			}

			// Central directory
			pos_cd = bw.get_pos();
			for (i = 0; i < file_count; ++i) {
				f = this.files[i];

				// Entry
				bw.write_data(signatures.cd); // Signature
				write_central_directory_header.call(this, bw, f);

				// Data
				bw.write_data(f.name_data); // Name
				bw.write_data(f.extra_data); // Extra
				bw.write_data(f.comment_data); // Comment
			}

			// Footer
			pos_footer = bw.get_pos();
			bw.write_data(signatures.footer); // Signature
			write_footer.call(this, bw, file_count, pos_cd, pos_footer);
			bw.write_data(this.comment_data); // Comment
		};



		ZipCreator.array_to_string = array_to_string;
		ZipCreator.string_to_array = string_to_array;
		ZipCreator.arraybuffer_to_blob = arraybuffer_to_blob;



		ZipCreator.prototype = {
			constructor: ZipCreator,

			calculate_size: function () {
				var total_size = 0,
					file_count = this.files.length,
					i, f;

				// Calculate size
				for (i = 0; i < file_count; ++i) {
					f = this.files[i];

					total_size += signatures.file.length + data_sizes.file + f.name_data.length + f.extra_data.length + f.data.length; // Entry
					total_size += signatures.cd.length + data_sizes.cd + f.name_data.length + f.extra_data.length + f.comment_data.length; // Central directory
				}

				// Footer length
				total_size += signatures.footer.length + data_sizes.footer + this.comment_data.length;

				// Done
				return total_size;
			},

			set_date: function (date) {
				this.date = date;
			},
			get_date: function () {
				return this.date;
			},

			set_comment: function (str) {
				this.comment = str;
				this.comment_data = string_to_array(this.comment, max_lengths.comment);
			},
			get_comment: function () {
				return this.comment;
			},

			add_file: function (data, filename) {
				// Create
				var file_data = new FileData(data, filename, "", "", this.date);

				// Add
				this.files.push(file_data);

				// Done
				return this.files.length - 1;
			},
			remove_file: function (index) {
				this.files.splice(index, 1);
			},

			get_file_count: function () {
				return this.files.length;
			},

			get_file_data: function (index) {
				return this.files[index].data;
			},
			set_file_data: function (index, data) {
				this.files[index].set_data(data);
			},

			get_file_name: function (index) {
				return this.files[index].name;
			},
			set_file_name: function (index, name) {
				this.files[index].set_name(name);
			},

			get_file_extra: function (index) {
				return this.files[index].extra;
			},
			set_file_extra: function (index, extra) {
				this.files[index].set_extra(extra);
			},

			get_file_comment: function (index) {
				return this.files[index].comment;
			},
			set_file_comment: function (index, comment) {
				this.files[index].set_comment(comment);
			},

			get_file_date: function (index) {
				return this.files[index].date;
			},
			set_file_date: function (index, date) {
				this.files[index].set_date(date);
			},

			to_buffer: function (segment_length) {
				var total_size = this.calculate_size(),
					bw = (segment_length === undefined) ?
					new BufferWriter(new Uint8Array(total_size)) :
					new MultiBufferWriter(total_size, segment_length);

				write_to_buffer.call(this, bw);

				return bw.buffers;
			},
			to_blob: function () {
				var file_count = this.files.length,
					data_array = [],
					bw = new BufferWriter(),
					pos = 0,
					pos_cd, i, f;

				// Write file data
				for (i = 0; i < file_count; ++i) {
					f = this.files[i];
					f.prepare(pos);

					// Header
					bw.reset(new Uint8Array(data_sizes.file));
					write_file_header.call(this, bw, f);

					data_array.push(signatures.file); // Signature
					data_array.push(bw.buffer);

					// Data
					data_array.push(f.name_data); // Name
					data_array.push(f.extra_data); // Extra
					data_array.push(f.data); // Data

					// Pos update
					pos += signatures.file.length + bw.buffer.length + f.name_data.length + f.extra_data.length + f.data.length;
				}

				// Central directory
				pos_cd = pos;
				for (i = 0; i < file_count; ++i) {
					f = this.files[i];


					// Header
					bw.reset(new Uint8Array(data_sizes.cd));
					write_central_directory_header.call(this, bw, f);

					data_array.push(signatures.cd); // Signature
					data_array.push(bw.buffer);

					// Data
					data_array.push(f.name_data); // Name
					data_array.push(f.extra_data); // Extra
					data_array.push(f.comment_data); // Comment

					// Pos update
					pos += signatures.cd.length + bw.buffer.length + f.name_data.length + f.extra_data.length + f.comment_data.length;
				}

				// Footer
				bw.reset(new Uint8Array(data_sizes.footer));
				write_footer.call(this, bw, file_count, pos_cd, pos);

				data_array.push(signatures.footer); // Signature
				data_array.push(bw.buffer);
				data_array.push(this.comment_data); // Comment

				// Create as a blob
				return new Blob(data_array, { type: "application/zip" });
			},
		};



		return ZipCreator;

	})();

	// Saving settings
	var Save = (function () {

		// Storage type
		var using_gmstorage = false,
			chrome_storage = null,
			mode = "userscript",
			modes = [ "userscript" , "local" , "session" , "temp" ],
			temp_storage = {},
			set_mode_functions, object_byte_size, create_generic_save, save;



		// Session/site saving
		object_byte_size = function (obj) {
			try {
				// Encode as a JSON object
				obj = JSON.stringify(obj);
			}
			catch (e) {
				// Invalid
				return 0;
			}

			try {
				// Encode in utf-8
				return unescape(encodeURIComponent(obj)).length;
			}
			catch (e) {}

			return obj.length;
		};

		// Generic save
		create_generic_save = function (obj, object_byte_size) {
			// Create
			return {
				get: function (key, callback) {
					// Get value
					var val = obj.getItem(key, undefined);
					try {
						val = JSON.parse(val);
					}
					catch (e) {}
					callback.call(null, val, true);
				},
				set: function (key, value, callback) {
					// Set value
					var okay = true;
					try {
						obj.setItem(key, JSON.stringify(value));
					}
					catch (e) {
						okay = false;
					}
					if (callback) callback.call(null, okay);
				},
				del: function (key, callback) {
					// Remove
					obj.removeItem(key);
					if (callback) callback.call(null, true);
				},
				keys: function (callback) {
					// List keys
					var keys = [],
						i;

					for (i = 0; i < obj.length; ++i) {
						keys.push(obj.key(i));
					}

					callback.call(null, keys, true);
				},
				size: function (callback) {
					var size = 0,
						key, i;

					// Count bytes (this may be approximate)
					for (i = 0; i < obj.length; ++i) {
						key = obj.key(i);
						size += object_byte_size(key) + ((obj.getItem(key, null) || "").length || 0);
					}

					// Return
					callback.call(null, size, true);
				},
				clear: function (callback) {
					// Remove items
					obj.clear();

					if (callback) callback.call(null, true);
				},
			};
		};

		// Copy functions
		set_mode_functions = function (new_mode) {
			// Copy
			var fns = save[new_mode];

			save.get = fns.get;
			save.set = fns.set;
			save.del = fns.del;
			save.keys = fns.keys;
			save.size = fns.size;
			save.clear = fns.clear;

			// Update
			mode = new_mode;
		};



		// Local storage save
		save = {
			get: null,
			set: null,
			del: null,
			keys: null,
			size: null,
			clear: null,

			local: create_generic_save(window.localStorage, object_byte_size),
			session: create_generic_save(window.sessionStorage, object_byte_size),
			userscript: null,
			temp: {
				get: function (key, callback) {
					// Get value
					var val = temp_storage[key];
					try {
						val = JSON.parse(val);
					}
					catch (e) {}
					callback.call(null, val, true);
				},
				set: function (key, value, callback) {
					// Set value
					temp_storage[key] = JSON.stringify(value);
					if (callback) callback.call(null, true);
				},
				del: function (key, callback) {
					// Remove
					delete temp_storage[key];
					if (callback) callback.call(null, true);
				},
				keys: function (callback) {
					// List keys
					var keys = [],
						k;

					for (k in temp_storage) {
						keys.push(k);
					}

					callback.call(null, keys, true);
				},
				size: function (callback) {
					// Get size
					var size = object_byte_size(temp_storage);
					callback.call(null, size, true);
				},
				clear: function (callback) {
					// Clear
					temp_storage = {};
					if (callback) callback.call(null, true);
				},
			},

			set_mode: function (new_mode) {
				var i = modes.indexOf(new_mode);
				if (i < 0) i = 0;

				while (save[modes[i]] === null) ++i;

				set_mode_functions(modes[i]);

				return mode;
			},
			get_mode: function () {
				return mode;
			},
		};
		create_generic_save = null;



		// Check for chrome storage
		try {
			chrome_storage = chrome.storage.local || null;
		}
		catch (e) {}

		// Check for GM storage
		try {
			if (GM_setValue && GM_getValue && GM_deleteValue && GM_listValues) {
				using_gmstorage = true;
			}
		}
		catch (e) {}



		// Userscript storage method
		if (chrome_storage !== null) {
			// Chrome storage
			save.userscript = {
				get: function (key, callback) {
					chrome_storage.get(key, function (value) {
						// Final callback
						callback.call(null, value[key], true);
					});
				},
				set: function (key, value, callback) {
					var obj = {};
					obj[key] = value;

					chrome_storage.set(obj, callback ? function () {
						// Final callback
						callback.call(null, true);
					} : undefined);
				},
				del: function (key, callback) {
					chrome_storage.remove(key, callback ? function () {
						// Final callback
						callback.call(null, true);
					} : undefined);
				},
				keys: function (callback) {
					chrome_storage.get(null, function (obj) {
						// Get keys
						var keys = [],
							key;

						for (key in obj) {
							keys.push(key);
						}

						// Final callback
						callback.call(null, keys, true);
					});
				},
				size: function (callback) {
					chrome_storage.getBytesInUse(null, function (bytes_used) {
						// Final callback
						callback.call(null, bytes_used, true);
					});
				},
				clear: function (callback) {
					chrome_storage.clear(callback ? function () {
						// Final callback
						callback.call(null, true);
					} : undefined);
				},
			};
		}
		else if (using_gmstorage) {
			// GM storage
			save.userscript = {
				get: function (key, callback) {
					// Get value
					var val = GM_getValue(key, undefined); // jshint ignore:line
					try {
						val = JSON.parse(val);
					}
					catch (e) {}
					callback.call(null, val, true);
				},
				set: function (key, value, callback) {
					// Set value
					var okay = true;
					try {
						GM_setValue(key, JSON.stringify(value)); // jshint ignore:line
					}
					catch (e) {
						okay = false;
					}
					if (callback) callback.call(null, okay);
				},
				del: function (key, callback) {
					// Remove
					GM_deleteValue(key); // jshint ignore:line
					if (callback) callback.call(null, true);
				},
				keys: function (callback) {
					// List keys
					var keys = GM_listValues(); // jshint ignore:line
					callback.call(null, keys, true);
				},
				size: function (callback) {
					var keys = GM_listValues(), // jshint ignore:line
						size = 0,
						i;

					// Create representation
					for (i = 0; i < keys.length; ++i) {
						size += object_byte_size(keys[i]) + ((GM_getValue(keys[i], null) || "").length || 0); // jshint ignore:line
					}

					// Return
					callback.call(null, size, true);
				},
				clear: function (callback) {
					var keys = GM_listValues(), // jshint ignore:line
						i;

					// Create representation
					for (i = 0; i < keys.length; ++i) {
						GM_deleteValue(keys[i]); // jshint ignore:line
					}

					// Return
					callback.call(null, true);
				},
			};
		}



		// Expose functions
		save.set_mode(mode);
		return save;

	})();

	// Cookies
	var Cookies = (function () {

		var invalid_cookies = [ "expires" , "max-age" , "path" , "domain" , "secure" ];

		return {

			get_all: function (cookie_str) {
				var cookie_parts = cookie_str.split(";"),
					cookies = {},
					re_pattern = /^\s*([^=]*)=(.*)$/,
					i, m;

				for (i = 0; i < cookie_parts.length; ++i) {
					if ((m = re_pattern.exec(cookie_parts[i]))) {
						cookies[m[1]] = m[2];
					}
				}

				return cookies;
			},
			set: function (key, value, expire_date, path, domain, secure) {
				// Invalid
				if (invalid_cookies.indexOf(key) >= 0) return false;

				// Set
				var cookie_str = encodeURIComponent(key) + "=" + encodeURIComponent(value);

				// Expire
				if (expire_date) {
					if (typeof(expire_date) !== "string") {
						expire_date = expire_date.toUTCString();
					}
					cookie_str += "; expires=" + expire_date;
				}

				// Domain
				if (domain) {
					cookie_str += "; domain=" + domain;
				}

				// Path
				if (path) {
					cookie_str += "; path=" + path;
				}

				// Secure
				if (secure) {
					cookie_str += "; secure";
				}

				// Set
				document.cookie = cookie_str;
				return true;
			},
			remove: function (key, path, domain) {
				// Remove a cookie
				this.set(key, "", new Date(0), path, domain);
			},

		};

	})();

	// Ajax
	var Ajax = (function () {

		// Detect greasemonkey
		var can_use_gm = false;

		try {
			if (GM_xmlhttpRequest) {
				can_use_gm = true;
			}
		}
		catch (e) {}



		// GM data parsers
		var response_parsers = {
			json: function (text) {
				try {
					return JSON.parse(text);
				}
				catch (e) {
					return null;
				}
			},
			document: function (text) {
				try {
					var parser = new DOMParser(),
						doc = parser.parseFromString(text, "text/html");

					return doc;
				}
				catch (e) {
					return null;
				}
			},
			arraybuffer: function (text) {
				var array = new Uint8Array(text.length),
					text_len = text.length,
					i = 0;

				for (; i < text_len; ++i) {
					array[i] = text.charCodeAt(i);
				}

				return array;
			},
		};

		var header_string_parse = function (header_str) {
			var lines = header_str.split("\r\n"),
				re_line = /^([^:]*):\s(.*)$/i,
				headers = {},
				i, m;

			for (i = 0; i < lines.length; ++i) {
				if ((m = re_line.exec(lines[i]))) {
					headers[m[1]] = m[2];
				}
			}

			return headers;
		};

		var complete_extra = function (extra, response_headers) {
			extra.response_headers = (response_headers === null) ? {} : header_string_parse(response_headers);
		};


		// Main function
		/**
			settings can be an object including:
				use_gm:
					Use the Greasemonkey xmlhttprequest version
				response_type:
					One of [ "text" , "json" , "arraybuffer" , "document" ]
				headers:
					An object of headers
		*/
		var Ajax = function (method, url, data, options, on_load, on_error, on_complete, on_progress) {
			var extra, xhr_data, xhr, parser, okay, v;
			extra = {
				url: url,
				response_headers: null,
			};

			// Values
			on_load = on_load || null;
			on_error = on_error || null;
			on_complete = on_complete || null;
			on_progress = on_progress || null;

			// Run
			if (options && options.use_gm && can_use_gm) {
				// Setup xhr args
				xhr_data = {
					method: method,
					url: url,
				};
				parser = null;

				// Setup
				if ("response_type" in options) {
					v = options.response_type;

					if (v in response_parsers) {
						parser = response_parsers[v];
					}
					if (v == "arraybuffer") {
						xhr_data.overrideMimeType = "text/plain; charset=x-user-defined";
					}
				}
				if ("headers" in options) {
					xhr_data.headers = options.headers;
				}

				// Events
				if (on_load !== null || on_complete !== null) {
					xhr_data.onload = function (response) {
						// Complete extra
						complete_extra(extra, response.responseHeaders);

						// Process response
						var res_data = response.responseText;
						if (parser !== null) res_data = parser.call(null, res_data);

						// Events
						if (on_load !== null) on_load.call(null, res_data, response.status, response.statusText, extra);
						if (on_complete !== null) on_complete.call(null, true, extra);
					};
				}
				if (on_error !== null || on_complete !== null) {
					xhr_data.onerror = function () {
						// Complete extra
						complete_extra(extra, null);

						// Events
						if (on_error !== null) on_error.call(null, "error", extra);
						if (on_complete !== null) on_complete.call(null, false, extra);
					};
					xhr_data.onabort = function () {
						// Complete extra
						complete_extra(extra, null);

						// Events
						if (on_error !== null) on_error.call(null, "abort", extra);
						if (on_complete !== null) on_complete.call(null, false, extra);
					};
				}
				if (on_progress !== null) {
					xhr_data.onprogress = function (event) {
						// Compute progress
						var perc, total;
						if (event.lengthComputable) {
							perc = event.loaded / event.total;
							total = event.total;
						}
						else {
							perc = 0.0;
							total = null;
						}

						// Event
						if (on_progress !== null) on_progress.call(null, perc, event.loaded, total, extra);
					};
				}


				// Send
				if (data !== null) xhr_data.data = data;
				/*<debug>*/debug_log("GM_xmlhttpRequest", xhr_data);/*</debug>*/
				xhr = GM_xmlhttpRequest(xhr_data); // jshint ignore:line
			}
			else {
				// Create XHR
				xhr = new XMLHttpRequest();
				okay = false;

				// Open
				xhr.open(method, url, true);

				// Setup
				if (options) {
					if ("response_type" in options) {
						v = options.response_type;

						xhr.responseType = v;
						if (v == "arraybuffer") {
							xhr.overrideMimeType("text/plain; charset=x-user-defined");
						}
					}
					if ("headers" in options) {
						for (v in options.headers) {
							xhr.setRequestHeader(v, options.headers[v]);
						}
					}
				}

				// Events
				if (on_load !== null) {
					xhr.addEventListener("load", function () {
						// Complete extra
						complete_extra(extra, xhr.getAllResponseHeaders());

						// Event
						okay = true;
						if (on_load !== null) on_load.call(null, xhr.response, xhr.status, xhr.statusText, extra);
					}, false);
				}
				if (on_error !== null) {
					xhr.addEventListener("error", function () {
						// Complete extra
						complete_extra(extra, null);

						// Event
						if (on_error !== null) on_error.call(null, "error", extra);
					}, false);
					xhr.addEventListener("abort", function () {
						// Complete extra
						complete_extra(extra, null);

						// Event
						if (on_error !== null) on_error.call(null, "abort", extra);
					}, false);
				}
				if (on_complete !== null) {
					xhr.addEventListener("loadend", function () {
						// Event
						if (on_complete !== null) on_complete.call(null, okay, extra);
					}, false);
				}
				if (on_progress !== null) {
					xhr.addEventListener("progress", function (event) {
						// Compute progress
						var perc, total;
						if (event.lengthComputable) {
							perc = event.loaded / event.total;
							total = event.total;
						}
						else {
							perc = 0.0;
							total = null;
						}

						// Event
						if (on_progress !== null) on_progress.call(null, perc, event.loaded, total, extra);
					}, false);
				}

				// Send
				if (data === null) {
					/*<debug>*/debug_log("XMLHttpRequest", method, url, xhr);/*</debug>*/
					xhr.send();
				}
				else {
					/*<debug>*/debug_log("XMLHttpRequest", method, url, xhr, data);/*</debug>*/
					xhr.send(data);
				}
			}

			// Done
			this.abort = function () {
				if (xhr !== null) {
					// Complete extra
					complete_extra(extra, null);

					// Events
					if (on_error !== null) {
						on_error.call(null, "abort", extra);
						on_error = null;
					}
					if (on_complete !== null) {
						on_complete.call(null, false, extra);
						on_complete = null;
					}
					on_load = null;
					on_progress = null;

					// Abort
					var x = xhr;
					xhr = null;
					try {
						x.abort();
					}
					catch (e) {
						// This happens using GM_xhr on FF36 due to some privilege crap
					}
				}
			};
		};



		// Done
		return Ajax;

	})();

	// CSS formatting
	var CSS = (function () {

		var formatters = {
			color: function (val, alpha) {
				alpha = (alpha === undefined) ? val[3] : parseFloat(alpha);

				if (alpha < 1) {
					if (alpha < 0) alpha = 0;

					// RGBA color
					return "rgba(" + val[0] + "," + val[1] + "," + val[2] + "," + alpha.toFixed(4) + ")";
				}
				else {
					// Hex color
					var rgb = "#",
						i, c;

					for (i = 0; i < 3; ++i) {
						c = val[i].toString(16);
						if (c.length < 2) c = "0" + c;
						rgb += c;
					}

					return rgb;
				}
			}
		};



		return {

			color: function (str) {
				var c = [ 0 , 0 , 0 , 1 ],
					m;

				if ((m = /^#([0-9a-f]{6})$/i.exec(str))) {
					m = m[1];
					c[0] = parseInt(m.substr(0, 2), 16);
					c[1] = parseInt(m.substr(2, 2), 16);
					c[2] = parseInt(m.substr(4, 2), 16);
				}
				else if ((m = /^#([0-9a-f]{3})$/i.exec(str))) {
					m = m[1];
					c[0] = parseInt(m[0] + m[0], 16);
					c[1] = parseInt(m[1] + m[1], 16);
					c[2] = parseInt(m[2] + m[2], 16);
				}
				else if ((m = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i.exec(str))) {
					c[0] = parseInt(m[1], 10);
					c[1] = parseInt(m[2], 10);
					c[2] = parseInt(m[3], 10);
				}
				else if ((m = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\,\s*([\d\.]+)\s*\)$/i.exec(str))) {
					c[0] = parseInt(m[1], 10);
					c[1] = parseInt(m[2], 10);
					c[2] = parseInt(m[3], 10);
					c[3] = parseFloat(m[4]);
					if (isNaN(c[3]) || c[3] > 1) {
						c[3] = 1;
					}
					else if (c[3] < 0) {
						c[3] = 0;
					}
				}

				return c;
			},
			format: function (str, vars) {
				str = str.replace(/\{\{(?:([^\}:]*?):)?([^\}]*?)\}\}/g, function (full, label, key) {
					var args = key.split(",");
					key = args[0];

					if (key in vars) {
						args[0] = vars[key];

						if (label) {
							if (label in formatters) {
								return formatters[label].apply(null, args);
							}
						}
						else {
							return args[0];
						}
					}
					return "";
				});

				return str;
			},

			computed: function (node, style) {
				return window.getComputedStyle(node).getPropertyValue(style);
			},

		};

	})();

	// Page geometry
	var Geometry = (function () {

		return {
			get_window_rect: function () {
				var doc = document.documentElement,
					left = (window.pageXOffset || doc.scrollLeft || 0) - (doc.clientLeft || 0),
					top = (window.pageYOffset || doc.scrollTop || 0)  - (doc.clientTop || 0),
					width = (doc.clientWidth || window.innerWidth || 0),
					height = (doc.clientHeight || window.innerHeight || 0);

				return {
					left: left,
					top: top,
					right: left + width,
					bottom: top + height,
					width: width,
					height: height,
				};
			},
			get_object_rect: function (obj) {
				var bounds = obj.getBoundingClientRect(),
					doc = document.documentElement,
					left = (window.pageXOffset || doc.scrollLeft || 0) - (doc.clientLeft || 0),
					top = (window.pageYOffset || doc.scrollTop || 0)  - (doc.clientTop || 0);

				return {
					left: left + bounds.left,
					top: top + bounds.top,
					right: left + bounds.right,
					bottom: top + bounds.bottom,
					width: bounds.width,
					height: bounds.height,
				};
			},
		};

	})();

	// Node creation functions
	var $ = (function () {

		var typeof_str = typeof(""),
			typeof_object = typeof({});



		var $ = function (tag) {
			var arg_count = arguments.length,
				node = document.createElement(tag),
				i = 1,
				a, j, k, t;

			// Done
			if (i >= arg_count) return node;

			// Classname
			t = typeof(a = arguments[i]);
			if (t == typeof_str) {
				// Use
				node.className = a;

				// Next
				if (++i >= arg_count) return node;
				t = typeof(a = arguments[i]);
			}

			// Children, attributes, text, custom
			while (true) {
				if (t == typeof_object) {
					// Children or attributes
					if (Array.isArray(a)) {
						// Children
						for (j = 0; j < a.length; ++j) {
							if (a[j] !== null) {
								node.appendChild(a[j]);
							}
						}
					}
					else if (a !== null) {
						// Attributes
						for (k in a) {
							node.setAttribute(k, a[k]);
						}
					}
				}
				else if (t == typeof_str) {
					// Text
					node.appendChild(document.createTextNode(a));
				}
				else {
					// Number
					if (a == $.PARENT) {
						// Parent
						arguments[++i].appendChild(node);
					}
					else if (a == $.BEFORE) {
						// Insert before a node
						a = arguments[++i];
						k = a.parentNode;
						if (k !== null) {
							k.insertBefore(node, a);
						}
					}
					else if (a == $.AFTER) {
						// Insert after a node
						a = arguments[++i];
						k = a.parentNode;
						if (k !== null) {
							a = a.nextSibling;
							if (a !== null) {
								k.insertBefore(node, a);
							}
							else {
								k.appendChild(node);
							}
						}
					}
					else if (a == $.EVENT) {
						// Event
						a = arguments[++i];
						k = a[1]; // function
						if (a.length >= 4) {
							// Bind
							k = bind_event_listener(node, k, a[3]);
						}
						node.addEventListener(a[0], k, a[2] || false);
					}
					else if (a == $.TEXT) {
						// Text
						node.appendChild(document.createTextNode(arguments[++i]));
					}
					else if (a == $.CHECKED) {
						// Checked
						node.checked = !!arguments[++i];
					}
				}

				// Next
				if (++i >= arg_count) return node;
				t = typeof(a = arguments[i]);
			}
		};



		$.A = $.AFTER = 1;
		$.B = $.BEFORE = 2;
		$.P = $.PARENT = 3;
		$.ON = $.EVENT = 4;
		$.T = $.TEXT = 5;
		$.CHECKED = 6;
		$.node = {};



		$.text = function (str) {
			return document.createTextNode(str || "");
		};



		var bind_event_listener = function (node, callback, args) {
			// Bind
			if (args.length > 0) {
				var self_arg = $.node,
					new_args = [],
					self, a, i;

				// Form new array
				a = args[0];
				self = (a === self_arg) ? node : a;

				for (i = 1; i < args.length; ++i) {
					a = args[i];
					new_args.push((a === self_arg) ? node : a);
				}

				args = null;
				self_arg = null;
				a = null;

				// Return new callback
				return function () {
					var full_args = Array.prototype.slice.call(new_args);
					Array.prototype.push.apply(full_args, arguments);

					return callback.apply(self, full_args);
				};
			}
			else {
				// No change
				return callback;
			}
		};



		return $;
	})();

	// Callback binding function
	var bind = function (callback, self) {
		if (arguments.length > 2) {
			var slice = Array.prototype.slice,
				push = Array.prototype.push,
				args = slice.call(arguments, 2);

			return function () {
				var full_args = slice.call(args);
				push.apply(full_args, arguments);

				return callback.apply(self, full_args);
			}._w();
		}
		else {
			return function () {
				return callback.apply(self, arguments);
			}._w();
		}
	};

	// Event listeners
	var add_event_listener = function (list, node, event, callback, capture) {
		node.addEventListener(event, callback, capture);
		list.push([node, event, callback, capture]);
	};
	var remove_event_listeners = function (list) {
		var list_len = list.length,
			i = 0,
			li;

		for (; i < list_len; ++i) {
			li = list[i];
			li[0].removeEventListener(li[1], li[2], li[3]);
		}
	};

	// setTimeout with a progress callback
	var set_timeout = (function () {

		var perf = window.performance,
			now = performance.now || performance.mozNow || performance.msNow || performance.oNow || performance.webkitNow,
			time_now = (perf && now) ?
				function () {
					return now.call(perf);
				} :
				function () {
					return new Date().getTime();
				};

		return function (callback, time, progress, progress_time) {
			var start = time_now(),
				timer = setTimeout(function () {
					if (progress !== null) {
						clearInterval(interval);
						progress.call(null, 1.0);
					}
					callback.call(null);
					timer = null;
				}, time),
				interval = 0;

			if (progress) {
				interval = setInterval(function () {
					var diff = time_now() - start;
					if (diff > time) diff = time;
					progress.call(null, diff / time, diff);
				}, progress_time);
			}
			else {
				progress = null;
			}

			return function () {
				if (timer !== null) {
					clearTimeout(timer);
					if (progress !== null) clearInterval(interval);
					timer = null;
					return true;
				}
				return false;
			};
		};

	})();

	// Url parsing
	var URLParts = (function () {

		var URLParts = function (url_str) {
			var m, url_part;

			this.hash = "";
			this.host = null;
			this.hostname = null;
			this.pathname = "";
			this.protocol = null;
			this.search = "";
			this.slashes = false;
			this.auth = null;
			this.port = null;

			if ((m = /^[a-z][a-z0-9\+\-\.]*:/i.exec(url_str)) !== null) {
				this.protocol = m[0].toLowerCase();
				url_str = url_str.substr(m[0].length);
			}

			if ((m = /^\/{2}/.exec(url_str)) !== null) {
				this.slashes = true;
				url_str = url_str.substr(m[0].length);

				m = /([\/\?\#]|$)/.exec(url_str);
				url_part = url_str.substr(0, m.index);
				url_str = url_str.substr(m.index);

				if ((m = /^(.*)@/i.exec(url_part)) !== null) {
					this.auth = m[1];
					url_part = url_part.substr(m[0].length);
				}

				if ((m = /:(\d*)$/i.exec(url_part)) !== null) {
					this.port = parseInt(m[1], 10);
					url_part = url_part.substr(0, m.index);
				}

				url_part = url_part.toLowerCase();
				this.hostname = url_part;
				this.host = url_part;
				if (this.port !== null) this.host += ":" + this.port;
			}

			m = /([\?\#]|$)/.exec(url_str);
			this.pathname = url_str.substr(0, m.index);
			if (this.pathname.length === 0 && this.slashes) this.pathname = "/";
			url_str = url_str.substr(m.index);

			m = /([\#]|$)/.exec(url_str);
			this.search = url_str.substr(0, m.index);
			url_str = url_str.substr(m.index);

			this.hash = url_str;
		};

		URLParts.prototype = {
			constructor: URLParts,

			join: function () {
				var url_str = "";

				if (this.protocol !== null) url_str += this.protocol;

				if (this.slashes) {
					url_str += "//";
					if (this.auth !== null) url_str += this.auth + "@";
					url_str += this.hostname;
					if (this.port !== null) url_str += ":" + this.port;
				}

				url_str += this.pathname;
				url_str += this.search;
				url_str += this.hash;

				return url_str;
			},
		};

		return URLParts;

	})();

	// Generic event functions
	var Events = (function () {

		return {
			on: function (valid_events) {
				if (valid_events) {
					// Lite mode
					return function (event, callback) {
						if (this.events === null) this.events = {};

						if (event in this.events) {
							this.events[event].push(callback);
						}
						else {
							if (!(event in valid_events)) return false;
							this.events[event] = [ callback ];
						}

						return true;
					};
				}
				else {
					// Normal mode
					return function (event, callback) {
						if (this.events !== null && event in this.events) {
							this.events[event].push(callback);
							return true;
						}

						return false;
					};
				}
			},
			off: function () {
				return function (event, callback) {
					if (this.events !== null && event in this.events) {
						for (var i = 0, list = this.events[event]; i < list.length; ++i) {
							if (list[i] === callback) {
								list.splice(i, 1);
								return true;
							}
						}
					}
					return false;
				};
			},
			trigger: function () {
				return function (event, data) {
					if (this.events !== null && event in this.events) {
						for (var i = 0, list = this.events[event]; i < list.length; ++i) {
							list[i].call(null, data, event);
						}
					}
				};
			},
		};

	})();



	// Site specific classes/modules
	// API
	var API = (function () {

		var size_label_to_bytes = function (number, label) {
			var i = [ "b" , "kb" , "mb" , "gb" ].indexOf(label.toLowerCase());
			if (i < 0) i = 0;

			return Math.floor(parseFloat(number) * Math.pow(1024, i));
		};

		var create_blank_gallery_data = function () {
			return {
				gallery: {
					gid: 0,
					token: "",
				},
				title: "",
				title_original: "",
				date_uploaded: 0,
				category: "",
				uploader: "",
				rating: {
					average: 0,
					count: 0,
				},
				favorites: {
					category: -1,
					category_title: null,
					count: 0,
				},
				parent: null,
				newer_versions: [],
				thumbnail: "",
				thumbnail_size: "normal",
				thumbnail_rows: 0,
				image_count: 0,
				images_resized: false,
				total_file_size_approx: 0,
				visible: true,
				visible_reason: "",
				language: "",
				translated: false,
				tags: {},
			};
		};
		var create_blank_gallery_stub = function () {
			return {
				gallery: {
					gid: 0,
					token: "",
				},
				title: "",
				date_uploaded: null,
				category: "",
				uploader: null,
				favorites: {
					category: -1,
					category_title: null,
				},
				file_count: null,
				thumbnail: "",
			};
		};
		var create_blank_gallery_image_data = function () {
			return {
				url: "",
				filename: "",
				thumbnail: "",
				width: 0,
				height: 0,
				x_offset: 0,
				y_offset: 0,
				height_required: 0,
				index: 0,
				page: 0,
			};
		};
		var create_blank_image_data = function () {
			return {
				page: 0,
				page_count: 0,
				gallery: {
					gid: 0,
					token: "",
					title: "",
					page: 0,
				},
				image: {
					filename: "",
					url: "",
					width: 0,
					height: 0,
					size_approx: 0,
				},
				image_original: null,
				navigation: {
					api_key: null,
					key_current: null,
					key_next: null,
					key_previous: null,
					key_first: null,
					key_last: null,
					direct_id: null,
				},
			};
		};

		var set_inner_html_no_loading = function (node, inner_html) {
			// Don't allow the creation of <img> tags, as they will try to load immediately
			inner_html = inner_html.replace(/<img /ig, '<input data-eze-tag="img" ');
			node.innerHTML = inner_html;
		};

		var api_site = (window.location.hostname == "exhentai.org") ? "exhentai" : "e-hentai";

		var get_direct_id = function (str) {
			var m = /return\s+nl\s*\(\s*['"]([^']*)['"]\s*\)/.exec(str);
			return (m === null ? null : m[1]);
		};



		var API = {

			OK: 0,
			ERROR_REQUEST: 1,
			ERROR_REQUEST_STATUS: 2,
			ERROR_PARSING: 3,

			inject_script: function (fn) {
				var par = document.body || document.documentElement.querySelector("head") || document.documentElement || null,
					node;

				if (!par) return false;

				node = document.createElement("script");
				node.textContent = "(" + fn.toString() + ")();";

				par.appendChild(node);
				par.removeChild(node);

				return true;
			},
			inject_style: function (content) {
				var par = document.documentElement.querySelector("head") || document.documentElement || document.body || null,
					node;

				if (!par) return null;

				node = document.createElement("style");
				node.textContent = content;

				par.appendChild(node);

				return node;
			},

			request_api: function (data, on_load, on_error, on_complete, on_progress) {
				return new Ajax(
					"POST",
					"/api.php",
					(data === null ? null : JSON.stringify(data)),
					{
						headers: {
							"Content-Type": "application/json",
						},
						response_type: "json"
					},
					on_load,
					on_error,
					on_complete,
					on_progress
				);
			},
			request_data: function (url, on_load, on_error, on_complete, on_progress) {
				return new Ajax(
					"GET",
					url,
					null,
					{
						use_gm: true,
						response_type: "arraybuffer"
					},
					on_load,
					on_error,
					on_complete,
					on_progress
				);
			},
			request_document: function (url, on_load, on_error, on_complete, on_progress, params) {
				var use_gm = false;

				if (params) {
					if ("use_gm" in params) use_gm = !!params.use_gm;
				}

				return new Ajax(
					"GET",
					url,
					null,
					{
						use_gm: use_gm,
						response_type: "document"
					},
					on_load,
					on_error,
					on_complete,
					on_progress
				);
			},

			get_gallery_url_info: function (url) {
				// URL matcher
				var match = /^.*?\/\/.+?\/(.*?)(\?.*?)?(#.*?)?$/.exec(url);
				if (match) {
					// Return data
					var data = {
						gid: 0,
						token: "",
						page: 0,
					};


					// Get
					var path = match[1].replace(/^\/+|\/+$/g, "").replace(/\/{2,}/g, "/").split("/");
					if (path[0] === "g") {
						if (path.length < 3) return null;

						// Good
						data.gid = parseInt(path[1], 10);
						data.token = path[2];

						// Page
						if (match[2]) {
							if ((match = /[\?\&]p=(\d+)/.exec(match[2]))) {
								data.page = parseInt(match[1], 10);
							}
						}
					}
					/*else if (path[0] === "s") {
						if (path.length < 3) return null;

						data.token = path[1];
						data.gid = parseInt(path[2].split("-")[0], 10);
					}*/
					else {
						return null;
					}

					// Done
					return data;
				}

				// Nothing
				return null;
			},
			get_gallery_image_url_info: function (url) {
				// URL matcher
				var match = /^.*?\/\/.+?\/(.*?)(\?.*?)?(#.*?)?$/.exec(url);
				if (match) {
					// Return data
					var data = {
						gid: 0,
						key: "",
						page: 0,
					};

					// Get
					var path = match[1].replace(/^\/+|\/+$/g, "").replace(/\/{2,}/g, "/").split("/");
					if (path[0] != "s") return null; // invalid

					if (path.length >= 3) {
						// Good
						match = /(\d+)-(\d+)/.exec(path[2]);
						if (match) {
							data.gid = parseInt(match[1], 10);
							data.page = parseInt(match[2], 10) - 1;
							data.key = path[1];
						}
					}


					// Done
					return data;
				}

				// Nothing
				return null;
			},
			get_gallery_title_info: function (title) {
				var re_tag_pre_pattern = /^\s*(\(([^\)]*?)\)|\[([^\]]*?)\]|\{([^\}]*?)\})\s*/i,
					re_tag_post_pattern = /\s*(\(([^\)]*?)\)|\[([^\]]*?)\]|\{([^\}]*?)\})\s*$/i,
					title_split, m, i,
					info = {
						title: "",
						title_alt: null,
						tags: {
							before: [],
							after: [],
						},
					};

				// Tags
				while ((m = re_tag_pre_pattern.exec(title))) {
					title = title.substr(m.index + m[0].length);
					info.tags.before.push({
						type: m[1][0],
						value: m[2] || m[3] || "",
					});
				}
				while ((m = re_tag_post_pattern.exec(title))) {
					title = title.substr(0, m.index);
					info.tags.after.push({
						type: m[1][0],
						value: m[2] || m[3] || "",
					});
				}

				// Double name?
				title_split = title.split("|");
				if (title_split.length > 1) {
					i = title_split.length - Math.floor(title_split.length / 2);

					info.title_alt = title_split.slice(0, i).join("|").trim();
					info.title = title_split.slice(i).join("|").trim();
				}
				else {
					info.title = title;
				}

				// Done
				return info;
			},

			get_pages_info_from_html: function (html) {
				// Detect page groups
				var pages_container = html.querySelector(".ptt"),
					i, m, n, nodes,
					page_info = {
						current: 0,
						count: 0,
						items_on_page: 0,
						items_per_page: 0,
						items_total: 0,
					};

				// Not found
				if (pages_container === null) {
					// Image viewing
					if ((n = html.querySelectorAll(".sn>div>span")).length >= 2) {
						page_info.current = (parseInt(n[0].textContent.trim(), 10) || 1) - 1;
						page_info.count = parseInt(n[1].textContent.trim(), 10) || 0;
						page_info.items_on_page = 1;
						page_info.items_per_page = 1;
						page_info.items_total = page_info.count;
						return page_info;
					}
					else {
						return null;
					}
				}

				// Max
				if ((nodes = pages_container.querySelectorAll("td")).length >= 2) {
					n = nodes[nodes.length - 2];
					page_info.count = (parseInt(n.textContent.trim(), 10) || 1);
				}

				// Current
				if ((n = pages_container.querySelector("td.ptds")) !== null) {
					page_info.current = (parseInt(n.textContent.trim(), 10) || 1) - 1;
				}

				// Items
				if ((n = pages_container.parentNode.querySelector(".ip")) !== null && n.parentNode === pages_container.parentNode && (m = /([0-9,]+)\s*-\s*([0-9,]+)\s*of\s*([0-9,]+)/i.exec(n.textContent)) !== null) {
					i = parseInt(m[1].replace(/,/g, ""), 10);
					page_info.items_total = parseInt(m[3].replace(/,/g, ""), 10);
					page_info.items_on_page = Math.max(1, parseInt(m[2].replace(/,/g, ""), 10) - i + 1);
					page_info.items_per_page = (page_info.count <= 1 || page_info.current < page_info.count - 1) ? page_info.items_on_page : (i - 1) / page_info.current;
				}

				// Done
				return page_info;
			},

			get_gallery_info_from_html: function (html) {
				// Vars
				var i, j, n, m, par, pattern, prev, info,
					namespace, tds, tag;

				// Data
				var data = create_blank_gallery_data();

				// ID/token
				if (
					(n = html.querySelector(".ptt td.ptds>a,.ptt td.ptdd>a")) !== null &&
					(info = API.get_gallery_url_info(n.getAttribute("href") || "")) !== null
				) {
					data.gallery.gid = info.gid;
					data.gallery.token = info.token;
				}

				// Gallery names
				if ((n = html.querySelector("#gn")) !== null) {
					data.title = n.textContent.trim();
				}
				if ((n = html.querySelector("#gj")) !== null) {
					data.title_original = n.textContent.trim();
				}

				// Thumbnail
				if ((n = html.querySelector("#gd1>img")) !== null) {
					data.thumbnail = n.getAttribute("src") || "";
				}

				// Category
				pattern = /^.*?\/\/.+?\/(.*?)(\?.*?)?(#.*?)?$/;
				if (
					(n = html.querySelector("#gdc>a")) !== null &&
					(m = pattern.exec(n.getAttribute("href") || ""))
				) {
					data.category = m[1];
				}

				// Uploader
				if (
					(n = html.querySelector("#gdn>a")) !== null &&
					(m = pattern.exec(n.getAttribute("href") || ""))
				) {
					data.uploader = m[1].split("/")[1] || "";
				}

				if ((par = html.querySelectorAll("#gdd tr")).length >= 7) {
					// Date uploaded
					if (
						(n = par[0].querySelector(".gdt2")) !== null &&
						(m = API.get_date_uploaded_from_node(n)) !== null
					) {
						data.date_uploaded = m;
					}

					// Parent
					if (
						(n = par[1].querySelector(".gdt2>a")) !== null &&
						(info = API.get_gallery_url_info(n.getAttribute("href") || "")) !== null
					) {
						data.parent = {
							gid: info.gid,
							token: info.token,
						};
					}

					// Visible
					pattern = /no\s+\((.+?)\)/i;
					if (
						(n = par[2].querySelector(".gdt2")) &&
						(m = pattern.exec(n.textContent))
					) {
						data.visible = false;
						data.visible_reason = m[1];
					}

					// Language
					pattern = /(.+)(?:\s*\((.+?)\))/i;
					if (
						(n = par[3].querySelector(".gdt2"))
					) {
						data.language = (n.firstChild ? (n.firstChild.nodeValue || "").trim() : "");
						if (
							(n = n.querySelector(".halp")) !== null &&
							(n.textContent.trim() == "TR")
						) {
							data.translated = true;
						}
					}

					// Image size/resized
					pattern = /([0-9\.]+)\s*(\w+)/i;
					if (
						(n = par[4].querySelector(".gdt2")) !== null &&
						(m = pattern.exec(n.textContent))
					) {
						data.total_file_size_approx = size_label_to_bytes(m[1], m[2]);
						if (
							(n = n.querySelector(".halp")) !== null &&
							(n.textContent.trim() == "RES")
						) {
							data.images_resized = true;
						}
					}

					// Image count
					pattern = /([0-9]+)\s*pages/i;
					if (
						(n = par[5].querySelector(".gdt2")) !== null &&
						(m = pattern.exec(n.textContent))
					) {
						data.image_count = parseInt(m[1], 10);
					}
				}

				// Rating
				if ((n = html.querySelector("#rating_count")) !== null) {
					data.rating.count = parseInt(n.textContent.trim(), 10);
				}

				pattern = /average:\s*([0-9\.]+)/i;
				if (
					(n = html.querySelector("#rating_label")) !== null &&
					(m = pattern.exec(n.textContent))
				) {
					data.rating.average = parseFloat(m[1]);
				}

				// Favorites
				if (
					(n = html.querySelector("#favcount")) !== null &&
					(m = /\s*([0-9]+)/.exec(n.textContent || "")) !== null
				) {
					data.favorites.count = parseInt(m[1], 10);
				}
				if ((n = html.querySelector("#fav>div.i")) !== null) {
					info = API.get_favorite_icon_info_from_node(n);
					data.favorites.category = info[0];
					data.favorites.category_title = info[1];
				}

				// Thumbnail settings
				if ((n = html.querySelectorAll("#gdo4>.nosel")).length >= 2) {
					if (n[0].classList.contains("ths")) {
						data.thumbnail_size = "normal";
					}
					else {
						data.thumbnail_size = "large";
					}
				}

				if ((n = html.querySelectorAll("#gdo2>.nosel")).length >= 1) {
					for (i = 0; i < n.length; ++i) {
						if (n[i].classList.contains("ths")) {
							if ((m = /\s*([0-9]+)/.exec(n[i].textContent)) !== null) {
								data.thumbnail_rows = parseInt(m[1], 10);
							}
							break;
						}
					}
				}

				// Newer versions
				par = html.querySelectorAll("#gnd>a");
				for (i = 0; i < par.length; ++i) {
					n = par[i];

					if (
						(info = API.get_gallery_url_info(n.getAttribute("href") || "")) !== null
					) {
						// Create previous entry
						prev = {
							gallery: {
								gid: info.gid,
								token: info.token,
							},
							name: n.textContent.trim(),
							date_uploaded: 0,
						};

						// Date
						pattern = /added\s*([0-9]+)-([0-9]+)-([0-9]+)\s+([0-9]+):([0-9]+)/;
						if (
							n.nextSibling &&
							(m = pattern.exec(n.nextSibling.textContent))
						) {
							prev.date_uploaded = (new Date(
								parseInt(m[1], 10), // year
								parseInt(m[2], 10) - 1, // month
								parseInt(m[2], 10), // day
								parseInt(m[3], 10), // hours
								parseInt(m[4], 10), // minutes
								0, // seconds
								0 // milliseconds
							)).getTime();
						}

						// Add
						data.newer_versions.push(prev);
					}
				}

				// Tags
				pattern = /(.+):/;
				par = html.querySelectorAll("#taglist tr");
				for (i = 0; i < par.length; ++i) {
					// Class
					tds = par[i].querySelectorAll("td");
					if (tds.length > 0) {
						// Namespace
						if ((m = pattern.exec(tds[0].textContent))) {
							namespace = m[1].trim();
						}
						else {
							namespace = "";
						}
						if (!(namespace in data.tags)) {
							data.tags[namespace] = [];
						}

						// Tags
						tds = tds[tds.length - 1].querySelectorAll("div");
						for (j = 0; j < tds.length; ++j) {
							// Create tag
							if ((n = tds[j].querySelector("a")) !== null) {
								// Add tag
								tag = n.textContent.trim();
								data.tags[namespace].push(tag);
							}
						}
					}
				}

				// Done
				return data;
			},
			get_gallery_info_from_json: function (json) {
				var tag_list;

				// Data
				var data = create_blank_gallery_data(),
					div = document.createElement("div");

				// Basic data
				data.gallery.gid = json.gid;
				data.gallery.token = json.token;

				set_inner_html_no_loading(div, json.title); // Replace special &#...; chars
				data.title = div.textContent;
				set_inner_html_no_loading(div, json.title_jpn);
				data.title_original = div.textContent;

				data.image_count = parseInt(json.filecount, 10);
				data.total_file_size_approx = json.filesize;
				data.visible = !json.expunged;
				data.rating.average = json.rating;
				data.date_uploaded = (new Date(json.posted * 1000)).getTime();

				data.uploader = json.uploader;
				data.category = json.category.toLowerCase();

				data.thumbnail = json.thumb;

				// Tags
				tag_list = [];
				Array.prototype.push.apply(tag_list, json.tags);
				data.tags["undefined"] = tag_list;

				// Done
				return data;
			},
			get_gallery_images_from_html: function (html) {
				// Vars
				var re_image_url = /width:([0-9]+)px;\s*height:([0-9]+)px;\s*background:.+?url\((.+?)\)\s*-([0-9]+)/,
					re_required_height = /height:([0-9]+)/,
					images = [],
					page_id = 0,
					large, nodes, image, i, n, m, n2;

				// Find containers
				if ((n = html.querySelector("#gdt")) !== null) {
					// Image nodes
					nodes = n.querySelectorAll(".gdtm");
					if ((large = (nodes.length === 0))) {
						nodes = n.querySelectorAll(".gdtl");
					}

					// Current page
					if ((n = html.querySelector(".ptt td.ptds")) !== null) {
						page_id = (parseInt(n.textContent.trim(), 10) || 1) - 1;
					}

					// Scan all
					for (i = 0; i < nodes.length; ++i) {
						n = nodes[i];

						// Create new image
						image = create_blank_gallery_image_data();
						image.page = page_id;

						// Required size
						if ((m = re_required_height.exec(n.getAttribute("style") || ""))) {
							image.height_required = parseInt(m[1], 10);
						}

						if (large) {
							// Elements
							if ((n = n.querySelector("a")) !== null) {
								image.url = n.getAttribute("href") || "";

								if ((n2 = n.querySelector("img")) !== null) {
									image.filename = n2.getAttribute("title") || "";
									image.index = (parseInt(n2.getAttribute("alt") || "", 10) || 1) - 1;
									image.thumbnail = n2.getAttribute("src") || "";
								}
							}
						}
						else {
							// Elements
							if (
								(n = n.querySelector("div")) !== null &&
								(n2 = n.querySelector("a")) !== null
							) {
								image.url = n2.getAttribute("href") || "";

								if ((n2 = n2.querySelector("img")) !== null) {
									image.filename = n2.getAttribute("title") || "";
									image.index = (parseInt(n2.getAttribute("alt") || "", 10) || 1) - 1;
								}

								if ((m = re_image_url.exec(n.getAttribute("style") || ""))) {
									// Setup image
									image.thumbnail = m[3];
									image.width = parseInt(m[1], 10);
									image.height = parseInt(m[2], 10);
									image.x_offset = parseInt(m[4], 10);
								}
							}
						}

						// Add image
						images.push(image);
					}
				}

				// Return
				return images;
			},

			get_image_info_from_html: function (html) {
				var page_vars, nodes, info, okay, re, replacer, i, n, m;

				// Setup data
				var data = create_blank_image_data();

				// Scripts
				if ((n = html.querySelectorAll("body>script:not([src])")).length > 0) {
					re = /var\s+(\w+)\s*=\s*(.+?);/g;
					okay = false;
					replacer = function (full, name, val) {
						try {
							page_vars[name] = JSON.parse(val);
						}
						catch (e) {}
						return "";
					};
					for (i = 0; i < n.length && !okay; ++i) {
						// Get vars
						page_vars = {};
						n[i].textContent.replace(re, replacer);

						if ("startkey" in page_vars) {
							data.navigation.key_current = page_vars.startkey;
							okay = true;
						}
						if ("showkey" in page_vars) {
							data.navigation.api_key = page_vars.showkey;
							okay = true;
						}
					}
				}
				if (data.navigation.direct_id === null) {
					if ((n = html.querySelector("#loadfail[onclick]")) !== null) {
						data.navigation.direct_id = get_direct_id(n.getAttribute("onclick"));
					}
				}

				// Get title
				if ((n = html.querySelector("h1")) !== null) {
					data.gallery.title = n.textContent.trim();
				}

				// Get image
				if (
					(n = html.querySelector("#img")) !== null ||
					(n = html.querySelector(".sni>a[href]>img[src]")) !== null
				) {
					data.image.url = n.getAttribute("src") || "";
				}
				else {
					return null;
				}

				// Get pages
				if ((n = html.querySelectorAll(".sn>div>span")).length >= 2) {
					data.page = (parseInt(n[0].textContent.trim(), 10) || 1) - 1;
					data.page_count = parseInt(n[1].textContent.trim(), 10) || 0;
				}
				else {
					return null;
				}

				// Get info
				re = /(.*?)\s*::\s*(\d+)\s*x\s*(\d+)\s*::\s*([\d\.]+)\s*(\w+)$/i;
				if (
					(
						(n = html.querySelector("#i4>div")) !== null ||
						(n = html.querySelector(".sni>div:not([class])")) !== null
					) &&
					(m = re.exec(n.textContent.trim()))
				) {
					data.image.filename = m[1];
					data.image.width = parseInt(m[2], 10);
					data.image.height = parseInt(m[3], 10);
					data.image.size_approx = size_label_to_bytes(m[4], m[5]);
				}
				else {
					return null;
				}

				// Gallery
				if (
					(n = html.querySelector(".sb>a")) !== null &&
					(info = API.get_gallery_url_info(n.getAttribute("href") || "")) !== null
				) {
					data.gallery.gid = info.gid;
					data.gallery.token = info.token;
					data.gallery.page = info.page;
				}
				else {
					return null;
				}

				// Next/prev
				nodes = html.querySelectorAll(".sn>a");
				if (
					(
						(n = html.querySelector("#next")) !== null ||
						(n = nodes[1])
					) &&
					(info = API.get_gallery_image_url_info(n.getAttribute("href") || "")) !== null &&
					info.key != data.navigation.key_current
				) {
					data.navigation.key_next = info.key;
				}
				if (
					(
						(n = html.querySelector("#prev")) !== null ||
						(n = nodes[2])
					) &&
					(info = API.get_gallery_image_url_info(n.getAttribute("href") || "")) !== null &&
					info.key != data.navigation.key_current
				) {
					data.navigation.key_previous = info.key;
				}

				// First/last
				if (
					(n = nodes[0]) &&
					(info = API.get_gallery_image_url_info(n.getAttribute("href") || "")) !== null
				) {
					data.navigation.key_first = info.key;
				}
				if (
					(n = nodes[3]) &&
					(info = API.get_gallery_image_url_info(n.getAttribute("href") || "")) !== null
				) {
					data.navigation.key_last = info.key;
				}

				// Original image
				re = /(\d+)\s*x\s*(\d+)\s+([\d\.]+)\s*(\w+)/i;
				if (
					(
						(n = html.querySelector("#i7>a")) !== null ||
						(
							(nodes = html.querySelectorAll(".if")).length >= 2 &&
							(n = nodes[1].querySelector("a")) !== null
						)
					) &&
					(m = re.exec(n.textContent.trim()))
				) {
					data.image_original = {
						url: n.getAttribute("href") || "",
						width: parseInt(m[1], 10),
						height: parseInt(m[2], 10),
						size_approx: size_label_to_bytes(m[3], m[4]),
					};
				}

				// Invalid
				return data;
			},
			get_image_info_from_json: function (json) {
				var div = document.createElement("div"),
					info, re, m, n, nodes;

				// Setup data
				var data = create_blank_image_data();

				// Basic info
				data.page = (json.p || 1) - 1;
				data.navigation.key_current = json.k || "";

				data.image.width = parseInt(json.x, 10) || 0;
				data.image.height = parseInt(json.y, 10) || 0;

				// Get info
				set_inner_html_no_loading(div, json.i || "");
				re = /(.*?)\s*::\s*(\d+)\s*x\s*(\d+)\s*::\s*([\d\.]+)\s*(\w+)$/i;
				if (
					(n = div.querySelector("div")) !== null &&
					(m = re.exec(n.textContent.trim()))
				) {
					data.image.filename = m[1];
					data.image.size_approx = size_label_to_bytes(m[4], m[5]);
				}
				else {
					return null;
				}

				// Get image
				set_inner_html_no_loading(div, json.i3 || "");
				if ((n = div.querySelector("#img")) !== null) {
					data.image.url = n.getAttribute("src") || "";
				}
				else {
					return null;
				}

				// Get pages
				set_inner_html_no_loading(div, json.n);
				if ((n = div.querySelectorAll(".sn>div>span")).length >= 2) {
					data.page_count = parseInt(n[1].textContent.trim(), 10) || 0;
				}
				else {
					return null;
				}

				// Next/prev
				if (
					(n = div.querySelector("#next")) !== null &&
					(info = API.get_gallery_image_url_info(n.getAttribute("href") || "")) !== null &&
					info.key != data.navigation.key_current
				) {
					data.navigation.key_next = info.key;
				}
				if (
					(n = div.querySelector("#prev")) !== null &&
					(info = API.get_gallery_image_url_info(n.getAttribute("href") || "")) !== null &&
					info.key != data.navigation.key_current
				) {
					data.navigation.key_previous = info.key;
				}

				// First/last
				nodes = n.querySelectorAll(".sn>a");
				if (
					(n = nodes[0]) &&
					(info = API.get_gallery_image_url_info(n.getAttribute("href") || "")) !== null
				) {
					data.navigation.key_first = info.key;
				}
				if (
					(n = nodes[3]) &&
					(info = API.get_gallery_image_url_info(n.getAttribute("href") || "")) !== null
				) {
					data.navigation.key_last = info.key;
				}

				// Gallery
				set_inner_html_no_loading(div, json.i5);
				if (
					(n = div.querySelector(".sb>a")) !== null &&
					(info = API.get_gallery_url_info(n.getAttribute("href") || "")) !== null
				) {
					data.gallery.gid = info.gid;
					data.gallery.token = info.token;
				}
				else {
					return null;
				}

				// Original image
				if (json.i7) {
					set_inner_html_no_loading(div, json.i7);
					re = /(\d+)\s*x\s*(\d+)\s+([\d\.]+)\s*(\w+)/i;
					if (
						(n = div.querySelector("a")) !== null &&
						(m = re.exec(n.textContent.trim()))
					) {
						data.image_original = {
							url: n.getAttribute("href") || "",
							width: parseInt(m[1], 10),
							height: parseInt(m[2], 10),
							size_approx: size_label_to_bytes(m[3], m[4]),
						};
					}
				}

				// Direct ID
				data.navigation.direct_id = get_direct_id(json.i6 || "");

				// Invalid
				return data;
			},

			get_favorite_icon_info_from_node: function (node) {
				var title = node.getAttribute("title") || "",
					m = /background-position\s*:\s*\d+(?:px)?\s+(-?\d+)(?:px)/.exec(node.getAttribute("style") || ""),
					category = -1;

				if (m !== null) {
					category = Math.floor((Math.abs(parseInt(m[1], 10)) - 2) / 19);
				}

				return [ category , title ];
			},
			get_date_uploaded_from_node: function (node) {
				// Date uploaded
				var m = /([0-9]+)-([0-9]+)-([0-9]+)\s+([0-9]+):([0-9]+)/.exec(node.textContent);

				if (m === null) return null;

				return (new Date(
					parseInt(m[1], 10), // year
					parseInt(m[2], 10) - 1, // month
					parseInt(m[2], 10), // day
					parseInt(m[3], 10), // hours
					parseInt(m[4], 10), // minutes
					0, // seconds
					0 // milliseconds
				)).getTime();
			},

			get_image_info: function (gid, key, page, api_key, direct_id, callback, on_load, on_error, on_complete, on_progress) {
				if (api_key && direct_id === null) {
					// Request using JSON
					var req_data = {
						method: "showpage",
						gid: gid,
						page: page + 1,
						imgkey: key,
						showkey: api_key,
					};

					return API.request_api(req_data,
						// On load
						function (response, status, status_text) {
							if (on_load) on_load.apply(this, arguments);

							if (status == 200) {
								var data = response ? API.get_image_info_from_json(response) : null;

								if (data !== null) {
									callback.call(null, API.OK, data, response);
								}
								else {
									callback.call(null, API.ERROR_PARSING, response);
								}
							}
							else {
								callback.call(null, API.ERROR_REQUEST_STATUS, [ response , status, status_text ]);
							}
						}._w(),
						// On error
						function (event) {
							if (on_error) on_error.apply(this, arguments);

							callback.call(null, API.ERROR_REQUEST, event);
						}._w(),
						on_complete,
						on_progress
					);
				}
				else {
					// Request the page
					return API.request_document("/s/" + key + "/" + gid + "-" + (page + 1) + (direct_id !== null ? "?nl=" + direct_id : ""),
						// On load
						function (response, status, status_text) {
							if (on_load) on_load.apply(this, arguments);

							if (status == 200) {
								var data = API.get_image_info_from_html(response);
								if (data !== null) {
									callback.call(null, API.OK, data, response);
								}
								else {
									callback.call(null, API.ERROR_PARSING, response);
								}
							}
							else {
								callback.call(null, API.ERROR_REQUEST_STATUS, [ response , status, status_text ]);
							}
						}._w(),
						// On error
						function (event) {
							if (on_error) on_error.apply(this, arguments);

							callback.call(null, API.ERROR_REQUEST, event);
						}._w(),
						on_complete,
						on_progress
					);
				}
			},

			get_gallery: function (gid, token, page, use_api, callback, on_load, on_error, on_complete, on_progress) {
				// Request the page
				if (use_api) {
					// Request using JSON
					var req_data = {
						method: "gdata",
						gidlist: [
							[ gid , token ],
						],
					};

					return API.request_api(req_data,
						// On load
						function (response, status, status_text) {
							if (on_load) on_load.apply(this, arguments);

							if (status == 200) {
								var data = (response && response.gmetadata && response.gmetadata[0]) ? API.get_gallery_info_from_json(response.gmetadata[0]) : null;

								if (data !== null) {
									callback.call(null, API.OK, data, null);
								}
								else {
									callback.call(null, API.ERROR_PARSING, response);
								}
							}
							else {
								callback.call(null, API.ERROR_REQUEST_STATUS, [ response , status, status_text ]);
							}
						},
						// On error
						function (event) {
							if (on_error) on_error.apply(this, arguments);

							callback.call(null, API.ERROR_REQUEST, event);
						},
						on_complete,
						on_progress
					);
				}
				else {
					return API.request_document("/g/" + gid + "/" + token + "/" + (page > 0 ? "?p=" + page : ""),
						// On load
						function (response, status, status_text) {
							if (on_load) on_load.apply(this, arguments);

							if (status == 200) {
								var data = API.get_gallery_info_from_html(response);

								if (data !== null) {
									callback.call(null, API.OK, data, response);
								}
								else {
									callback.call(null, API.ERROR_PARSING, response);
								}
							}
							else {
								callback.call(null, API.ERROR_REQUEST_STATUS, [ response , status, status_text ]);
							}
						},
						// On error
						function (event) {
							if (on_error) on_error.apply(this, arguments);

							callback.call(null, API.ERROR_REQUEST, event);
						},
						on_complete,
						on_progress
					);
				}
			},

			get_gallery_images: function (gid, token, page, callback, on_load, on_error, on_complete, on_progress) {
				return API.request_document("/g/" + gid + "/" + token + "/" + (page > 0 ? "?p=" + page : ""),
					// On load
					function (response, status, status_text) {
						if (on_load) on_load.apply(this, arguments);

						if (status == 200) {
							var data = API.get_gallery_images_from_html(response);

							if (data !== null) {
								callback.call(null, API.OK, data, response);
							}
							else {
								callback.call(null, API.ERROR_PARSING, response);
							}
						}
						else {
							callback.call(null, API.ERROR_REQUEST_STATUS, [ response , status, status_text ]);
						}
					},
					// On error
					function (event) {
						if (on_error) on_error.apply(this, arguments);

						callback.call(null, API.ERROR_REQUEST, event);
					},
					on_complete,
					on_progress
				);
			},

			set_html_gallery_favorite_icon: function (html, fav_id, fav_title) {
				var par = html.querySelector("#fav"),
					img;

				if (par) {
					par.innerHTML = "";

					if (fav_id >= 0 && fav_id < 10) {
						img = document.createElement("div");
						img.className = "i";
						if (fav_title) img.setAttribute("title", fav_title);

						img.style.backgroundImage = "url('http://st.exhentai.net/img/fav.png')";
						img.style.backgroundPosition = "0px -" + (2 + 19 * fav_id) + "px";
						par.appendChild(img);
					}
				}
			},

			block_redirections: function (on_block) {

				// Block scripts
				var on_window_bse = function (event) {
					var remove = false;

					if (!event.target.getAttribute("src")) {
						if (/setTimeout\s*\(\s*(gotonext|"gotonext\(\)")\s*,\s*\d+\s*\)/.test(event.target.textContent)) {
							remove = true;
						}
					}

					if (remove) {
						// Stop
						event.preventDefault();
						event.stopPropagation();

						// Remove
						if (event.target.parentNode) {
							event.target.parentNode.removeChild(event.target);
						}

						// Event
						if (on_block) {
							on_block.call(null, event.target);
						}

						// Done
						return false;
					}

					// Okay
					return true;
				};

				window.addEventListener("beforescriptexecute", on_window_bse, true);

				// If beforescriptexecute fails (chrome), simply remask the function
				on_ready(function () {
					API.inject_script(function () { if (window.gotonext) { window.gotonext = function () {}; } });
				});

			},

			get_page_type_from_html: function (html) {
				var n;

				if (html.querySelector("#searchbox") !== null) {
					return "search";
				}
				else if (html.querySelector("input.stdbtn[value='Search Favorites']") !== null) {
					return "favorites";
				}
				else if (html.querySelector("#i1>h1") !== null) {
					return "image";
				}
				else if (html.querySelector(".gm h1#gn") !== null) {
					return "gallery";
				}
				else if (html.querySelector(".stuffbox>form") !== null) {
					return "settings";
				}
				else if (
					(n = html.querySelector("body>.d>p")) !== null &&
					/this gallery has been removed, and is unavailable\./i.exec(n.textContent.trim()) !== null
				) {
					return "gallery_deleted";
				}
				else if ((n = html.querySelector("img[src]")) !== null) {
					var p = window.location.pathname;
					if (n.getAttribute("src") === window.location.href && p.substr(0, 3) !== "/t/" && p.substr(0, 5) !== "/img/") {
						return "panda";
					}
				}

				// Unknown
				return null;
			},

			get_site: function () {
				return api_site;
			},

			get_search_page_results: function (html) {
				var results = [],
					nodes = html.querySelectorAll("div.itg>.id1"),
					i, n, n1, node, m, data, info;

				if (nodes.length > 0) {
					for (i = 0; i < nodes.length; ++i) {
						node = nodes[i];
						data = create_blank_gallery_stub();
						results.push(data);

						// Title, ID/token
						if ((n = node.querySelector(".id2>a")) !== null) {
							data.title = n.textContent.trim();
							if ((info = API.get_gallery_url_info(n.getAttribute("href") || "")) !== null) {
								data.gallery.gid = info.gid;
								data.gallery.token = info.token;
							}
						}

						// Thumbnail
						if ((n = node.querySelector(".id3>a>img[src]")) !== null) {
							data.thumbnail = n.getAttribute("src");
						}

						if ((n1 = node.querySelector(".id4")) !== null) {
							// Category
							if ((n = n1.querySelector(".id41[title]")) !== null) {
								data.category = n.getAttribute("title").toLowerCase();
							}

							// Files
							if (
								(n = n1.querySelector(".id42")) !== null &&
								(m = /\s*([0-9]+)\s*files?/i.exec(n.textContent)) !== null
							) {
								data.file_count = parseInt(m[1], 10);
							}

							// Favorited
							if ((n = n1.querySelector(".id44 .i[title]")) !== null) {
								info = API.get_favorite_icon_info_from_node(n);
								data.favorites.category = info[0];
								data.favorites.category_title = info[1];
							}
						}
					}
				}
				else if ((nodes = html.querySelectorAll("table.itg .gtr0,table.itg .gtr1")).length > 0) {
					for (i = 0; i < nodes.length; ++i) {
						node = nodes[i];
						data = create_blank_gallery_stub();
						results.push(data);

						// Category
						if ((n = node.querySelector(".itdc>a>img[alt]")) !== null) {
							data.category = n.getAttribute("alt").toLowerCase();
						}

						// Uploader
						if ((n = node.querySelector(".itu>div>a")) !== null) {
							data.uploader = n.textContent.trim();
						}

						if ((n1 = node.querySelectorAll(".itd")).length >= 2) {
							// Date
							data.date_uploaded = API.get_date_uploaded_from_node(n1[0]);

							// Title, ID/token
							n1 = n1[1];
							if ((n = n1.querySelector(".it5>a")) !== null) {
								data.title = n.textContent.trim();
								if ((info = API.get_gallery_url_info(n.getAttribute("href") || "")) !== null) {
									data.gallery.gid = info.gid;
									data.gallery.token = info.token;
								}
							}

							// Thumbnail
							if ((n = n1.querySelector(".it2>img[src]")) !== null) {
								data.thumbnail = n.getAttribute("src");
							}
							else if ((n = n1.querySelector(".it2")) !== null) {
								data.thumbnail = API.parse_init_image(n.textContent.trim());
							}

							// Favorited
							if ((n = n1.querySelector(".it3 .i[title]")) !== null) {
								info = API.get_favorite_icon_info_from_node(n);
								data.favorites.category = info[0];
								data.favorites.category_title = info[1];
							}
						}
					}
				}

				return results;
			},

			parse_init_image: function (text) {
				var m = /^init~([\w\-\.]+)~([^~]+)~(.*)$/.exec(text);

				if (m === null) return null;

				return window.location.protocol + "//" + m[1] + "/" + m[2];
			},

			form_page_url: function (html, page_id, include_hash) {
				var node = html.querySelector(".ptt td.ptds>a"),
					page_key = "page",
					page_part = page_key + "=" + page_id,
					found = false,
					m, search;

				if (node === null) return "?" + page_part;

				// Gallery
				if (html.querySelector(".gm h1#gn") !== null) {
					page_key = "p";
					page_part = page_key + "=" + page_id;
				}

				// Match
				m = /^([^#\?]*)(\?[^#]*)?((?:#.*)?)$/.exec(node.getAttribute("href") || "");

				// No search query found
				if (m[2] === undefined) {
					search = page_part;
				}
				else {
					search = m[2].substr(1).replace(new RegExp("(^|&)" + page_key + "=[^&]*", "g"), function (full, prefix) {
						found = true;
						return prefix + page_part;
					});

					if (!found) {
						if (search.length > 0) page_part += "&";
						search = page_part + search;
					}
				}

				// Complete
				return m[1] + "?" + search + (include_hash ? m[3] : "");
			},
			form_gallery_image_url: function (gid, key, page, direct_id) {
				var url = "/s/" + key + "/" + gid + "-" + (page + 1);
				if (direct_id) url += "?nl=" + direct_id;
				return url;
			},

			modify_page_navigation_links: function (html, modify_fn) {
				var pages = html.querySelectorAll(".ptt td,.ptb td"),
					i, n;

				for (i = 0; i < pages.length; ++i) {
					if ((n = pages[i].querySelector("a")) !== null) {
						modify_fn.call(null, pages[i], n);
					}
				}
			},

			add_header_link: function (node) {
				var par = document.getElementById("nb"),
					img;

				if (par === null) return false;

				img = document.createElement("img");
				img.setAttribute("alt", "");
				img.setAttribute("src", api_site == "exhentai" ? "http://exhentai.org/img/mr.gif" : "http://ehgt.org/g/mr.gif");

				par.appendChild(img);
				par.appendChild($.text(" "));
				par.appendChild(node);

				return true;
			},
			get_front_page_links: function (html) {
				var nodes = [],
					n;

				if ((n = html.querySelector("#nb>a[href='http://exhentai.org/']")) !== null) nodes.push(n);
				if ((n = html.querySelector("#frontpage>a[href='http://exhentai.org/']")) !== null) nodes.push(n);
				if ((n = html.querySelector(".ip>a[href='http://exhentai.org/']")) !== null) nodes.push(n);

				return nodes;
			},

			get_image_limits_from_html: function (html) {
				var nodes = html.querySelectorAll(".stuffbox>h2"),
					obj = null,
					i, n;

				for (i = 0; i < nodes.length; ++i) {
					n = nodes[i];
					if (/^\s*Image\s+Limits\s*$/i.test(n.textContent)) {
						while ((n = n.nextSibling) !== null) {
							if (n.classList) {
								if (n.classList.contains("homebox") && (nodes = n.querySelectorAll("p>strong")).length >= 3) {
									// Found
									obj = {
										current: parseInt(nodes[0].textContent.trim(), 10) || 0,
										limit: parseInt(nodes[1].textContent.trim(), 10) || 0,
										increase: parseInt(nodes[2].textContent.trim(), 10) || 0,
									};
								}
								break;
							}
						}
						break;
					}
				}

				// Not found
				return obj;
			},
			get_image_limits: function (callback) {
				return API.request_document("http://g.e-hentai.org/home.php",
					// On load
					function (response, status, status_text) {
						var data = API.get_image_limits_from_html(response);

						if (status == 200) {
							if (data !== null) {
								callback.call(null, API.OK, data, response);
							}
							else {
								callback.call(null, API.ERROR_PARSING, response);
							}
						}
						else {
							callback.call(null, API.ERROR_REQUEST_STATUS, [ response , status, status_text ]);
						}
					},
					// On error
					function (event) {
						callback.call(null, API.ERROR_REQUEST, event);
					},
					null,
					null,
					{
						use_gm: true,
					}
				);
			},
		};



		// Done
		return API;

	})();

	// Menu dropdown
	var Menu = (function () {

		var Menu = function (flags) {
			// Settings
			this.options = [];

			this.events = {
				"select": [],
			};

			this.close_timer = null;

			this.flags = (flags === undefined) ? (Menu.BELOW | Menu.LEFT | Menu.CENTER | Menu.VERTICAL) : flags;

			// Node
			this.container = $("div", "eze_menu");

			// Events
			this.on_document_mousedown = bind(on_document_mousedown, this);
			document.addEventListener("mousedown", this.on_document_mousedown, false);

			this.on_menu_mousedown = bind(on_menu_mousedown, this);
			this.container.addEventListener("mousedown", this.on_menu_mousedown, false);

			// Add node
			document.body.appendChild(this.container);
		};



		// Constants
		Menu.ABOVE = 0x1;
		Menu.BELOW = 0x2;
		Menu.LEFT = 0x4;
		Menu.RIGHT = 0x8;
		Menu.CENTER = 0x10; // For secondary axis
		Menu.MIDDLE = 0x20; // For secondary axis
		Menu.HORIZONTAL = 0x40; // Primary axis
		Menu.VERTICAL = 0x80; // Primary axis
		Menu.VERTICAL_LOCK = 0x100;
		Menu.HORIZONTAL_LOCK = 0x200;
		Menu.NO_FONT_SCALING = 0x800;



		var trigger = Events.trigger();
		var on_option_click = function (menu, id, event) {
			// Skip
			if (event.which != 1) return;

			// Trigger event
			trigger.call(menu, "select", {
				menu: menu,
				option: this,
				id: id,
			});

			// Stop
			event.preventDefault();
			event.stopPropagation();
			return false;
		};
		var on_document_mousedown = function (event) {
			// Skip
			if (event.which != 1) return;

			// Timer
			var self = this;
			this.close_timer = setTimeout(function () {
				self.close();
			}, 50);
		};
		var on_menu_mousedown = function (event) {
			// Skip
			if (event.which != 1) return;

			// Cancel
			if (this.close_timer !== null) {
				clearTimeout(this.close_timer);
				this.close_timer = null;
			}

			// Stop
			event.preventDefault();
			event.stopPropagation();
			return false;
		};

		var set_font_size = function (parent) {
			var fs1, fs2;

			// Reset
			this.container.style.fontSize = "";

			// Set font size
			fs1 = parseFloat(CSS.computed(parent, "fontSize").replace(/[^\d\.]+/g, ""));
			fs2 = parseFloat(CSS.computed(this.container, "fontSize").replace(/[^\d\.]+/g, ""));
			this.container.style.fontSize = (fs1 / fs2).toFixed(2) + "em";
		};
		var set_position = function (par_rect) {
			// Setup vars
			var k_low = [ "left" , "top" ],
				k_high = [ "right" , "bottom" ],
				k_size = [ "width" , "height" ],
				k_aflags = [
					[ Menu.CENTER , Menu.LEFT , Menu.RIGHT ],
					[ Menu.MIDDLE , Menu.TOP , Menu.BOTTOM ],
				],
				position = [ 0 , 0 ],
				bounds = false,
				self_rect = Geometry.get_object_rect(this.container),
				view_rect = Geometry.get_window_rect(),
				i = ((this.flags & Menu.VERTICAL) !== 0 || (this.flags & Menu.HORIZONTAL) === 0) ? 1 : 0,
				flex = [
					(this.flags & Menu.HORIZONTAL_LOCK) === 0,
					(this.flags & Menu.VERTICAL_LOCK) === 0,
				],
				align = [
					(this.flags & Menu.LEFT) === 0, // Is to the right
					(this.flags & Menu.ABOVE) === 0, // Is below
				],
				low, high, size, aflags, p;


			// Primary axis
			low = k_low[i];
			high = k_high[i];
			size = k_size[i];

			// Default position
			p = align[i] ? par_rect[high] : par_rect[low] - self_rect[size];

			// View flexing
			if (flex[i]) {
				if (align[i]) {
					if (
						p + self_rect[size] > view_rect[high] && // Goes below bottom of screen
						par_rect[low] - self_rect[size] >= view_rect[low] // Top must stay on screen after the change
					) {
						// Move above
						p = par_rect[low] - self_rect[size];
					}
				}
				else {
					if (
						p < view_rect[low] && // Goes above top of screen
						par_rect[high] + self_rect[size] <= view_rect[high] // Bottom must stay on screen
					) {
						// Move below
						p = par_rect[high];
					}
				}
			}
			position[i] = p;


			// Secondary axis flexing
			i = 1 - i;

			low = k_low[i];
			high = k_high[i];
			size = k_size[i];
			aflags = k_aflags[i];

			// Default position
			if ((this.flags & aflags[0]) !== 0) {
				p = par_rect[low] + (par_rect[size] - self_rect[size]) / 2.0;
				// Left/right bounding
				if ((this.flags & aflags[1]) !== 0) {
					p = Math.max(p, par_rect[low]);
				}
				else if ((this.flags & aflags[2]) !== 0) {
					p = Math.min(p, par_rect[high] - self_rect[size]);
				}
			}
			else {
				p = align[i] ? par_rect[high] - self_rect[size] : par_rect[low];
			}

			// View flexing
			if (flex[i]) {
				if (p + self_rect[size] > view_rect[high]) {
					// Shift to left
					p = view_rect[high] - self_rect[size];
					bounds = true;
				}
				else if (p < view_rect[low]) {
					// Shift to right
					p = view_rect[low];
					bounds = true;
				}

				if (bounds) {
					p = Math.min(
						Math.max(par_rect[high] - self_rect[size], par_rect[low]), // max value
						Math.max(
							Math.min(par_rect[low], par_rect[high] - self_rect[size]), // min value
							p
						)
					);
				}
			}
			position[i] = p;


			// Apply position
			this.container.style.left = position[0].toFixed(2) + "px";
			this.container.style.top = position[1].toFixed(2) + "px";
		};



		Menu.prototype = {
			constructor: Menu,

			on: Events.on(),
			off: Events.off(),

			add_option: function (data, option_settings) {
				var tag_type = "a",
					tag_class = "eze_menu_option",
					is_label = false,
					opt, on_click;

				if (option_settings) {
					if (option_settings.label) {
						tag_type = "div";
						tag_class = "eze_menu_label";
						is_label = true;
					}
				}

				if (typeof(data) == "string") {
					// String
					opt = $(tag_type, tag_class, data);
				}
				else {
					// Assume a DOM node
					opt = $(tag_type, tag_class);
					opt.appendChild(data);
				}

				// Setup node
				if (!is_label) {
					on_click = bind(on_option_click, opt, this, this.options.length);
					opt.addEventListener("click", on_click, false);
				}

				this.container.appendChild(opt);

				this.options.push([ opt , on_click ]);

				return opt;
			},
			show: function (parent, flags) {
				// Setup flags
				if (flags !== undefined) this.flags = flags;

				// Show
				this.container.classList.add("eze_menu_visible");

				// Set font size
				if ((this.flags & Menu.NO_FONT_SCALING) === 0) {
					set_font_size.call(this, parent);
				}

				// Rects
				var par_rect = Geometry.get_object_rect(parent);
				set_position.call(this, par_rect);
			},
			hide: function () {
				this.container.classList.remove("eze_menu_visible");
			},
			close: function () {
				// Remove events
				for (var i = 0; i < this.options.length; ++i) {
					this.options[i][0].removeEventListener("click", this.options[i][1], false);
				}

				document.removeEventListener("mousedown", this.on_document_mousedown, false);
				this.container.removeEventListener("mousedown", this.on_menu_mousedown, false);

				// Hide and remove
				this.hide();

				if (this.container.parentNode !== null) {
					this.container.parentNode.removeChild(this.container);
				}

				// Clear events
				this.events = {};
				this.options = [];

				// Cancel timer
				if (this.close_timer !== null) {
					clearTimeout(this.close_timer);
					this.close_timer = null;
				}
			},

			is_visible: function () {
				return this.container.classList.contains("eze_menu_visible");
			},

		};



		return Menu;

	})();

	// Option box
	var OptionBox = (function () {

		var OptionBox = function (options, selected_value, callback) {
			var sel = null,
				i, n, name, val;

			this.callback = callback;
			this.node = $("div", "eze_option_box");

			for (i = 0; i < options.length; ++i) {
				name = "" + options[i][0];
				val = (options[i].length >= 2) ? options[i][1] : name;

				n = $("div", "eze_option_box_entry", name, {
					"data-eze-option-id": i,
					"data-eze-value": JSON.stringify(val),
				}, $.P, this.node);

				if (sel === null || val == selected_value) sel = n;
			}

			if (sel !== null) {
				sel.classList.add("eze_option_box_entry_selected");
			}

			this.node.addEventListener("click", bind(on_click, this), false);
		};



		var on_click = function (event) {
			// Skip
			if (event.which != 1) return;

			var sel = this.node.querySelector(".eze_option_box_entry_selected"),
				val;

			// Deselect
			if (sel !== null) {
				sel.classList.remove("eze_option_box_entry_selected");

				sel = sel.nextSibling;
				if (sel === null) sel = this.node.firstChild;
			}
			else {
				sel = this.node.firstChild;
			}

			if (sel !== null) {
				// Select new
				sel.classList.add("eze_option_box_entry_selected");

				// Value
				try {
					val = JSON.parse(sel.getAttribute("data-eze-value") || "");
				}
				catch (e) {
					val = null;
				}
				if (this.callback) this.callback.call(null, val, sel);
			}

			// Stop
			event.preventDefault();
			event.stopPropagation();
			return false;
		};



		OptionBox.prototype = {
			constructor: OptionBox,

			get: function () {
				var n = this.node.querySelector(".eze_option_box_entry_selected");

				if (n === null) return null;

				try {
					return JSON.parse(n.getAttribute("data-eze-value") || "");
				}
				catch (e) {
					return null;
				}
			},
			set: function (target_value) {
				var opts = this.node.querySelectorAll(".eze_option_box_entry"),
					sel = null,
					i, value, okay;

				// Find correct value
				for (i = 0; i < opts.length; ++i) {
					try {
						value = JSON.parse(opts[i].getAttribute("data-eze-value"));
						okay = true;
					}
					catch (e) {
						okay = false;
					}

					if (okay && value === target_value) {
						sel = opts[i];
						break;
					}
				}

				if (sel !== null) {
					// Deselect
					opts = this.node.querySelectorAll(".eze_option_box_entry_selected");
					for (i = 0; i < opts.length; ++i) {
						opts[i].classList.remove("eze_option_box_entry_selected");
					}

					// Select
					sel.classList.add("eze_option_box_entry_selected");
					return true;
				}

				return false;
			},
		};



		return OptionBox;

	})();

	// Gallery downloader
	var GalleryDownloader = (function () {

		var GalleryDownloader = function (gallery, thumb_loader) {
			// Vars
			this.events = {
				error: [],
				active_change: [],
				state_change: [],
				gallery_page_get: [],
				gallery_page_progress: [],
				image_page_get: [],
				image_page_progress: [],
				image_get: [],
				image_progress: [],
				image_timeout_progress: [],
				image_range_update: [],
			};

			this.thumb_loader = thumb_loader;

			this.active = false;
			this.state = GalleryDownloader.NOT_STARTED;

			this.request_gallery = new Requester(this, request_gallery_page, request_gallery_page_done, 1.0, 3.0, 1.0, "gallery_page_get", null);
			this.request_image_page = new Requester(this, request_image_page, request_image_page_done, 1.0, 3.0, 1.0, "image_page_get", null);
			this.request_image = new Requester(this, request_image, request_image_done, 1.0, 3.0, 1.0, "image_get", "image_timeout_progress");

			this.request_timeout = 30.0;
			this.request_image.retry_max = 2;

			this.max_filename_length = 200;

			this.use_full_images = true;
			this.allow_fallback_if_using_full_images = true;

			this.request_progress = 0.0;

			//Gallery data
			this.gallery = {
				gid: gallery.gid,
				token: gallery.token,
			};

			this.gal_info = null;
			this.gal_title_info = null;

			this.page_count = 0;
			this.current = 0;
			this.image_id = 0;
			this.images = [];
			this.image_counts = [ 0 , 0 , 0 , 0 , 0 ];
			this.image_total_bytes = [ 0 , 0 , 0 ];
			this.image_total_bytes_loaded = 0;
			this.images_downloading = 0;

			this.image_ranges = [];
		};



		var Requester = function (downloader, request_function, completion_check, delay_okay, delay_error, delay_abort, event_name_next, event_name_progress) {
			this.downloader = downloader;

			this.index = 0;
			this.progress = 0.0;
			this.progress_loaded = 0;
			this.progress_total = 0;
			this.retry_index = 0;
			this.retry_max = 0;

			this.delays = [ delay_okay * 1000 , delay_error * 1000 , delay_abort * 1000 ];

			this.request = null;
			this.timeout_timer = null;
			this.delay_timer = null;
			this.completed = false;

			this.request_function = request_function;
			this.completion_check = completion_check;

			this.event_name_next = event_name_next;
			this.event_name_progress = event_name_progress;
		};
		Requester.prototype = {
			constructor: Requester,

			stop: function (complete) {
				// Returns true if a request was active, false otherwise
				if (this.timeout_timer !== null) {
					this.timeout_timer();
					this.timeout_timer = null;
				}
				if (this.request !== null) {
					if (complete) {
						this.request = null;
					}
					else {
						this.request.abort();
						this.request = null;
						this.progress_reset();
					}
					return true;
				}

				return false;
			},
			resume: function (reset) {
				// Don't continue if a delay timeout is active
				if (this.downloader.active && this.request === null && this.delay_timer === null && !this.completed) {
					if (reset) this.retry_index = 0;
					this.progress_reset();
					this.request_function.call(this.downloader, this);
					if (this.request !== null) {
						var on_progress = (this.event_name_progress === null) ? null : bind(this.on_timeout_progress, this);

						this.timeout_timer = set_timeout(bind(this.on_request_timeout, this), this.downloader.request_timeout * 1000, on_progress, 250);
					}
				}
			},

			next: function () {
				// Next
				var i = this.index;
				++this.index;

				// Event
				trigger.call(this.downloader, this.event_name_next, {
					downloader: this.downloader,
					index: i,
				});

				// Check if complete
				if (!(this.completed = this.completion_check.call(this.downloader, this))) {
					// Delay next
					this.delay(GalleryDownloader.DELAY_OKAY, true);
				}
			},
			delay: function (mode, reset) {
				var self = this,
					cb = function () {
						self.delay_timer = null;
						self.resume(reset);
					};

				if (mode === GalleryDownloader.DELAY_NONE) {
					cb.call(null);
				}
				else {
					this.delay_timer = setTimeout(cb, this.delays[mode]);
				}
			},
			retry: function () {
				// Increase retry
				if (this.retry_index + 1 > this.retry_max) {
					// Stop completely
					this.downloader.pause();
				}
				else {
					// Delay for next
					++this.retry_index;
					this.delay(GalleryDownloader.DELAY_ERROR, false);
				}
			},

			progress_reset: function () {
				this.progress = 0.0;
				this.progress_loaded = 0;
				this.progress_total = 0;
			},

			on_request_timeout: function () {
				// Stop timer
				this.timeout_timer = null;

				// Stop request
				this.stop(false);

				// Error
				trigger_error.call(this.downloader, "Request timed out");

				// Retry
				this.retry();
			},
			on_timeout_progress: function (percent, time) {
				// Event
				trigger.call(this.downloader, this.event_name_progress, {
					downloader: this.downloader,
					percent: percent,
					time: time / 1000.0,
				});
			},
		};



		GalleryDownloader.NOT_STARTED = 0;
		GalleryDownloader.REQUESTING_GALLERY_PAGES = 1;
		GalleryDownloader.REQUESTING_IMAGES = 2;
		GalleryDownloader.COMPLETED = 3;

		GalleryDownloader.DELAY_NONE = -1;
		GalleryDownloader.DELAY_OKAY = 0;
		GalleryDownloader.DELAY_ERROR = 1;
		GalleryDownloader.DELAY_ABORT = 2;

		GalleryDownloader.IMAGE_NOT_ACQUIRED = 0;
		GalleryDownloader.IMAGE_FULL = 1;
		GalleryDownloader.IMAGE_RESIZED = 2;
		GalleryDownloader.IMAGE_UNRESIZED = 3;
		GalleryDownloader.IMAGE_FALLBACK = 4;



		var trigger = Events.trigger();
		var trigger_error = function (error_message) {
			trigger.call(this, "error", {
				downloader: this,
				error: error_message,
			});
		};

		var state_change = function (new_state) {
			// Change state
			this.state = new_state;
			trigger.call(this, "state_change", {
				downloader: this,
				state: this.state,
			});
			state_resume.call(this);
		};
		var state_resume = function () {
			// Resume state
			if (this.state == GalleryDownloader.NOT_STARTED) {
				state_change.call(this, GalleryDownloader.REQUESTING_GALLERY_PAGES);
			}
			else if (this.state == GalleryDownloader.REQUESTING_GALLERY_PAGES) {
				this.request_gallery.resume(true);
			}
			else if (this.state == GalleryDownloader.REQUESTING_IMAGES) {
				this.request_image_page.resume(true);
				this.request_image.resume(true);
			}
		};

		var validate_image = function (image_id) {
			// All
			if (this.image_ranges.length === 0) return true;

			// Convert to 1-indexed
			++image_id;

			// Check if it's in a range
			for (var i = 0, r; i < this.image_ranges.length; ++i) {
				r = this.image_ranges[i];
				if (image_id >= r[0] && image_id <= r[1]) return true;
			}

			// Wasn't in any range
			return false;
		};
		var approximate_total_size = function (size) {
			// Multiply the size by the % of images in  the range(s) for an approximation
			return size * (this.images_downloading / this.gal_info.image_count);
		};
		var update_image_ranges = function () {
			// Normalize
			var max = this.gal_info.image_count,
				i = 0;

			this.images_downloading = 0;

			for (i = 0; i < this.image_ranges.length; ++i) {
				if (this.image_ranges[i][0] > max) {
					// Remove remaining
					this.image_ranges.splice(i, this.image_ranges.length - i);
					break;
				}
				else if (this.image_ranges[i][1] === null || this.image_ranges[i][1] > max) {
					this.image_ranges[i][1] = max;
				}
				this.images_downloading += (this.image_ranges[i][1] - this.image_ranges[i][0]) + 1;
			}

			// Convert to all
			if (this.image_ranges.length === 1 && this.image_ranges[0][0] <= 1 && this.image_ranges[0][1] >= max) {
				this.image_ranges.splice(0, this.image_ranges.length);
			}

			if (this.image_ranges.length === 0) {
				this.images_downloading = max;
			}

			// Trigger event
			trigger.call(this, "image_range_update", {
				downloader: this,
			});
		};

		var request_gallery_page = function (req) {
			// Request
			req.request = API.get_gallery(
				this.gallery.gid, // gallery id
				this.gallery.token, // gallery token
				req.index, // page
				false, // use API
				bind(on_request_gallery_page_callback, this, req), // callback
				null, // on_load
				null, // on_error
				null, // on_complete
				bind(on_request_progress, this, req, "gallery_page_progress") // on_progress
			);
		};
		var request_gallery_page_done = function (req) {
			// Done check
			if (this.page_count > 0 && req.index >= this.page_count) {
				// State change
				state_change.call(this, GalleryDownloader.REQUESTING_IMAGES);
				return true;
			}
			return false;
		};
		var on_request_gallery_page_callback = function (req, status, data, response) {
			// Stop timer
			req.stop(true);

			if (status == API.OK) {
				// Set info
				if (this.gal_info === null) {
					this.gal_info = data;
					this.gal_title_info = API.get_gallery_title_info(this.gal_info.title);
					update_image_ranges.call(this);
					this.image_total_bytes[GalleryDownloader.IMAGE_NOT_ACQUIRED] = approximate_total_size.call(this, this.gal_info.total_file_size_approx);
				}
				// Page count
				if (this.page_count === 0) {
					var page_info = API.get_pages_info_from_html(response);
					if (page_info !== null) {
						// Set count
						this.page_count = page_info.count;
					}
					else {
						// Error
						trigger_error.call(this, "Failed to read gallery page count");

						// Stop
						req.retry();
						return;
					}
				}

				// Get images and add
				var images = API.get_gallery_images_from_html(response),
					count = 0,
					i;

				for (i = 0; i < images.length; ++i) {
					if (validate_image.call(this, this.image_id)) {
						this.images.push({
							info_from_gallery: images[i],
							info: null,
							info_fallback: null,
							byte_data: null,
							image_id: this.image_id,
							used: {
								method: GalleryDownloader.IMAGE_NOT_ACQUIRED,
								info: null,
							},
						});

						++count;
					}
					++this.image_id;
				}
				this.image_counts[GalleryDownloader.IMAGE_NOT_ACQUIRED] += count;

				// Update page
				this.thumb_loader.add_page_from_html(response, req.index);

				// Next
				req.next();
			}
			else {
				// Error
				if (data[0] == API.ERROR_REQUEST) {
					trigger_error.call(this, "Request for gallery page failed");
				}
				else if (data[0] == API.ERROR_REQUEST_STATUS) {
					trigger_error.call(this, "Request status for gallery page was not 200: " + data[1] + "; " + data[2]);
				}
				else { // if (data[0] == API.ERROR_PARSING) {
					trigger_error.call(this, "An error occured parsing the response for gallery page");
				}

				// Stop
				req.retry();
			}
		};

		var request_image_page = function (req) {
			var api_key = null,
				gid, key, page, i;

			if (req.index > 0) {
				// Get previous info
				i = this.images[req.index - 1].info;

				// Set
				if (i.navigation.key_next && this.images[req.index].image_id === i.page + 1) {
					gid = i.gallery.gid;
					key = i.navigation.key_next;
					page = i.page + 1;
					api_key = this.images[0].info.navigation.api_key || null;
				}
			}
			if (api_key === null) {
				// Get URL info
				i = API.get_gallery_image_url_info(this.images[req.index].info_from_gallery.url);
				if (i === null) return; // Invalid

				gid = i.gid;
				key = i.key;
				page = i.page;
				api_key = null;
			}

			// Request
			req.request = API.get_image_info(
				gid, // gid
				key, // key
				page, // page
				api_key, // api_key
				null, // direct_id
				bind(on_request_image_page_callback, this, req), // callback
				null, // on_load
				null, // on_error
				null, // on_complete
				bind(on_request_progress, this, req, "image_page_progress") // on_progress
			);
		};
		var request_image_page_done = function (req) {
			// Done check
			return (req.index >= this.images.length);
		};
		var on_request_image_page_callback = function (req, status, data) {
			req.stop(true);

			if (status == API.OK) {
				if (/\/509\.gif$/i.test(data.image.url)) {
					// Error
					trigger_error.call(this, "Image viewing limit has been exceeded");

					// Stop
					this.pause();
					return;
				}

				// Set info
				this.images[req.index].info = data;

				// Update size
				this.image_total_bytes[GalleryDownloader.IMAGE_FULL] += (data.image_original !== null) ? data.image_original.size_approx : data.image.size_approx;
				this.image_total_bytes[GalleryDownloader.IMAGE_RESIZED] += data.image.size_approx;

				// Next
				req.next();

				// Continue the image requester
				this.request_image.resume(true);
			}
			else {
				// Error
				if (data[0] == API.ERROR_REQUEST) {
					trigger_error.call(this, "Request for image page failed");
				}
				else if (data[0] == API.ERROR_REQUEST_STATUS) {
					trigger_error.call(this, "Request status for image page was not 200: " + data[1] + "; " + data[2]);
				}
				else { // if (data[0] == API.ERROR_PARSING) {
					trigger_error.call(this, "An error occured parsing the response for image page");
				}

				// Retry
				req.retry();
			}
		};

		var request_image = function (req) {
			var image_data = this.images[req.index],
				use_full = this.use_full_images,
				try_index = req.retry_index,
				using_data = null,
				using_method = GalleryDownloader.IMAGE_NOT_ACQUIRED,
				url_info;

			// Can't start yet
			if (image_data.info === null) return;

			// Acquire method
			if (
				try_index === 0 ||
				(
					use_full &&
					!this.allow_fallback_if_using_full_images &&
					image_data.info.image_original !== null
				)
			) {
				// Get the primary image
				if (use_full) {
					if (image_data.info.image_original === null) {
						/*<debug>*/debug_log("Requesting unresized image", { try_index: try_index, use_full: use_full, allow_fallback: this.allow_fallback_if_using_full_images });/*</debug>*/
						using_data = image_data.info.image;
						using_method = GalleryDownloader.IMAGE_UNRESIZED;
					}
					else {
						/*<debug>*/debug_log("Requesting full image", { try_index: try_index, use_full: use_full, allow_fallback: this.allow_fallback_if_using_full_images });/*</debug>*/
						using_data = image_data.info.image_original;
						using_method = GalleryDownloader.IMAGE_FULL;
					}
				}
				else {
					/*<debug>*/debug_log("Requesting regular image", { try_index: try_index, use_full: use_full, allow_fallback: this.allow_fallback_if_using_full_images });/*</debug>*/
					using_data = image_data.info.image;
					using_method = (image_data.info.image_original === null) ? GalleryDownloader.IMAGE_UNRESIZED : GalleryDownloader.IMAGE_RESIZED;
				}
			}
			else {
				if (use_full && try_index <= (image_data.info.image_original === null ? 0 : 1)) {
					// Get the resized image
					/*<debug>*/debug_log("Requesting resized image", { try_index: try_index, use_full: use_full, allow_fallback: this.allow_fallback_if_using_full_images });/*</debug>*/
					using_data = image_data.info.image;
					using_method = GalleryDownloader.IMAGE_RESIZED;
				}
				else if (image_data.info_fallback !== null) {
					// Get the fallback image
					/*<debug>*/debug_log("Requesting fallback image", { try_index: try_index, use_full: use_full, allow_fallback: this.allow_fallback_if_using_full_images });/*</debug>*/
					using_data = image_data.info_fallback.image;
					using_method = GalleryDownloader.IMAGE_FALLBACK;
				}
				// Else, get the fallback page
/*<debug>*/
				else {
					debug_log("Requesting fallback page", { try_index: try_index, use_full: use_full, allow_fallback: this.allow_fallback_if_using_full_images });
				}
/*</debug>*/
			}

			// Get
			if (using_data !== null) {
				// Get image
				req.request = API.request_data(
					using_data.url, // url
					bind(on_request_image_load, this, req, using_data, using_method), // on_load
					bind(on_request_image_error, this, req), // on_error
					null, // on_complete
					bind(on_request_progress, this, req, "image_progress") // on_progress
				);
			}
			else {
				// Get fallback page
				url_info = API.get_gallery_image_url_info(image_data.info_from_gallery.url);
				image_data = image_data.info;

				req.request = API.get_image_info(
					image_data.gallery.gid, // gid
					url_info && url_info.key ? url_info.key : image_data.navigation.key_current, // key
					image_data.page, // page
					null, // api_key
					image_data.navigation.direct_id, // direct_id
					bind(on_request_image_fallback_page_callback, this, req), // callback
					null, // on_load
					null, // on_error
					null, // on_complete
					null // on_progress
				);
			}
		};
		var request_image_done = function (req) {
			// Done check
			if (req.index >= this.images.length) {
				// Done
				state_change.call(this, GalleryDownloader.COMPLETED);
				return true;
			}
			return false;
		};
		var on_request_image_load = function (req, using_data, using_method, response, status, status_text) {
			req.stop(true);

			if (status != 200) {
				// Error
				trigger_error.call(this, "Request status for image was not 200: " + status + "; " + status_text);

				// Retry
				req.retry();
				return;
			}

			// Check for invalid
			if (response.length <= 200) {
				var s = ZipCreator.array_to_string(response);

				if (/you\s+have\s+exceeded\s+your\s+image\s+viewing\s+limits/i.test(s)) {
					// Error
					trigger_error.call(this, "Image viewing limit has been exceeded");

					// Stop
					this.pause();
					return;
				}
				else if (/invalid\s+token/i.test(s)) {
					// Error
					trigger_error.call(this, "Invalid token error encountered");

					// Stop
					this.pause();
					return;
				}
			}

			// Set info
			var image_data = this.images[req.index],
				data = image_data.info;

			this.image_total_bytes[GalleryDownloader.IMAGE_FULL] -= (data.image_original !== null) ? data.image_original.size_approx : data.image.size_approx;
			this.image_total_bytes[GalleryDownloader.IMAGE_FULL] += response.length;
			this.image_total_bytes[GalleryDownloader.IMAGE_RESIZED] -= data.image.size_approx;
			this.image_total_bytes[GalleryDownloader.IMAGE_RESIZED] += response.length;
			this.image_total_bytes_loaded += response.length;

			--this.image_counts[image_data.used.method];
			++this.image_counts[using_method];

			image_data.used.method = using_method;
			image_data.used.data = using_data;
			image_data.byte_data = response;

			// Next
			req.next();
		};
		var on_request_image_error = function (req, event) {
			req.stop(true);

			if (event != "abort") {
				// Error
				trigger_error.call(this, "Request for image failed");

				// Retry
				req.retry();
			}
		};
		var on_request_image_fallback_page_callback = function (req, status, data) {
			req.stop(true);

			if (status == API.OK) {
				// Set info
				this.images[req.index].info_fallback = data;

				// Delay next
				req.delay(GalleryDownloader.DELAY_OKAY, true);
			}
			else {
				// Error
				if (data[0] == API.ERROR_REQUEST) {
					trigger_error.call(this, "Request for image fallback page failed");
				}
				else if (data[0] == API.ERROR_REQUEST_STATUS) {
					trigger_error.call(this, "Request status for image fallback page was not 200: " + data[1] + "; " + data[2]);
				}
				else { // if (data[0] == API.ERROR_PARSING) {
					trigger_error.call(this, "An error occured parsing the response for image fallback page");
				}

				// Retry
				req.retry();
			}
		};

		var on_request_progress = function (req, progress_event, percent, loaded, total) {
			// Update
			req.progress = percent;
			req.progress_loaded = loaded;
			req.progress_total = total;

			// Event
			trigger.call(this, progress_event, {
				downloader: this,
				progress: percent,
				loaded: loaded,
				total: total,
			});
		};



		GalleryDownloader.prototype = {
			constructor: GalleryDownloader,

			pause: function () {
				// Already not active
				if (!this.active) return;

				// Stop state
				if (this.request_gallery.stop(false)) {
					this.request_gallery.delay(GalleryDownloader.DELAY_ABORT, true);
				}
				if (this.request_image_page.stop(false)) {
					this.request_image_page.delay(GalleryDownloader.DELAY_ABORT, true);
				}
				if (this.request_image.stop(false)) {
					this.request_image.delay(GalleryDownloader.DELAY_ABORT, true);
				}

				// Inactive
				this.active = false;
				trigger.call(this, "active_change", {
					downloader: this,
					active: this.active,
				});
			},
			resume: function () {
				// Already active or done
				if (this.active || this.state == GalleryDownloader.COMPLETED) return;

				// Active
				this.active = true;
				trigger.call(this, "active_change", {
					downloader: this,
					active: this.active,
				});

				// Resume state
				state_resume.call(this);
			},

			is_active: function () {
				return this.active;
			},
			is_done: function () {
				return (this.state == GalleryDownloader.COMPLETED);
			},

			get_request_timeout: function () {
				return this.request_timeout;
			},
			set_request_timeout: function (timeout) {
				this.request_timeout = Math.max(1.0, timeout);
			},

			get_image_max_retry_count: function () {
				return this.request_image.retry_max;
			},
			set_image_max_retry_count: function (retry_count) {
				this.request_image.retry_max = Math.max(0, Math.floor(retry_count));
			},

			get_max_filename_length: function () {
				return this.max_filename_length;
			},
			set_max_filename_length: function (max_length) {
				this.max_filename_length = Math.max(10, Math.floor(max_length));
			},

			get_use_full_images: function () {
				return this.use_full_images;
			},
			set_use_full_images: function (use_full) {
				this.use_full_images = use_full;
			},
			get_allow_fallback_if_using_full_images: function () {
				return this.allow_fallback_if_using_full_images;
			},
			set_allow_fallback_if_using_full_images: function (allow) {
				this.allow_fallback_if_using_full_images = allow;
			},

			get_state: function () {
				return this.state;
			},

			get_gallery_page_count: function () {
				return this.page_count;
			},
			get_image_count: function () {
				return this.images.length;
			},
			get_image_type_counts: function () {
				return this.image_counts;
			},
			get_image_total_bytes: function () {
				if (this.request_image_page.index >= this.images.length) {
					return this.image_total_bytes[this.use_full_images ? GalleryDownloader.IMAGE_FULL : GalleryDownloader.IMAGE_RESIZED];
				}
				else {
					return this.image_total_bytes[GalleryDownloader.IMAGE_NOT_ACQUIRED];
				}
			},
			get_image_total_bytes_loaded: function () {
				return this.image_total_bytes_loaded;
			},
			get_current_image_bytes_loaded: function () {
				return this.request_image.request === null ? 0 : this.request_image.progress_loaded;
			},
			get_current_image_bytes_total: function () {
				return this.request_image.request === null ? 0 : this.request_image.progress_total;
			},

			set_image_ranges: function (text) {
				if (this.gal_info !== null) return false; // Cannot be set once started

				// Parse
				var parts = text.split(","),
					ranges = [],
					re = /^\s*(?:([0-9]+)\s*(-\s*([0-9]+)?)?|(?:-\s*([0-9]+)?)|(all))\s*$/i,
					min_value = 1,
					i, m, v1, v2, vt, r;

				for (i = 0; i < parts.length; ++i) {
					if ((m = re.exec(parts[i])) === null) continue;

					if (m[1] !== undefined) {
						v1 = Math.max(min_value, parseInt(m[1], 10));
						if (m[2] === undefined) {
							// "x"
							v2 = v1;
						}
						else if (m[3] === undefined) {
							// "x-"
							v2 = null;
							if (v1 <= min_value) {
								// "1-" is the same as "all"
								this.image_ranges = [];
								return true;
							}
						}
						else {
							// "x-y"
							v2 = Math.max(min_value, parseInt(m[3], 10));
							if (v2 < v1) {
								// Flip
								vt = v1;
								v1 = v2;
								v2 = vt;
							}
						}
					}
					else if (m[4] !== undefined) {
						// "-x"
						v1 = 1;
						v2 = Math.max(min_value, parseInt(m[4], 10));
					}
					else {
						// "all" | "-"
						this.image_ranges = [];
						return true;
					}

					ranges.push([ v1 , v2 ]);
				}

				// Sort
				ranges.sort(function (a, b) {
					if (a[0] === b[0]) return 0;
					return (a[0] < b[0]) ? -1 : 1;
				});

				// Normalize
				this.image_ranges = [ (r = ranges[0]) ];
				for (i = 1; i < ranges.length; ++i) {
					if (r[1] === null) break;

					if (ranges[i][0] <= r[1] + 1) {
						r[1] = ranges[i][1];
					}
					else {
						this.image_ranges.push((r = ranges[i]));
					}
				}

				// Okay
				return true;
			},
			get_image_ranges: function () {
				// All
				if (this.image_ranges.length === 0) return "all";

				// Form string
				var s = "",
					i, v;

				for (i = 0; i < this.image_ranges.length; ++i) {
					v = this.image_ranges[i];

					if (i > 0) s += ", ";

					s += v[0];
					if (v[1] !== v[0]) {
						s += "-";
						if (v[1] !== null) {
							s += v[1];
						}
					}
				}

				return s;
			},

			on: Events.on(),
			off: Events.off(),

		};



		return GalleryDownloader;

	})();

	// Gallery downloader (GUI/manager)
	var GalleryDownloadManager = (function () {

		var GalleryDownloadManager = function (gallery, container, thumb_loader) {
			// Vars
			var n0;

			// Create
			this.loader = new GalleryDownloader(gallery, thumb_loader);
			this.zip = new ZipCreator();
			this.zip_blob_urls = [];
			this.zip_blob_script_urls = [];

			// Values
			this.filename_mode = constants.MAIN_NAME_FULL;
			this.filename_ext_mode = constants.FILE_EXTENSION_ZIP;
			this.image_naming_mode = constants.IMAGE_NAMING_SINGLE_NUMBER;
			this.numbering_mode = constants.NUMBERING_RENUMBER;

			this.zip_info_json_name = "info.json";
			this.zip_info_json_mode = constants.JSON_READABLE_2SPACE;

			// Title
			this.node_title = document.documentElement.querySelector("title");
			this.title_default = this.node_title ? this.node_title.textContent || "" : "";
			this.title_started = false;

			// Nodes
			this.node_main_link = null;
			this.node_main_links_container = null;

			this.node_info_status = null;
			this.node_info_count = null;
			this.node_info_error = null;

			this.node_opts_filename_mode = null;
			this.node_opts_filename_ext_mode = null;
			this.node_opts_filename_length = null;
			this.node_opts_image_naming_mode = null;
			this.node_opts_zip_info_json_mode = null;
			this.node_opts_numbering_mode = null;

			this.node_progress_gallery = null;
			this.node_progress_gallery_text = null;
			this.node_progress_image_pages = null;
			this.node_progress_image_pages_text = null;
			this.node_progress_images = null;
			this.node_progress_images_text = null;
			this.node_progress_image_size = null;
			this.node_progress_image_size_text = null;
			this.node_progress_image_current = null;
			this.node_progress_image_current_text = null;
			this.node_progress_timeout = null;
			this.node_progress_timeout_indicator = null;

			this.node_zip_info_json_name = null;

			this.node_full_image_checkbox = null;
			this.node_non_full_image_fallback = null;

			this.node_failure_timeout = null;
			this.node_failure_retry_max = null;

			this.node_file_ranges = null;

			// Create nodes
			n0 = $("div", "eze_gallery_custom_container_inner", [ //{
				$("div", "eze_dl_title", [
					this.node_main_link = $("a", "eze_dl_link", null, "Begin downloading"),
				]),
				this.node_main_links_container = $("div", "eze_dl_links eze_dl_links_hidden"),
				$("div", "eze_dl_info_container", [
					this.node_info_status = $("div", "eze_dl_info eze_dl_info_visible", "Downloading has not started"),
					this.node_info_count = $("div", "eze_dl_info", ""),
					this.node_info_error = $("div", "eze_dl_info eze_dl_info_error", ""),
				]),
				$("div", "eze_dl_progress_bar eze_dl_progress_bar_gallery", [
					this.node_progress_gallery = $("div", "eze_dl_progress_bar_bg"),
					$("div", "eze_dl_progress_bar_text", [
						$.text("Gallery progress: "),
						this.node_progress_gallery_text = $.text(),
					]),
				]),
				$("div", "eze_dl_progress_bar eze_dl_progress_bar_image_pages", [
					this.node_progress_image_pages = $("div", "eze_dl_progress_bar_bg"),
					$("div", "eze_dl_progress_bar_text", [
						$.text("Image page progress: "),
						this.node_progress_image_pages_text = $.text(),
					]),
				]),
				$("div", "eze_dl_progress_bar eze_dl_progress_bar_images", [
					this.node_progress_images = $("div", "eze_dl_progress_bar_bg"),
					$("div", "eze_dl_progress_bar_text", [
						$.text("Image progress: "),
						this.node_progress_images_text = $.text(),
					]),
				]),
				$("div", "eze_dl_progress_bar eze_dl_progress_bar_image_size", [
					this.node_progress_image_size = $("div", "eze_dl_progress_bar_bg"),
					$("div", "eze_dl_progress_bar_text", [
						$.text("Image byte progress: "),
						this.node_progress_image_size_text = $.text(),
					]),
				]),
				$("div", "eze_dl_progress_bar eze_dl_progress_bar_timeout", [
					this.node_progress_timeout = $("div", "eze_dl_progress_bar_bg_light"),
					this.node_progress_image_current = $("div", "eze_dl_progress_bar_bg"),
					this.node_progress_timeout_indicator = $("div", "eze_dl_progress_bar_indicator eze_dl_progress_bar_indicator_hidden"),
					$("div", "eze_dl_progress_bar_text", [
						$.text("Current image progress: "),
						this.node_progress_image_current_text = $.text(),
					]),
				]),
				$("div", "eze_dl_title eze_dl_title_pad_above", "Download settings"),
				$("div", [
					$("div", "eze_dl_setting", [
						$("div", "eze_dl_setting_row", [
							$("div", "eze_dl_setting_cell", [
								$("div", "eze_dl_setting_title", "Download ranges"),
								$("div", "eze_dl_setting_desc", [
									$.text("Page range(s) to download; hover the following examples for more info:"),
									$("span", "eze_dl_setting_desc_tag", "all", { title: "Downloads all images; whitespace is ignored" }),
									$("span", "eze_dl_setting_desc_tag", "4 - 16, 18, 27 - 37", { title: "Downloads 25 images; image ranges are inclusive" }),
									$("span", "eze_dl_setting_desc_tag", "32 -", { title: "Downloads images 32 to the end; omitting a number defaults to first/last image" }),
									$("span", "eze_dl_setting_desc_tag", "- 31", { title: "Downloads images 1 - 31 inclusive; first number is omitted in this case" }),
								]),
							]),
							$("div", "eze_dl_setting_cell", [
								$("div", [
									this.node_file_ranges = $("input", "eze_dl_setting_input", { type: "text" }),
								]),
							]),
						]),
					]),
					$("div", "eze_dl_setting", [
						$("div", "eze_dl_setting_row", [
							$("div", "eze_dl_setting_cell", [
								$("div", "eze_dl_setting_title", "Output filename"),
								$("div", "eze_dl_setting_desc", "Set the primary output .zip file's name"),
							]),
							$("div", "eze_dl_setting_cell", [
								$("div", [
									(this.node_opts_filename_mode = new OptionBox([
										[ "Full gallery name", constants.MAIN_NAME_FULL ],
										[ "Short gallery name", constants.MAIN_NAME_SHORT ],
									], this.filename_mode, bind(on_option_filename_change, this))).node,
									(this.node_opts_filename_ext_mode = new OptionBox([
										[ ".zip", constants.FILE_EXTENSION_ZIP ],
										[ ".cbz", constants.FILE_EXTENSION_CBZ ],
									], this.filename_ext_mode, bind(on_option_filename_ext_change, this))).node,
								]),
								$("div", [
									$("span", null, "Max filename length: "),
									this.node_opts_filename_length = $("input", "eze_dl_setting_input eze_dl_setting_input_small", { type: "text", title: "Includes extension" }),
								]),
							]),
						]),
					]),
					$("div", "eze_dl_setting", [
						$("div", "eze_dl_setting_row", [
							$("div", "eze_dl_setting_cell", [
								$("div", "eze_dl_setting_title", "Image filename"),
								$("div", "eze_dl_setting_desc", "Individual image naming method"),
							]),
							$("div", "eze_dl_setting_cell", [
								(this.node_opts_image_naming_mode = new OptionBox([
									[ "Single number", constants.IMAGE_NAMING_SINGLE_NUMBER ],
									[ "Full gallery name + number", constants.IMAGE_NAMING_FULL_NAME ],
									[ "Short gallery name + number", constants.IMAGE_NAMING_SHORT_NAME ],
									[ "Original filenames", constants.IMAGE_NAMING_ORIGINAL_NAME ],
									[ "Number + original filename", constants.IMAGE_NAMING_NUMBERED_ORIGINAL ],
								], this.image_naming_mode, bind(on_option_image_name_change, this))).node,
							]),
						]),
					]),
					$("div", "eze_dl_setting", [
						$("div", "eze_dl_setting_row", [
							$("div", "eze_dl_setting_cell", [
								$("div", "eze_dl_setting_title", "Image numbering"),
								$("div", "eze_dl_setting_desc", "How to set the image numbers if download ranges are used"),
							]),
							$("div", "eze_dl_setting_cell", [
								(this.node_opts_numbering_mode = new OptionBox([
									[ "Re-number to start at 1", constants.NUMBERING_RENUMBER ],
									[ "Use the original numbers", constants.NUMBERING_ORIGINAL ],
								], this.numbering_mode, bind(on_option_numbering_mode_change, this))).node,
							]),
						]),
					]),
					$("div", "eze_dl_setting", [
						$("div", "eze_dl_setting_row", [
							$("div", "eze_dl_setting_cell", [
								$("div", "eze_dl_setting_title", "JSON info file"),
								$("div", "eze_dl_setting_desc", "A data file containing information about the gallery, such as tags"),
							]),
							$("div", "eze_dl_setting_cell", [
								$("div", [
									(this.node_opts_zip_info_json_mode = new OptionBox([
										[ "Omit", constants.JSON_OMIT ],
										[ "Compressed", constants.JSON_COMPRESSED ],
										[ "Human readable (2 space indent)", constants.JSON_READABLE_2SPACE ],
										[ "Human readable (4 space indent)", constants.JSON_READABLE_4SPACE ],
										[ "Human readable (tab indent)", constants.JSON_READABLE_TABS ],
									], this.zip_info_json_mode, bind(on_option_zip_info_json_mode_change, this))).node,
								]),
								$("div", [
									this.node_zip_info_json_name = $("input", "eze_dl_setting_input", { type: "text" }),
								]),
							]),
						]),
					]),
					$("div", "eze_dl_setting", [
						$("div", "eze_dl_setting_row", [
							$("div", "eze_dl_setting_cell", [
								$("div", "eze_dl_setting_title", "Image size"),
								$("div", "eze_dl_setting_desc", "Preference for downloading full sized images"),
							]),
							$("div", "eze_dl_setting_cell", [
								$("label", "eze_dl_label", [
									this.node_full_image_checkbox = $("input", { type: "checkbox" }),
									$("span", null, "Download full-sized images if available"),
								]),
								$("br"),
								$("label", "eze_dl_label", [
									this.node_non_full_image_fallback = $("input", { type: "checkbox" }),
									$("span", null, "Allow non-full-sized images to be downloaded if a timeout error occurs"),
								]),
							]),
						]),
					]),
					$("div", "eze_dl_setting", [
						$("div", "eze_dl_setting_row", [
							$("div", "eze_dl_setting_cell", [
								$("div", "eze_dl_setting_title", "Failure"),
								$("div", "eze_dl_setting_desc", "What do do when things go wrong"),
							]),
							$("div", "eze_dl_setting_cell", [
								$("div", [
									$("span", null, "Timeout for failure: "),
									this.node_failure_timeout = $("input", "eze_dl_setting_input eze_dl_setting_input_small", { type: "text", title: "Units: seconds" }),
								]),
								$("div", [
									$("span", null, "Maximum image retry count: "),
									this.node_failure_retry_max = $("input", "eze_dl_setting_input eze_dl_setting_input_small", { type: "text" }),
								]),
							]),
						]),
					]),
				]),
			]); //}

			// Setup values
			this.node_opts_filename_length.value = this.loader.get_max_filename_length();
			this.node_failure_timeout.value = this.loader.get_request_timeout();
			this.node_failure_retry_max.value = this.loader.get_image_max_retry_count();
			this.node_full_image_checkbox.checked = this.loader.get_use_full_images();
			this.node_non_full_image_fallback.checked = this.loader.get_allow_fallback_if_using_full_images();
			this.node_zip_info_json_name.value = this.zip_info_json_name;
			this.node_file_ranges.value = this.loader.get_image_ranges();

			// Setup events
			this.node_opts_filename_length.addEventListener("change", bind(on_option_max_filename_length_change, this));
			this.node_main_link.addEventListener("click", bind(on_main_link_click, this));
			this.node_full_image_checkbox.addEventListener("change", bind(on_option_full_images_change, this));
			this.node_non_full_image_fallback.addEventListener("change", bind(on_option_non_full_image_fallback_change, this));
			this.node_failure_timeout.addEventListener("change", bind(on_option_failure_timeout_change, this));
			this.node_failure_retry_max.addEventListener("change", bind(on_option_failure_retry_max_change, this));
			this.node_zip_info_json_name.addEventListener("change", bind(on_option_zip_info_json_name_change, this));
			this.node_file_ranges.addEventListener("change", bind(on_option_file_ranges_change, this));

			this.loader.on("error", bind(on_loader_error, this));
			this.loader.on("active_change", bind(on_loader_active_change, this));
			this.loader.on("state_change", bind(on_loader_state_change, this));
			this.loader.on("gallery_page_get", bind(on_loader_gallery_page_get, this));
			this.loader.on("image_page_get", bind(on_loader_image_page_get, this));
			this.loader.on("image_get", bind(on_loader_image_get, this));
			this.loader.on("image_progress", bind(on_loader_image_progress, this));
			this.loader.on("image_timeout_progress", bind(on_loader_image_timeout_progress, this));
			this.loader.on("image_range_update", bind(on_loader_image_range_update, this));

			this.page_close_warning_cb = null;

			// Load settings
			load_values.call(this);

			// Update text
			update_main_link_text.call(this);
			update_info_status_text.call(this);
			update_progress_bars.call(this);
			update_timeout_progress_bar.call(this, 0, 0);

			// Show
			container.appendChild(n0);
			container.classList.add("eze_dl_container_visible");
		};



		var constants = {
			MAIN_NAME_FULL: 0,
			MAIN_NAME_SHORT: 1,

			FILE_EXTENSION_ZIP: 0,
			FILE_EXTENSION_CBZ: 1,

			IMAGE_NAMING_SINGLE_NUMBER: 0,
			IMAGE_NAMING_FULL_NAME: 1,
			IMAGE_NAMING_SHORT_NAME: 2,
			IMAGE_NAMING_ORIGINAL_NAME: 3,
			IMAGE_NAMING_NUMBERED_ORIGINAL: 4,

			NUMBERING_RENUMBER: 0,
			NUMBERING_ORIGINAL: 1,

			JSON_OMIT: 0,
			JSON_COMPRESSED: 1,
			JSON_READABLE_2SPACE: 2,
			JSON_READABLE_4SPACE: 3,
			JSON_READABLE_TABS: 4,
		};

		var valid_extensions = {
			".jpg": ".jpg",
			".jpeg": ".jpg",
			".png": ".png",
			".gif": ".gif",
			"": ".jpg",
		};



		var save_values = function () {
			// Save
			Save.set("eze_downloader", {
				filename_mode: this.filename_mode,
				filename_ext_mode: this.filename_ext_mode,
				image_naming_mode: this.image_naming_mode,
				numbering_mode: this.numbering_mode,
				zip_info_json_name: this.zip_info_json_name,
				zip_info_json_mode: this.zip_info_json_mode,
				use_full_images: this.loader.get_use_full_images(),
				allow_fallback_if_using_full_images: this.loader.get_allow_fallback_if_using_full_images(),
				request_timeout: this.loader.get_request_timeout(),
				image_max_retry_count: this.loader.get_image_max_retry_count(),
				max_filename_length: this.loader.get_max_filename_length(),
			});
		};
		var load_values = function () {
			// Get the value
			var self = this;
			Save.get("eze_downloader", function (value, okay) {
				if (okay && value) {
					// Update
					if (validate(value.filename_mode, [ constants.MAIN_NAME_FULL , constants.MAIN_NAME_SHORT ])) {
						self.filename_mode = value.filename_mode;
						self.node_opts_filename_mode.set(self.filename_mode);
					}
					if (validate(value.filename_ext_mode, [ constants.FILE_EXTENSION_ZIP , constants.FILE_EXTENSION_CBZ ])) {
						self.filename_ext_mode = value.filename_ext_mode;
						self.node_opts_filename_ext_mode.set(self.filename_ext_mode);
					}
					if (validate(value.image_naming_mode, [ constants.IMAGE_NAMING_SINGLE_NUMBER , constants.IMAGE_NAMING_FULL_NAME , constants.IMAGE_NAMING_SHORT_NAME , constants.IMAGE_NAMING_ORIGINAL_NAME , constants.IMAGE_NAMING_NUMBERED_ORIGINAL ])) {
						self.image_naming_mode = value.image_naming_mode;
						self.node_opts_image_naming_mode.set(self.image_naming_mode);
					}
					if (validate(value.numbering_mode, [ constants.NUMBERING_RENUMBER , constants.NUMBERING_ORIGINAL ])) {
						self.numbering_mode = value.numbering_mode;
						self.node_opts_numbering_mode.set(self.numbering_mode);
					}
					if (validate(value.zip_info_json_mode, [ constants.JSON_OMIT , constants.JSON_COMPRESSED , constants.JSON_READABLE_2SPACE , constants.JSON_READABLE_4SPACE , constants.JSON_READABLE_TABS ])) {
						self.zip_info_json_mode = value.zip_info_json_mode;
						self.node_opts_zip_info_json_mode.set(self.zip_info_json_mode);
					}
					if ("zip_info_json_name" in value) {
						self.zip_info_json_name = filename_normalize(value.zip_info_json_name || "");
						if (self.zip_info_json_name.length === 0) self.zip_info_json_name = "info.json";
						self.node_zip_info_json_name.value = self.zip_info_json_name;
					}
					if ("use_full_images" in value) {
						self.loader.set_use_full_images(!!value.use_full_images);
						self.node_full_image_checkbox.checked = self.loader.get_use_full_images();
					}
					if ("allow_fallback_if_using_full_images" in value) {
						self.loader.set_allow_fallback_if_using_full_images(!!value.allow_fallback_if_using_full_images);
						self.node_non_full_image_fallback.checked = self.loader.get_allow_fallback_if_using_full_images();
					}
					if ("request_timeout" in value) {
						self.loader.set_request_timeout(value.request_timeout);
						self.node_failure_timeout.value = self.loader.get_request_timeout();
					}
					if ("image_max_retry_count" in value) {
						self.loader.set_image_max_retry_count(value.image_max_retry_count);
						self.node_failure_retry_max.value = self.loader.get_image_max_retry_count();
					}
					if ("max_filename_length" in value) {
						self.loader.set_max_filename_length(value.max_filename_length);
						self.node_opts_filename_length.value = self.loader.get_max_filename_length();
					}
				}
			});
		};

		var validate = function (value, okay_values) {
			return okay_values.indexOf(value) >= 0;
		};

		var fraction_to_percent = function (f, decimals) {
			return (f * 100).toFixed(decimals) + "%";
		};

		var filename_normalize = (function () {

			var filename_normalize = function (name) {
				name = name.replace(/[\x00-\x1F]+/g, "");
				name = name.replace(re_pattern, function (m) {
					return char_map[m];
				});

				return name;
			};



			var char_map = {
				"\"": "\u201d",
				"<": "\uff1c",
				">": "\uff1e",
				":": "\uff1a",
				"|": "\uff5c",
				"?": "\uff1f",
				"*": "\uff0a",
				"/": "\uff0f",
				"\\": "\uff3c",
			};
			var re_pattern = "[",
				k;

			for (k in char_map) {
				re_pattern += k.replace(/([^\w\s])/g, "\\$1");
			}

			re_pattern += "]";
			re_pattern = new RegExp(re_pattern, "g");



			return filename_normalize;

		})();
		var filename_get_ext = function (name) {
			var m = /(\.[^\/\.]*)$/.exec(name);
			if (m) return m[1];
			return "";
		};
		var filename_remove_ext = function (name) {
			return name.replace(/(\.[^\/\.]*)$/, "");
		};

		var update_main_link_text = function () {
			var state = this.loader.get_state();

			if (state == GalleryDownloader.NOT_STARTED) {
				this.node_main_link.text = "Begin download";
			}
			else if (state == GalleryDownloader.COMPLETED) {
				if (this.zip_blob_urls.length < 2) {
					this.node_main_link.text = "Click to download file";
				}
				else {
					this.node_main_link.text = "Click the links below to download the zip archive";
				}
			}
			else {
				if (this.loader.is_active()) {
					this.node_main_link.text = "Pause download";
				}
				else {
					this.node_main_link.text = "Resume download";
				}
			}
		};
		var update_info_status_text = function () {
			var state = this.loader.get_state();

			if (state == GalleryDownloader.NOT_STARTED) {
				this.node_info_status.textContent = "Downloading has not started";
			}
			else if (state == GalleryDownloader.REQUESTING_GALLERY_PAGES) {
				this.node_info_status.textContent = "Step 1 / 2 : Downloading gallery info";
			}
			else if (state == GalleryDownloader.REQUESTING_IMAGES) {
				this.node_info_status.textContent = "Step 2 / 2 : Downloading images";
			}
			else if (state == GalleryDownloader.COMPLETED) {
				this.node_info_status.textContent = "Downloading complete";
			}
		};
		var update_progress_bars = function () {
			var state = this.loader.get_state(),
				gallery_p = 0.0,
				gallery_t = "none",
				image_page_p = 0.0,
				image_page_t =  "none",
				images_p = 0.0,
				images_t = "none",
				num, dem;


			// Progress calculations
			if (state != GalleryDownloader.NOT_STARTED) {
				if (state == GalleryDownloader.REQUESTING_GALLERY_PAGES || state == GalleryDownloader.REQUESTING_IMAGES) {
					// Gallery progress
					num = this.loader.request_gallery.index;
					dem = this.loader.get_gallery_page_count();

					if (dem > 0) {
						gallery_p = num / dem;
					}

					gallery_t = "" + num;
					if (dem > 0) {
						gallery_t += " / " + dem;
					}
					else {
						gallery_t += " / ?";
					}
					gallery_t += " (" + fraction_to_percent(gallery_p, 0) + ")";
				}

				if (state == GalleryDownloader.REQUESTING_IMAGES) {
					// Image page progress
					num = this.loader.request_image_page.index;
					dem = this.loader.get_image_count();

					image_page_p = num / dem;

					image_page_t = "" + num + " / " + dem;
					image_page_t += " (" + fraction_to_percent(image_page_p, 0) + ")";

					// Image progress
					num = this.loader.request_image.index;

					images_p = num / dem;

					images_t = "" + num + " / " + dem;
					images_t += " (" + fraction_to_percent(images_p, 0) + ")";
				}
				else if (state == GalleryDownloader.COMPLETED) {
					gallery_p = 1.0;
					gallery_t = "done";

					image_page_p = 1.0;
					image_page_t = "done";

					images_p = 1.0;
					images_t = "done";
				}
			}


			// Node updates
			this.node_progress_gallery.style.width = fraction_to_percent(gallery_p, 2);
			this.node_progress_gallery_text.nodeValue = gallery_t;

			this.node_progress_image_pages.style.width = fraction_to_percent(image_page_p, 2);
			this.node_progress_image_pages_text.nodeValue = image_page_t;

			this.node_progress_images.style.width = fraction_to_percent(images_p, 2);
			this.node_progress_images_text.nodeValue = images_t;

			update_byte_progress_bar.call(this);
		};
		var update_byte_progress_bar = function () {
			var state = this.loader.get_state(),
				bytes_p = 0.0,
				bytes_t = "none",
				bytes_p2 = 0.0,
				bytes_t2 = "none",
				num, den;


			// Progress calculations
			if (state != GalleryDownloader.NOT_STARTED) {
				if (state == GalleryDownloader.REQUESTING_IMAGES) {
					// Image progress
					num = this.loader.get_current_image_bytes_loaded();
					den = this.loader.get_current_image_bytes_total();
					if (den === 0) {
						bytes_p2 = 0;
						bytes_t2 = "0%";
					}
					else {
						bytes_p2 = num / den;
						bytes_t2 = "" + bytes_to_labeled_string(num) + " / " + bytes_to_labeled_string(den);
						bytes_t2 += " (" + fraction_to_percent(bytes_p2, 0) + ")";
					}

					// Total image progress
					num += this.loader.get_image_total_bytes_loaded();
					den = Math.max(num, this.loader.get_image_total_bytes());
					bytes_p = num / den;

					bytes_t = "" + bytes_to_labeled_string(num) + " / " + bytes_to_labeled_string(den);
					bytes_t += " (" + fraction_to_percent(bytes_p, 0) + ")";
				}
				else if (state == GalleryDownloader.COMPLETED) {
					bytes_p = 1.0;
					bytes_t = "done";
					bytes_p2 = 1.0;
					bytes_t2 = "done";
				}
			}


			// Node updates
			this.node_progress_image_size.style.width = fraction_to_percent(bytes_p, 2);
			this.node_progress_image_size_text.nodeValue = bytes_t;

			this.node_progress_image_current.style.width = fraction_to_percent(bytes_p2, 2);
			this.node_progress_image_current_text.nodeValue = bytes_t2;

			title_update.call(this, bytes_p);
		};
		var update_timeout_progress_bar = function (percent) {
			var p = fraction_to_percent(percent, 2);

			this.node_progress_timeout.style.width = p;
			this.node_progress_timeout_indicator.style.width = p;
			if (percent <= 0) {
				this.node_progress_timeout_indicator.classList.add("eze_dl_progress_bar_indicator_hidden");
			}
			else {
				this.node_progress_timeout_indicator.classList.remove("eze_dl_progress_bar_indicator_hidden");
			}
		};
		var update_image_counters = function () {
			// vars
			var type_counts = this.loader.get_image_type_counts(),
				t1 = type_counts[GalleryDownloader.IMAGE_FULL],
				t2 = type_counts[GalleryDownloader.IMAGE_UNRESIZED],
				t3 = type_counts[GalleryDownloader.IMAGE_RESIZED],
				t4 = type_counts[GalleryDownloader.IMAGE_FALLBACK],
				s = "";

			if (t1 + t2 + t3 + t4 > 0) {
				if (t1 > 0) {
					s += t1;
					s += " full sized image";
					if (t1 != 1) s += "s";
				}
				if (t2 > 0) {
					if (s.length > 0) s += " | ";
					s += t2;
					s += " unresized image";
					if (t2 != 1) s += "s";
				}
				if (t3 > 0) {
					if (s.length > 0) s += " | ";
					s += t3;
					s += " resized image";
					if (t3 != 1) s += "s";
				}
				if (t4 > 0) {
					if (s.length > 0) s += " | ";
					s += t4;
					s += " fallback image";
					if (t4 != 1) s += "s";
				}
			}
			else {
				s = "No images loaded";
			}

			this.node_info_count.textContent = s;
		};

		var get_ext = function () {
			if (this.filename_ext_mode == constants.FILE_EXTENSION_ZIP) {
				return ".zip";
			}
			else { // if (this.filename_ext_mode == constants.FILE_EXTENSION_CBZ) {
				return ".cbz";
			}
		};

		var get_final_filename = function () {
			// Get name
			var ext = get_ext.call(this),
				max_len, base_name;

			if (this.filename_mode == constants.MAIN_NAME_FULL) {
				base_name = filename_normalize.call(this, this.loader.gal_info.title);
			}
			else { // if (this.filename_mode == constants.MAIN_NAME_SHORT) {
				base_name = filename_normalize.call(this, this.loader.gal_title_info.title);
			}

			max_len = Math.max(0, this.loader.get_max_filename_length() - ext.length);
			if (base_name.length > max_len) {
				var ellipsis = "";
				base_name = base_name.substr(0, Math.max(max_len - ellipsis.length)) + ellipsis;
				if (base_name.length > max_len) {
					base_name = base_name.substr(0, max_len);
				}
			}

			// Apply to link
			return base_name + ext;
		};
		var update_final_filename = function () {
			if (this.zip_blob_urls.length > 0) {
				this.node_main_link.setAttribute("download", get_final_filename.call(this));
			}
		};
		var set_image_naming_mode = function (mode, number_mode) {
			// No change
			if (this.image_naming_mode == mode && this.numbering_mode == number_mode) return;

			// Update
			this.image_naming_mode = mode;
			this.numbering_mode = number_mode;

			// No change
			if (this.gal_info === null) return;

			// Update
			var base_name = get_zip_image_filename.call(this, null, null),
				changes = 0,
				file_count = Math.min(this.zip.get_file_count(), this.loader.get_image_count()),
				prev_name, new_name, i;

			for (i = 0; i < file_count; ++i) {
				// Update
				new_name = get_zip_image_filename.call(this, base_name, i);
				prev_name = this.zip.get_file_name(i);
				this.zip.set_file_name(i, new_name);
				if (new_name != prev_name) ++changes;
			}

			// Regenerate blob
			if (this.zip_blob_urls.length > 0) {
				create_zip.call(this);
			}
		};

		var revoke_urls = function () {
			var i;
			for (i = 0; i < this.zip_blob_urls.length; ++i) {
				window.URL.revokeObjectURL(this.zip_blob_urls[i]);
			}
			this.zip_blob_urls = [];

			for (i = 0; i < this.zip_blob_script_urls.length; ++i) {
				window.URL.revokeObjectURL(this.zip_blob_script_urls[i]);
			}
			this.zip_blob_script_urls = [];
		};

		var get_zip_image_filename = function (base_name, index) {
			// Get base name
			if (base_name === null) {
				if (this.loader.gal_info === null) {
					base_name = "";
				}
				else if (this.image_naming_mode == constants.IMAGE_NAMING_FULL_NAME) {
					base_name = filename_normalize.call(this, this.loader.gal_info.title) + " - ";
				}
				else if (this.image_naming_mode == constants.IMAGE_NAMING_SHORT_NAME) {
					base_name = filename_normalize.call(this, this.loader.gal_title_info.title) + " - ";
				}
				else {
					base_name = "";
				}

				if (index === null) return base_name;
			}

			// Settings
			var image_data = this.loader.images[index],
				digit_count = Math.max(3, ("" + this.loader.images.length).length),
				ext = filename_get_ext(image_data.image_url).toLowerCase(),
				n, number;

			if (ext.length === 0) ext = filename_get_ext(image_data.info.image.filename).toLowerCase();
			ext = valid_extensions[ext in valid_extensions ? ext : ""];

			n = (this.numbering_mode == constants.NUMBERING_RENUMBER ? index : image_data.image_id);
			number = "" + (n + 1);
			while (number.length < digit_count) number = "0" + number;

			// New name
			if (this.image_naming_mode == constants.IMAGE_NAMING_ORIGINAL_NAME) {
				// Set filename
				base_name += filename_normalize(filename_remove_ext(image_data.info.image.filename));
			}
			else if (this.image_naming_mode == constants.IMAGE_NAMING_NUMBERED_ORIGINAL) {
				// Set filename
				base_name += number;
				base_name += " - ";
				base_name += filename_normalize(filename_remove_ext(image_data.info.image.filename));
			}
			else {
				// Append number
				base_name += number;
			}
			base_name += ext;

			// Update
			return base_name;
		};
		var create_zip = function () {
			// Revoke
			var buffer, zip_blob;
			revoke_urls.call(this);

			this.node_main_links_container.innerHTML = "";
			this.node_main_links_container.classList.add("eze_dl_links_hidden");

			try {
				// Create
				// this.zip_blob = this.zip.to_blob(); // crashes firefox 49
				buffer = this.zip.to_buffer();
				zip_blob = ZipCreator.arraybuffer_to_blob(buffer);
				this.zip_blob_urls.push(window.URL.createObjectURL(zip_blob));

				// Apply link
				this.node_main_link.setAttribute("href", this.zip_blob_urls[0]);
			}
			catch (e) {
				create_multi_zip.call(this);
			}

			// Main link
			update_main_link_text.call(this);

			// Update filename
			update_final_filename.call(this);
		};
		var create_multi_zip = function () {
			// Revoke
			var i, buffers, zip_blob, n, n1, n2, fn, ext, names, filename;
			revoke_urls.call(this);

			try {
				// Create
				buffers = this.zip.to_buffer(1024 * 1024 * 100); // 100MB limit

				if (buffers.length > 1) {
					this.node_main_link.removeAttribute("href");
					this.node_main_links_container.classList.remove("eze_dl_links_hidden");

					ext = get_ext.call(this);
					names = [];
					filename = get_final_filename.call(this);

					for (i = 0; i < buffers.length; ++i) {
						zip_blob = ZipCreator.arraybuffer_to_blob(buffers[i]);
						this.zip_blob_urls.push(window.URL.createObjectURL(zip_blob));

						fn = "part" + (i + 1) + ext;
						n = $("div", "eze_dl_links_inner", [
							$("a", "eze_dl_links_single", fn, { href: this.zip_blob_urls[i], download: fn }),
						]);
						names.push(fn);

						this.node_main_links_container.appendChild(n);
					}

					n = $("div", "eze_dl_links_scripts", [
						$.text("File too large to download as a single file -- download all the parts and then combine them using one of the following scripts:"),
						$("div", [
							$("strong", null, "Windows script: "),
							n1 = $("a", null, "download"),
							$.text(" | "),
							$("strong", null, "Linux, Mac, etc. script: "),
							n2 = $("a", null, "download"),
						]),
						$("div", "eze_dl_links_script_name", [
							$.text("Filename: "),
							$("input", "eze_dl_setting_input", { type: "text", value: filename }),
						])
					]);
					this.node_main_links_container.appendChild(n);

					create_concat_scripts.call(this, names, ext, filename, n1, n2);
				}
				else {
					// Apply link
					zip_blob = ZipCreator.arraybuffer_to_blob(buffers[0]);
					this.zip_blob_urls.push(window.URL.createObjectURL(zip_blob));

					this.node_main_link.setAttribute("href", this.zip_blob_urls[0]);
				}
			}
			catch (e) {
				console.log(e);
			}
		};
		var update_zip_json = function () {
			// Skip if not done
			if (!this.loader.is_done()) return;

			// Remove
			if (this.zip.get_file_count() > this.loader.images.length) {
				this.zip.remove_file(this.zip.get_file_count() - 1);
			}

			// Skip
			if (this.zip_info_json_mode == constants.JSON_OMIT) return;

			// Settings
			var images = this.loader.images,
				gal_info = this.loader.gal_info,
				date = new Date(gal_info.date_uploaded),
				tab_mode, json_info, img, obj, i;

			if (this.zip_info_json_mode == constants.JSON_READABLE_2SPACE) {
				tab_mode = 2;
			}
			else if (this.zip_info_json_mode == constants.JSON_READABLE_4SPACE) {
				tab_mode = 4;
			}
			else if (this.zip_info_json_mode == constants.JSON_READABLE_TABS) {
				tab_mode = "\t";
			}


			// Create
			json_info = {
				gallery_info: {
					title: gal_info.title,
					title_original: gal_info.title_original,

					category: gal_info.category,
					tags: gal_info.tags,

					language: gal_info.language,
					translated: gal_info.translated,

					favorite_category: null,

					upload_date: [
						date.getFullYear(),
						date.getMonth() + 1,
						date.getDate(),
						date.getHours(),
						date.getMinutes(),
						date.getSeconds(),
					],

					source: {
						site: API.get_site(),
						gid: gal_info.gallery.gid,
						token: gal_info.gallery.token,
						parent_gallery: gal_info.parent,
						newer_versions: gal_info.newer_versions,
					},
				},
				image_api_key: (images.length > 0 && images[0].info) ? images[0].info.navigation.api_key : null,
				image_info: [],
			};

			// Set info
			if (gal_info.favorites.category >= 0 && gal_info.favorites.category_title !== null) {
				json_info.gallery_info.favorite_category = {
					id: gal_info.favorites.category,
					title: gal_info.favorites.category_title,
				};
			}

			// Set images
			for (i = 0; i < images.length; ++i) {
				img = images[i].info;

				obj = {
					image_key: img.navigation.key_current,
					direct_id: img.navigation.direct_id,
					width: images[i].used.data.width,
					height: images[i].used.data.height,
					original_filename: img.image.filename,
				};

				json_info.image_info.push(obj);
			}


			// Add to file
			this.zip.add_file(ZipCreator.string_to_array(JSON.stringify(json_info, null, tab_mode)), this.zip_info_json_name);

			// Done
			if (this.zip_blob_urls.length > 0) {
				create_zip.call(this);
			}
		};

		var create_concat_scripts = function (files, ext, filename, win_link, gnu_linux_or_as_ive_recently_taken_to_calling_it_gnu_plus_linux_link) {
			var s, temp_name, i, blob, url;

			temp_name = "output_" + (("" + Math.random()).replace(/[^0-9]+/g, "")) + ext;

			filename = filename.replace(/[^\x20-\x7e]+|\"/g, "");

			// Windows
			s = "copy ";
			for (i = 0; i < files.length; ++i) {
				if (i > 0) s += " + ";
				s += "/b \"";
				s += files[i];
				s += "\"";
			}

			s += " \"";
			s += temp_name;
			s += "\" /b || goto :eof\r\n";
			for (i = 0; i < files.length; ++i) {
				s += "\r\ndel \"";
				s += files[i];
				s += "\"";
			}

			s += "\r\n\r\nren \"";
			s += temp_name;
			s += "\" \"";
			s += filename;
			s += "\"\r\n";

			blob = new Blob([ ZipCreator.string_to_array(s) ], { type: "application/x-bat" });
			url = window.URL.createObjectURL(blob);
			this.zip_blob_script_urls.push(url);

			win_link.setAttribute("href", url);
			win_link.setAttribute("download", "join_script.bat");

			// Linux
			s = "#!/bin/sh\ncat";
			for (i = 0; i < files.length; ++i) {
				s += " \"";
				s += files[i];
				s += "\"";
			}

			s += " > \"";
			s += temp_name;
			s += "\" || exit 1\n";
			for (i = 0; i < files.length; ++i) {
				s += "\nrm \"";
				s += files[i];
				s += "\"";
			}

			s += "\n\nmv \"";
			s += temp_name;
			s += "\" \"";
			s += filename;
			s += "\"\n";

			blob = new Blob([ ZipCreator.string_to_array(s) ], { type: "text/x-shellscript" });
			url = window.URL.createObjectURL(blob);
			this.zip_blob_script_urls.push(url);

			gnu_linux_or_as_ive_recently_taken_to_calling_it_gnu_plus_linux_link.setAttribute("href", url);
			gnu_linux_or_as_ive_recently_taken_to_calling_it_gnu_plus_linux_link.setAttribute("download", "join_script.sh");
		};

		var title_init = function () {
			this.title_started = true;
			title_update.call(this, 0);
		};
		var title_update = function (progress) {
			if (this.node_title === null || !this.title_started) return;

			var p = Math.floor(progress * 100),
				title = "[" + p.toFixed(0) + "%] " + this.title_default;

			this.node_title.textContent = title;
		};
		var title_complete = function () {
			if (this.node_title === null) return;

			// Flash the title
			var flash_on = false,
				flash_count = 2,
				flash_id = flash_on ? -1 : 0,
				self = this,
				interval;

			interval = setInterval(function () {
				if (flash_on) {
					title_update.call(self, 1.0);
					if (++flash_id >= flash_count) {
						clearInterval(interval);
						return;
					}
				}
				else {
					self.node_title.textContent = "\xa0";
				}
				flash_on = !flash_on;
			}, 500);
		};

		var on_option_filename_change = function (value) {
			// Set
			this.filename_mode = value;
			update_final_filename.call(this);

			// Save
			save_values.call(this);
		};
		var on_option_filename_ext_change = function (value) {
			// Set
			this.filename_ext_mode = value;
			update_final_filename.call(this);

			// Save
			save_values.call(this);
		};
		var on_option_image_name_change = function (value) {
			// Update image naming mode
			set_image_naming_mode.call(this, value, this.numbering_mode);

			// Save
			save_values.call(this);
		};
		var on_option_zip_info_json_mode_change = function (value) {
			// Update image naming mode
			this.zip_info_json_mode = value;

			// Set
			update_zip_json.call(this);

			// Save
			save_values.call(this);
		};
		var on_option_max_filename_length_change = function () {
			var node = this.node_opts_filename_length,
				value, m;

			if (
				(m = /^\s*([\d.]+)/.exec(node.value)) &&
				!isNaN((value = parseFloat(m[1])))
			) {
				this.loader.set_max_filename_length(value);
			}

			// Update display value
			node.value = this.loader.get_max_filename_length();
			update_final_filename.call(this);

			// Save
			save_values.call(this);
		};
		var on_option_full_images_change = function () {
			var node = this.node_full_image_checkbox,
				value = node.checked;

			// Set
			this.loader.set_use_full_images(value);

			// Update
			node.checked = this.loader.get_use_full_images();

			// Save
			save_values.call(this);
		};
		var on_option_non_full_image_fallback_change = function () {
			var node = this.node_non_full_image_fallback,
				value = node.checked;

			// Set
			this.loader.set_allow_fallback_if_using_full_images(value);

			// Update
			node.checked = this.loader.get_allow_fallback_if_using_full_images();

			// Save
			save_values.call(this);
		};
		var on_option_failure_timeout_change = function () {
			var node = this.node_failure_timeout,
				value, m;

			if (
				(m = /^\s*([\d.]+)/.exec(node.value)) &&
				!isNaN((value = parseFloat(m[1])))
			) {
				this.loader.set_request_timeout(value);
			}

			// Update display value
			node.value = this.loader.get_request_timeout();

			// Save
			save_values.call(this);
		};
		var on_option_failure_retry_max_change = function () {
			var node = this.node_failure_retry_max,
				value, m;

			if (
				(m = /^\s*(\d+)/.exec(node.value)) &&
				!isNaN((value = parseInt(m[1], 10)))
			) {
				this.loader.set_image_max_retry_count(value);
			}

			// Update display value
			node.value = this.loader.get_image_max_retry_count();

			// Save
			save_values.call(this);
		};
		var on_option_zip_info_json_name_change = function () {
			var node = this.node_zip_info_json_name,
				value = filename_normalize(node.value);

			if (value.length === 0) value = "info.json";
			this.zip_info_json_name = value;
			update_zip_json.call(this);

			// Update display value
			node.value = value;

			// Save
			save_values.call(this);
		};
		var on_option_numbering_mode_change = function (value) {
			// Update image naming mode
			set_image_naming_mode.call(this, this.image_naming_mode, value);

			// Save
			save_values.call(this);
		};
		var on_option_file_ranges_change = function () {
			// Update
			var node = this.node_file_ranges;
			this.loader.set_image_ranges(node.value);
			node.value = this.loader.get_image_ranges();
		};

		var on_main_link_click = function (event) {
			// Remove page close warning
			if (this.loader.is_done() && this.page_close_warning_cb !== null) {
				window.removeEventListener("beforeunload", this.page_close_warning_cb, false);
				this.page_close_warning_cb = null;
			}

			// Skip
			if (event.which != 1) return;

			// Pause/resume
			if (this.loader.is_done()) {
				// Allow the link to be clicked
				return;
			}

			if (this.loader.is_active()) {
				this.loader.pause();
			}
			else {
				this.loader.resume();
			}

			// Stop
			event.preventDefault();
			event.stopPropagation();
			return false;
		};

		var on_loader_image_progress = function () {
			// Update progress
			update_byte_progress_bar.call(this);
		};
		var on_loader_error = function (event) {
			// Set text
			this.node_info_error.textContent = event.error;
			this.node_info_error.classList.add("eze_dl_info_visible");
		};
		var on_loader_active_change = function (event) {
			// Main link
			update_main_link_text.call(this);

			// Hide error
			if (event.active) {
				this.node_info_error.classList.remove("eze_dl_info_visible");
			}
			else {
				// Progress bars
				update_progress_bars.call(this);
				update_timeout_progress_bar.call(this, 0, 0);
			}
		};
		var on_loader_state_change = function () {
			// Update stuff
			update_main_link_text.call(this);
			update_info_status_text.call(this);
			update_progress_bars.call(this);

			if (this.loader.get_state() == GalleryDownloader.REQUESTING_IMAGES) {
				update_image_counters.call(this);
				this.node_info_count.classList.add("eze_dl_info_visible");
			}

			if (this.loader.is_done()) {
				// Add json
				update_zip_json.call(this);

				// Create zip url
				create_zip.call(this);

				// Title
				title_complete.call(this);
			}
			else if (this.loader.get_state() !== GalleryDownloader.NOT_STARTED) {
				// Setup page close warning
				if (this.page_close_warning_cb === null) {
					this.page_close_warning_cb = function (event) {
						var msg = "A download is active, or the download link has not been clicked yet.\n\nExit page?";
						event.returnValue = msg;
						return msg;
					};
					window.addEventListener("beforeunload", this.page_close_warning_cb, false);
				}
				if (!this.title_started) {
					title_init.call(this);
				}
			}
		};
		var on_loader_gallery_page_get = function () {
			// Update
			update_progress_bars.call(this);

			// Hide error
			this.node_info_error.classList.remove("eze_dl_info_visible");
		};
		var on_loader_image_page_get = function () {
			// Update
			update_progress_bars.call(this);
		};
		var on_loader_image_get = function (event) {
			// Add image to zip
			this.zip.add_file(this.loader.images[event.index].byte_data, get_zip_image_filename.call(this, null, event.index));

			// Update
			update_progress_bars.call(this);
			update_image_counters.call(this);
			update_timeout_progress_bar.call(this, 0, 0);

			// Hide error
			this.node_info_error.classList.remove("eze_dl_info_visible");
		};
		var on_loader_image_range_update = function () {
			// Update node
			this.node_file_ranges.value = this.loader.get_image_ranges();
		};
		var on_loader_image_timeout_progress = function (event) {
			update_timeout_progress_bar.call(this, event.percent, event.time);
		};



		return GalleryDownloadManager;

	})();

	// Gallery thumnail loader
	var ThumbnailLoader = (function () {

		var ThumbnailLoader = function (gid, token, page_info, checkbox, status_node) {
			// Vars
			this.pages = [];
			this.gallery = {
				gid: gid,
				token: token,
			};
			this.count = page_info.count;
			this.start = Math.max(0, Math.min(this.count - 1, page_info.current));
			this.completed = 1;
			this.index = this.start;
			this.checkbox = checkbox;
			this.status_node = status_node;

			this.delay = 1.0;

			this.request = null;
			this.timeout = null;

			this.container = $("div", "eze_gallery_page_container");

			// Setup pages
			for (var i = 0; i < this.count; ++i) {
				this.pages.push(null);
			}

			// Start node
			var n = document.querySelector("#gdt");
			if (n !== null) {
				// Set page
				this.pages[this.start] = stylize_page.call(this, n, this.start);

				// Container
				n.parentNode.insertBefore(this.container, n);
				this.container.appendChild(n);
			}

			// Events
			this.checkbox.addEventListener("change", bind(on_checkbox_change, this, this.checkbox), false);

			// Update
			update_checkbox.call(this);
			update_status.call(this);
		};



		var begin_request = function () {
			var increase = (this.index >= this.start);
			if (increase) {
				while (true) {
					if (++this.index >= this.count) {
						this.index = this.start;
						increase = false;
						break;
					}
					if (this.pages[this.index] === null) break;
				}
			}

			if (!increase) {
				while (true) {
					// Done
					if (--this.index < 0) {
						this.index = 0;
						return;
					}
					if (this.pages[this.index] === null) break;
				}
			}

			this.request = API.request_document(
				"/g/" + this.gallery.gid + "/" + this.gallery.token + "?p=" + this.index,
				bind(on_response_load, this),
				bind(on_response_error, this)
			);
		};
		var on_response_load = function (response, status) {
			// Clear
			this.request = null;
			if (status == 200) {
				// Okay
				if (this.add_page_from_html(response, this.index)) {
					// Next
					var self = this;
					this.timeout = setTimeout(function () {
						begin_request.call(self);
					}, this.delay * 1000);
					return;
				}
			}

			// Stop
			update_checkbox.call(this);
		};
		var on_response_error = function () {
			// Stop
			this.request = null;
			update_checkbox.call(this);
		};

		var stylize_page = function (node, index) {
			// Style
			node.removeAttribute("id");
			node.classList.add("eze_gallery_page");
			node.setAttribute("data-eze-page-id", index);

			// Indicator
			$("a", "eze_gallery_page_indicator", {
				href: "/g/" + this.gallery.gid + "/" + this.gallery.token + (index <= 0 ? "" : "?p=" + index),
				target: "_blank",
			}, [
				$("span", "eze_gallery_page_indicator_border_top"),
				$("span", "eze_gallery_page_indicator_border"),
				$("span", "eze_gallery_page_indicator_text", "Page " + (index + 1)),
			], $.P, node);

			// Link styling
			if (settings.get("multiviewer_by_default")) {
				var nodes = node.querySelectorAll(".gdtm>div>a"),
					i, url;

				if (nodes.length === 0) {
					nodes = node.querySelectorAll(".gdtl>a");
				}

				for (i = 0; i < nodes.length; ++i) {
					url = (nodes[i].getAttribute("href") || "").replace(/#.*$/, "") + Hash.sep + "eze/view";
					nodes[i].setAttribute("href", url);
				}
			}

			// Done
			return node;
		};

		var update_checkbox = function () {
			this.checkbox.checked = (this.completed >= this.count || this.request !== null || this.timeout !== null);
		};
		var update_status = function () {
			this.status_node.textContent = "(" + this.completed + "/" + this.count + ")";
		};

		var on_checkbox_change = function (node) {
			if (node.checked) {
				this.resume();
			}
			else {
				this.pause();
			}

			update_checkbox.call(this);
		};



		ThumbnailLoader.prototype = {
			constructor: ThumbnailLoader,

			resume: function () {
				// Done
				if (this.completed >= this.count || this.request !== null || this.timeout !== null) return;

				// Start
				begin_request.call(this);
			},
			pause: function () {
				// Done
				if (this.completed >= this.count) return;

				// Stop
				if (this.request !== null) {
					this.request.abort();
					this.request = null;
				}
				if (this.timeout !== null) {
					clearTimeout(this.timeout);
					this.timeout = null;
				}
			},

			add_page_from_html: function (html, page_index) {
				if (page_index < 0 || page_index >= this.pages.length || this.pages[page_index] !== null) return false;

				// Find node
				var n = html.querySelector("#gdt"),
					rel = null,
					i;

				if (n !== null) {
					// Set
					this.pages[page_index] = stylize_page.call(this, n, page_index);

					// Find relative;
					for (i = page_index + 1; i < this.count; ++i) {
						if (this.pages[i] !== null) {
							rel = this.pages[i];
							break;
						}
					}

					// Add
					if (rel === null || rel.parentNode !== this.container) {
						this.container.appendChild(this.pages[page_index]);
					}
					else {
						this.container.insertBefore(this.pages[page_index], rel);
					}

					// Done?
					if (++this.completed >= this.count) {
						update_checkbox.call(this);
					}
					update_status.call(this);

					// Okay
					return true;
				}

				// Error
				return false;
			},
		};



		return ThumbnailLoader;

	})();

	// Script settings
	var Settings = (function () {

		var Settings = function () {
			// Values and descriptors
			this.values = {
				custom_search_front_page: false,
				custom_search_links: true,
				custom_search_form: true,
				custom_search_params: {},
				multiviewer_by_default: false,
			};
			this.validators = {
				custom_search_front_page: is_boolean,
				custom_search_links: is_boolean,
				custom_search_form: is_boolean,
				custom_search_params: is_object_not_null,
				multiviewer_by_default: is_boolean,
			};

			this.uconfig = {
				categories: 0,
			};

			// Events
			this.change_listeners = {};

			// Load
			this.save_prefix = "eze_";
			load_all.call(this);
			load_uconfig.call(this);

			// Sync
			var self = this;
			this.sync = true;
			this.sync_key = "eze_sync";
			window.addEventListener("storage", function (event) {
				if (self.sync && event.key == self.sync_key && event.newValue !== null) {
					if (event.newValue in self.values) {
						load_value.call(self, event.newValue, "sync");
					}
				}
			}, false);
		};



		Settings.uconfig_categories = {
			misc: [ 1 , "f_misc" ],
			doujinshi: [ 2 , "f_doujinshi" ],
			manga: [ 4 , "f_manga" ],
			artistcg: [ 8 , "f_artistcg" ],
			gamecg: [ 16 , "f_gamecg" ],
			imageset: [ 32 , "f_imageset" ],
			cosplay: [ 64 , "f_cosplay" ],
			asianporn: [ 128 , "f_asianporn" ],
			"non-h": [ 256 , "f_non-h" ],
			western: [ 512 , "f_western" ],
		};



		var is_boolean = function (obj) {
			return typeof(obj) == "boolean";
		};
		var is_object_not_null = function (obj) {
			return typeof(obj) == "object" && obj !== null;
		};

		var string_to_int = function (str) {
			return parseInt(str, 10) || 0;
		};

		var load_all = function () {
			for (var k in this.values) {
				load_value.call(this, k, null);
			}
		};
		var load_value = function (name, reason) {
			var self = this;
			Save.get(this.save_prefix + name, function (v) {
				if (v !== undefined && self.validators[name].call(null, v) === true) {
					self.values[name] = v;
					if (reason !== null) trigger_change.call(self, name, reason);
				}
			});
		};

		var trigger_change = function (name, reason) {
			if (name in this.change_listeners) {
				var list = this.change_listeners[name],
					i = 0;

				for (; i < list.length; ++i) {
					list[i].call(null, settings, name, reason);
				}
			}
		};

		var uconfig_remap = {
			cats: [ "categories", string_to_int ],
		};

		var load_uconfig = function () {
			var cookie = Cookies.get_all(document.cookie),
				vars, i, s, k;

			if (!("uconfig" in cookie)) return;

			// Parse
			cookie = cookie.uconfig.split("-");
			vars = {};
			for (i = 0; i < cookie.length; ++i) {
				s = cookie[i].split("_");
				k = s[0];
				s.splice(0, 1);
				vars[k] = s.join("_");
			}

			// Set
			for (k in vars) {
				if (k in uconfig_remap) {
					this.uconfig[uconfig_remap[k][0]] = uconfig_remap[k][1].call(null, vars[k]);
				}
				// else { this.uconfig[k] = vars[k]; }
			}
		};



		Settings.prototype = {
			constructor: Settings,

			get: function (name) {
				// Get
				return this.values[name];
			},
			set: function (name, value, callback) {
				// Test
				if (!(name in this.values) || !this.validators[name].call(null, value)) {
					if (callback) callback.call(null, false);
					return false;
				}

				// Memory
				this.values[name] = value;

				// Storage
				Save.set(this.save_prefix + name, value, callback);

				// Sync
				if (this.sync) {
					window.localStorage.setItem(this.sync_key, name);
					window.localStorage.removeItem(this.sync_key);
				}

				// Event
				trigger_change.call(this, name, "set");

				// Done
				return true;
			},

			on_change: function (name, callback) {
				if (name in this.change_listeners) {
					this.change_listeners[name].push(callback);
					return true;
				}
				else if (name in this.values) {
					this.change_listeners[name] = [ callback ];
					return true;
				}
				return false;
			},
			off_change: function (name, callback) {
				if (!(name in this.change_listeners)) return false;

				var list = this.change_listeners[name],
					i = 0;

				for (; i < list.length; ++i) {
					if (list[i] === callback) {
						if (list.length <= 1) {
							delete this.change_listeners[name];
						}
						else {
							list.splice(i, 1);
						}
						return true;
					}
				}

				return false;
			},

			set_sync_enabled: function (enabled) {
				this.sync = enabled;
			},

		};



		return Settings;

	})();



	// Main logic functions
	var insert_stylesheet = function () {
		// Styling
		var vars = {},
			is_ex = (API.get_site() == "exhentai"),
			css;

		// Setup vars
		if (is_ex) {
			vars.gallery_item_hl = CSS.color("#080808");
			vars.bg = CSS.color("#43464E");
			vars.bg_dark = CSS.color("#34353B");
			vars.bg_light = CSS.color("#4f535b");
			vars.border = CSS.color("#000000");
			vars.border_light = CSS.color("#989898");
			vars.border_radius = "0";
			vars.text = CSS.color("#F1F1F1");
			vars.text_light = CSS.color("#B8B8B8");
			vars.text_shadow = CSS.color("#080808");
			vars.dl_bar_bg1 = CSS.color("#c00000");
			vars.dl_bar_bg2 = CSS.color("#a07000");
			vars.dl_bar_bg3 = CSS.color("#00a020");
			vars.dl_bar_bg4 = CSS.color("#0060ff");
			vars.dl_bar_bg5 = CSS.color("#8020ff");
			vars.dl_bar_bg5_light = CSS.color("#5f1080");

			vars.multiviewer_page_bg = CSS.color("#f0f0f0");
			vars.multiviewer_page_hl = CSS.color("rgba(255,255,255,0.125)");
			vars.multiviewer_page_selected = CSS.color("#0060ff");
			vars.multiviewer_page_selected_hl = CSS.color("#0060ff");
		}
		else {
			vars.gallery_item_hl = CSS.color("#f8f8f8");
			vars.bg = CSS.color("#E3E0D1");
			vars.bg_dark = CSS.color("#E3E0D1");
			vars.bg_light = CSS.color("#EDEBDF");
			vars.border = CSS.color("#5C0D12");
			vars.border_light = CSS.color("#806769");
			vars.border_radius = "9px";
			vars.text = CSS.color("#5C0D11");
			vars.text_light = CSS.color("#9F8687");
			vars.text_shadow = CSS.color("#f8f8f8");
			vars.dl_bar_bg1 = CSS.color("#ffaaaa");
			vars.dl_bar_bg2 = CSS.color("#ffc0aa");
			vars.dl_bar_bg3 = CSS.color("#88ffaa");
			vars.dl_bar_bg4 = CSS.color("#88ccff");
			vars.dl_bar_bg5 = CSS.color("#d088ff");
			vars.dl_bar_bg5_light = CSS.color("#ffc0ff");

			vars.multiviewer_page_bg = CSS.color("#f0f0f0");
			vars.multiviewer_page_hl = CSS.color("rgba(255,255,255,0.125)");
			vars.multiviewer_page_selected = CSS.color("#88ccff");
			vars.multiviewer_page_selected_hl = CSS.color("#88ccff");
		}

		// Create css
		css = CSS.format(
			[ //{
			".id1:not(.e-Highlighted):not(.e-Filtered)>.id2{overflow:visible;position:relative;}",
			".id1:not(.e-Highlighted):not(.e-Filtered):hover>.id2{z-index:1;}",
			".id1:not(.e-Highlighted):not(.e-Filtered):hover>.id2>a{text-shadow:0px 0px 1px {{color:gallery_item_hl}},0px 0px 1px {{color:gallery_item_hl}},0px 0px 1px {{color:gallery_item_hl}},0px 0px 1px {{color:gallery_item_hl}};background:{{color:bg,0.75}};display:inline-block;padding-bottom:0.5em;}",

			".eze_gallery_page_container{}",
			".eze_gallery_page{background:{{color:bg_light}};border:1px solid {{color:border}};text-align:left;width:99%;min-width:950px;max-width:1200px;margin:0 auto;clear:both;padding:5px;border-radius:{{border_radius}};position:relative;border-top-left-radius:0;}",
			".eze_gallery_page img{border:1px solid {{color:border}};margin:0;padding:0;}",
			".eze_gallery_page a{text-decoration:none;}",
			".eze_gallery_page+.eze_gallery_page{margin-top:0.5em;}",

			".eze_gallery_page_indicator{display:inline-block;position:absolute;right:100%;top:0;background-color:{{color:bg_dark}};}",
			".eze_gallery_page_indicator:hover{background-color:{{color:bg_light}};}",
			".eze_gallery_page_indicator_border_top{position:absolute;bottom:100%;left:0;right:0;border-bottom:1px solid {{color:border}};}",
			".eze_gallery_page_indicator_border{position:absolute;left:0;top:0;right:0;bottom:0;border-style:solid;border-width:0px 0px 1px 1px;border-color:{{color:border}};}",
			".eze_gallery_page_indicator:not(:hover)>.ez_gallery_page_indicator_border{border-right:1px solid {{color:border}};}",
			".eze_gallery_page_indicator_text{position:relative;display:inline-block;white-space:nowrap;padding:4px;}",

			".eze_favorite_link{cursor:pointer;}",

			"div.eze_gallery_custom_container{font-size:1.25em;margin:0 auto 0.5em;padding:0.5em;}",
			".eze_gallery_custom_container_inner{}",
			".eze_gallery_custom{margin:0 auto;}",
			".eze_gallery_link{text-decoration:none;font-weight:bold;cursor:pointer;font-weight:bold;}",
			".eze_gallery_link>*{vertical-align:middle;}",
			".eze_gallery_custom_table{display:table;table-layout:fixed;width:100%;}",
			".eze_gallery_custom_row{display:table-row;}",
			".eze_gallery_custom_cell{display:table-cell;text-align:left;}",
			".eze_gallery_custom_cell+.eze_gallery_custom_cell{border-left:1px solid {{color:border}};padding-left:0.5em;}",

			".eze_dl_container{margin-top:0.5em;padding-top:0.5em;border-top:1px solid {{color:border}};}",
			".eze_dl_container:not(.eze_dl_container_visible){display:none;}",
			".eze_dl_title{font-size:2em;font-weight:bold;margin-bottom:0.125em;}",
			".eze_dl_title.eze_dl_title_pad_above{margin-top:0.125em;}",
			".eze_dl_link{cursor:pointer;text-decoration:none;}",
			".eze_dl_links{display:block;}",
			".eze_dl_links:not(.eze_dl_links_hidden){margin-bottom:0.25em;}",
			".eze_dl_links_scripts{margin-top:0.5em;}",
			".eze_dl_links_script_name{margin-top:0.25em;}",
			".eze_dl_info_container{margin-left:-0.5em;}",
			".eze_dl_info{display:inline-block;margin-left:0.5em;border:1px solid {{color:border}};background-color:{{color:bg}};border-bottom:none;padding:0.25em;}",
			".eze_dl_info.eze_dl_info_error{color:#f00000;text-shadow:1px 1px 0 {{color:border}};}",
			".eze_dl_info:not(.eze_dl_info_visible){display:none;}",
			".eze_dl_progress_bar{position:relative;width:100%;box-sizing:border-box;-moz-box-sizing:border-box;border:1px solid {{color:border}};background-color:{{color:bg_dark}};}",
			".eze_dl_progress_bar+.eze_dl_progress_bar{border-top:none;}",
			".eze_dl_progress_bar_bg,.eze_dl_progress_bar_bg_light{position:absolute;left:0;top:0;bottom:0;background-color:{{color:dl_bar_bg1}};}",
			".eze_dl_progress_bar_indicator{position:absolute;left:0;top:0;bottom:0;border-right:1px solid {{color:border}};}",
			".eze_dl_progress_bar_indicator.eze_dl_progress_bar_indicator_hidden{display:none;}",
			".eze_dl_progress_bar.eze_dl_progress_bar_image_pages>.eze_dl_progress_bar_bg{background-color:{{color:dl_bar_bg2}};}",
			".eze_dl_progress_bar.eze_dl_progress_bar_images>.eze_dl_progress_bar_bg{background-color:{{color:dl_bar_bg3}};}",
			".eze_dl_progress_bar.eze_dl_progress_bar_image_size>.eze_dl_progress_bar_bg{background-color:{{color:dl_bar_bg4}};}",
			".eze_dl_progress_bar.eze_dl_progress_bar_timeout>.eze_dl_progress_bar_bg{background-color:{{color:dl_bar_bg5}};}",
			".eze_dl_progress_bar.eze_dl_progress_bar_timeout>.eze_dl_progress_bar_bg_light{background-color:{{color:dl_bar_bg5_light}};}",
			".eze_dl_progress_bar_text{position:relative;height:1.25em;padding:0.25em;line-height:1.25em;color:{{color:text}};text-shadow:1px 1px 0 {{color:text_shadow}};}",
			".eze_dl_setting{display:table;width:100%;padding:0.5em;box-sizing:border-box;-moz-box-sizing:border-box;}",
			".eze_dl_setting:nth-of-type(2n){background-color:{{color:bg}};}",
			".eze_dl_setting_row{display:table-row;}",
			".eze_dl_setting_cell{display:table-cell;width:100%;vertical-align:top;}",
			".eze_dl_setting_cell:first-of-type{width:0;white-space:nowrap;}",
			".eze_dl_setting_cell:not(:first-of-type){text-align:right;}",
			".eze_dl_setting_cell:not(:first-of-type)>div+div{margin-top:0.125em;}",
			".eze_dl_setting_title{font-size:1.25em;font-weight:bold;}",
			".eze_dl_setting_desc{}",
			".eze_dl_setting_desc_tag{background-color:{{color:bg}};padding:0.125em 0.375em;display:inline-block;border-radius:0.5em;margin-left:0.5em;}",
			".eze_dl_setting:nth-of-type(2n) .eze_dl_setting_desc_tag{background-color:{{color:bg_light}};}",
			".eze_dl_setting_input{border:1px solid {{color:border}};background-color:{{color:bg_dark}};color:{{color:text}};padding:0.125em;line-height:1.25em;width:10em;font-family:inherit;}",
			".eze_dl_setting_input.eze_dl_setting_input_small{width:4em;}",
			".eze_option_box{display:inline-block;border:1px solid {{color:border}};background-color:{{color:bg_dark}};line-height:1.5em;padding:0 0.25em;height:1.5em;overflow:hidden;text-align:center;cursor:pointer;}",
			".eze_option_box+.eze_option_box{margin-left:0.5em;}",
			".eze_option_box_entry{display:block;height:1.5em;}",
			".eze_option_box_entry:not(.eze_option_box_entry_selected){height:0;overflow:hidden;visibility:hidden;}",
			".eze_dl_label>*{vertical-align:middle;}",

			".eze_dgallery_table{display:table;width:100%;}",
			".eze_dgallery_table.eze_dgallery_table_spaced{margin:1em 0;}",
			".eze_dgallery_row{display:table-row;}",
			".eze_dgallery_cell{display:table-cell;width:0;vertical-align:top;}",
			".eze_dgallery_cell.eze_dgallery_cell_full{width:100%;}",
			".eze_dgallery_cell.eze_dgallery_cell_nowhite{white-space:nowrap;}",
			".eze_dgallery_cell.eze_dgallery_cell_pre_border{padding-right:0.5em;}",
			".eze_dgallery_cell.eze_dgallery_cell_border{border-left:1px solid {{color:border}};padding-left:0.5em;}",
			".eze_dgallery_image{border:1px solid {{color:border}};min-width:200px;height:auto;margin-right:1em;}",
			".eze_dgallery_title{font-size:1.5em;margin:0.25em 0;}",
			".eze_dgallery_title_alt{font-size:1.25em;margin:0.25em 0;color:{{color:text_light}};}",
			".eze_dgallery_tag_container{margin:-0.5em 0 0 -1em;}",
			".eze_dgallery_tag{display:inline-block;margin:0.5em 0 0 1em;padding:0.25em;font-weight:bold;white-space:nowrap;border-radius:0.5em;border:1px solid #989898;background:{{color:bg_light}};cursor:pointer;text-decoration:none;}",
			".eze_dgallery_info_label{font-weight:bold;}",
			".eze_dgallery_extra_container{border-top:1px solid {{color:border}};padding-top:0.5em;}",

			".eze_main_container{position:absolute;left:0;top:0;bottom:0;right:0;white-space:nowrap;line-height:0;text-align:center;}",
			".eze_main_container:before{content:\"\";display:inline-block;width:0;height:100%;vertical-align:middle;}",
			".eze_main{display:inline-block;width:950px;vertical-align:top;white-space:normal;line-height:normal;text-align:left;margin:2em 0;}",
			".eze_main.eze_main_middle{vertical-align:middle;}",
			".eze_main_box{border:1px solid {{color:border}};background-color:{{color:bg}};padding:0.5em 1em;box-sizing:border-box;-moz-box-sizing:border-box;}",

			".eze_menu{display:block;position:absolute;left:0;top:0;background-color:{{color:bg}};text-align:left;white-space:nowrap;border:1px solid {{color:border}};z-index:100;}",
			".eze_menu_option,.eze_menu_label{display:block;padding:0.25em;text-decoration:none;}",
			".eze_menu_option{cursor:pointer;}",
			".eze_menu_label{cursor:default;}",
			".eze_menu_option:hover{background-color:{{color:bg_dark}};}",

			".eze_settings_container:not(.eze_settings_container_visible){display:none;}",
			".eze_settings_container.eze_settings_container_visible~.stuffbox{display:none;}",
			".eze_settings_box{font-size:1.2em;text-align:center;margin:5px auto;width:700px;padding:5px;text-align:left;border:1px solid {{color:border}};background-color:{{color:bg_light}};}",
			".eze_settings_header{margin:0 0 0.25em;padding:0;font-size:2em;}",
			".eze_settings_entry_container{}",
			".eze_settings_entry{padding:0.25em;}",
			".eze_settings_entry:nth-of-type(2n){background-color:{{color:bg}};}",
			".eze_settings_label>*{vertical-align:middle;}",
			".eze_settings_pad_left{margin-left:0.5em;}",

			".eze_cv_container{position:absolute;left:0;top:0;bottom:0;right:0;overflow:hidden;}",
			".eze_cv_offset_size{position:absolute;left:50%;top:50%;width:0;height:0;}",
			".eze_cv_offset{width:100%;height:100%;transform:translate(0%,0%);}",
			".eze_cv_content_container{display:inline-block;transform:translate(-50%,-50%);}",
			".eze_cv_content{position:relative;}",
			".eze_cv_container.eze_cv_container_transition_scale>.eze_cv_offset_size{transition:width 0.25s ease-in-out 0s,height 0.25s ease-in-out 0s;}",
			".eze_cv_container.eze_cv_container_transition_scale>*>*>*>.eze_cv_content{transition:transform 0.25s ease-in-out 0s;}",
			".eze_cv_container.eze_cv_container_transition_position>*>.eze_cv_offset{transition:transform 0.25s ease-in-out 0s;}",

			"body.eze_multiviewer_visible{overflow:hidden;}",
			".eze_multiviewer{position:absolute;left:0;top:0;bottom:0;right:0;font-size:16px;background-color:{{color:bg_dark}};}",
			".eze_multiviewer:not(.eze_multiviewer_visible){display:none;}",
			".eze_multiviewer.eze_multiviewer_visible~*{display:none;}",
			".eze_multiviewer_sidebar{position:absolute;right:0;top:0;bottom:0;background-color:{{color:bg_light}};border-left:1px solid {{color:border}};overflow-x:hidden;overflow-y:scroll;}",
			".eze_multiviewer_sidebar:not(.eze_multiviewer_sidebar_visible){display:none;}",
			".eze_multiviewer_sidebar.eze_multiviewer_sidebar_left{right:auto;left:0;border-left:none;border-right:1px solid {{color:border}};}",
			".eze_multiviewer_sidebar_size{}",
			".eze_multiviewer_content{position:fixed;left:0;top:0;bottom:0;right:0;}",
			".eze_multiviewer_content_size{position:absolute;left:0;top:0;bottom:0;right:0;}",
			".eze_multiviewer_topbar{position:fixed;left:0;top:0;right:0;line-height:1.25em;background-color:{{color:bg_light}};border-bottom:1px solid {{color:border}};}",
			".eze_multiviewer_topbar:not(.eze_multiviewer_topbar_visible){display:none;}",
			".eze_multiviewer_scrollbars{position:absolute;left:0;top:0;right:0;bottom:0;overflow-x:hidden;overflow-y:hidden;}",
			".eze_multiviewer_scrollbars.eze_multiviewer_scrollbars_visible_h{position:absolute;right:0;top:0;bottom:0;right:0;overflow-x:scroll;}",
			".eze_multiviewer_scrollbars.eze_multiviewer_scrollbars_visible_v{position:absolute;right:0;top:0;bottom:0;right:0;overflow-y:scroll;}",
			".eze_multiviewer_scrollbars:not(.eze_multiviewer_scrollbars_visible){display:none;}",
			".eze_multiviewer_scrollbars_range{width:100%;height:100%;}",
			".eze_multiviewer_scrollbars_size{width:100%;height:100%;}",
			".eze_multiviewer_image_container{padding:0.5em;}",
			".eze_multiviewer_image_size{position:relative;background-color:{{color:multiviewer_page_bg}};}",
			".eze_multiviewer_image_container.eze_multiviewer_image_container_no_bg>.eze_multiviewer_image_size{background-color:transparent;}",
			".eze_multiviewer_image{vertical-align:middle;-position:absolute;left:0;top:0;width:100%;height:100%;}",

			".eze_multiviewer_thumb_container{}",
			".eze_multiviewer_thumb_sep{display:block;cursor:default;border-top:0.125em solid {{color:text_light}};border-bottom:0.125em solid {{color:text_light}};height:0.125em;margin:0.5em 1em;}",
			".eze_multiviewer_thumb_sep:not(.eze_multiviewer_thumb_sep_visible){display:none;}",
			".eze_multiviewer_thumb{text-align:center;padding:0.5em 1em;cursor:pointer;transition:background-color 0.25s ease-in-out 0s;display:block;text-decoration:none;}",
			".eze_multiviewer_thumb:not(.eze_multiviewer_thumb_visible){display:none;}",
			".eze_multiviewer_thumb:hover{background-color:{{color:multiviewer_page_hl}};}",
			".eze_multiviewer_thumb.eze_multiviewer_thumb_viewing{background-color:{{color:multiviewer_page_selected}};}",
			".eze_multiviewer_thumb.eze_multiviewer_thumb_viewing:hover{background-color:{{color:multiviewer_page_selected_hl}};}",
			".eze_multiviewer_thumb_sizer1{display:inline-block;vertical-align:middle;width:100%;}", // max-width:200px;
			".eze_multiviewer_thumb_sizer2{position:relative;width:100%;}",
			".eze_multiviewer_thumb_sizer3{position:relative;width:100%;height:100%;white-space:nowrap;line-height:0;}",
			".eze_multiviewer_thumb_aligner{display:inline-block;vertical-align:middle;width:0;height:0;padding-top:50%;}",
			".eze_multiviewer_thumb_size{display:inline-block;vertical-align:middle;white-space:normal;line-height:normal;width:100%;padding-top:100%;position:relative;background-color:{{color:multiviewer_page_bg}};overflow:hidden;}",
			".eze_multiviewer_thumb_image{position:absolute;left:0;top:0;bottom:0;right:0;background-color:transparent;background-repeat:no-repeat;background-position:center center;background-size:auto;transform-origin:0 0;opacity:0.25;transition:opacity 0.25s ease-in-out 0s;}",
			".eze_multiviewer_thumb[data-eze-state='0']>*>*>*>*>.eze_multiviewer_thumb_image{opacity:0.25;}",
			".eze_multiviewer_thumb[data-eze-state='1']>*>*>*>*>.eze_multiviewer_thumb_image{opacity:0.25;}",
			".eze_multiviewer_thumb[data-eze-state='2']>*>*>*>*>.eze_multiviewer_thumb_image{opacity:0.25;}",
			".eze_multiviewer_thumb[data-eze-state='3']>*>*>*>*>.eze_multiviewer_thumb_image{opacity:0.5;}",
			".eze_multiviewer_thumb[data-eze-state='4']>*>*>*>*>.eze_multiviewer_thumb_image{opacity:1;}",
			".eze_multiviewer_thumb[data-eze-state='5']>*>*>*>*>.eze_multiviewer_thumb_image{opacity:0.5;}",
			".eze_multiviewer_thumb.eze_multiviewer_thumb_viewing[data-eze-state]>*>*>*>*>.eze_multiviewer_thumb_image{opacity:1;}",
			".eze_multiviewer_thumb[data-eze-state]:hover>*>*>*>*>.eze_multiviewer_thumb_image{opacity:1;}",
			].join(""), //}
			vars
		);

		// Insert
		API.inject_style(css);
	};

	var bytes_to_labeled_string = (function () {

		var suffixes = [ "B" , "KiB" , "MiB" , "GiB" ],
			division_levels = [ 1024.0 , 1024.0 , 1024.0 ];



		return function (bytes) {
			var i = 0;

			while (i + 1 < suffixes.length && bytes / division_levels[i] >= 1) {
				bytes /= division_levels[i];
				++i;
			}

			return bytes.toFixed(2) + " " + suffixes[i];
		};

	})();

	var create_custom_search_links = (function () {

		var links = [
			{
				title: "Search by gallery name",
				primary: 0,
				links: [
					{
						title: "Search by name",
						url: "/?f_doujinshi=1&f_manga=1&f_artistcg=1&f_gamecg=1&f_western=1&f_non-h=1&f_imageset=1&f_cosplay=1&f_asianporn=1&f_misc=1&f_search=\"{short}\"",
					},
					{
						title: "Search by exact name",
						url: "/?f_doujinshi=1&f_manga=1&f_artistcg=1&f_gamecg=1&f_western=1&f_non-h=1&f_imageset=1&f_cosplay=1&f_asianporn=1&f_misc=1&f_search=\"{full}\"",
					},
				],
			},
			{
				title: "Search on external websites",
				primary: 0,
				links: [
					{
						title: "nhentai.net - by name",
						url: "//nhentai.net/search/?q=\"{short}\"",
					},
					{
						title: "nhentai.net - by exact name",
						url: "//nhentai.net/search/?q=\"{full}\"",
					},
					{
						title: "hitomi.la - by name",
						url: "https://hitomi.la/search.html?{short}",
					},
				],
			},
		];



		var create_custom_search_links = function (gal_info) {
			var title_info = API.get_gallery_title_info(gal_info.title),
				nodes = [],
				replacers = {},
				re_replacer = /\{(\w+)\}/g,
				replacer_fn, node_links, i, j, n, li, url;

			// Replacers
			replacers.full = encodeURIComponent(gal_info.title.replace(/,/g, " "));
			replacers.short = encodeURIComponent(title_info.title.replace(/,/g, " "));
			replacer_fn = function (full, key) {
				return (key in replacers) ? replacers[key] : full;
			};

			// Create
			for (i = 0; i < links.length; ++i) {
				li = links[i];

				// Setup links
				node_links = [];
				for (j = 0; j < li.links.length; ++j) {
					url = li.links[j].url.replace(re_replacer, replacer_fn);
					if (settings.get("custom_search_links")) {
						url = modify_search_url(url);
					}

					node_links.push(li.links[j].title);
					node_links.push(url);
				}

				// Create node
				n = $("a", "eze_gallery_link", li.title || "", { href: node_links[li.primary * 2 + 1], target: "_blank" });
				if (li.links.length > 1) {
					n.addEventListener("click", bind(on_search_link_click, n, node_links), false);
				}
				nodes.push(n);
			}

			// Done
			return nodes;
		};



		var on_search_link_click = function (node_links, event) {
			// Skip
			if (event.which != 1) return;

			// Create menu
			var menu = new Menu(),
				opt, i;

			for (i = 0; i < node_links.length; i += 2) {
				opt = menu.add_option(node_links[i]);
				opt.setAttribute("href", node_links[i + 1]);
				opt.setAttribute("target", "_blank");
			}

			menu.on("select", function (event) {
				// Follow link
				window.location.href = event.option.getAttribute("href");
				event.menu.close();
			});

			menu.show(this, Menu.BELOW | Menu.LEFT | Menu.CENTER | Menu.VERTICAL);

			// Stop
			event.preventDefault();
			event.stopPropagation();
			return false;
		};



		return create_custom_search_links;

	})();

	var modify_search_url = function (url) {
		var parts = new URLParts(url),
			param_count = 0,
			vars, params, i, k, k2, cats;

		// External url, no change
		if (parts.hostname !== null && parts.hostname !== window.location.hostname) return url;

		// Update vars
		vars = parts.search ? Hash.decode_vars(parts.search.substr(1))[1] : [];
		params = settings.get("custom_search_params");
		for (k in params) {
			for (i = 0; i < vars.length; ++i) {
				if (vars[i][0] == k) {
					vars[i][1] = params[k];
					break;
				}
			}
			if (i == vars.length) {
				vars.push([ k , params[k] ]);
			}
			++param_count;
		}
		if (param_count > 0) {
			// Add default search categories (doesn't overwrite if they already exist)
			cats = settings.uconfig.categories;
			for (k in Settings.uconfig_categories) {
				if ((cats & Settings.uconfig_categories[k][0]) === 0) continue;
				k2 = Settings.uconfig_categories[k][1];
				for (i = 0; i < vars.length && vars[i][0] != k2; ++i);
				if (i == vars.length) vars.push([ k2 , "1" ]);
			}

			// Add search apply
			vars.push([ "f_apply", "Apply Filter" ]);
		}

		// Encode
		parts.search = Hash.encode_vars(vars);
		if (parts.search.length > 0) parts.search = "?" + parts.search;
		return parts.join();
	};

	var setup_before_ready = function () {
		API.block_redirections();

		if (settings.get("custom_search_front_page")) {
			// Check for auto-search redirect
			var key = "custom_search_front_page_redirected";
			if (window.sessionStorage) {
				if (!window.sessionStorage[key]) {
					if (window.location.pathname == "/" && window.location.search === "" && window.location.hash === "") {
						window.sessionStorage[key] = true;
						if (window.sessionStorage[key]) {
							var url = modify_search_url(window.location.href);
							if (url !== window.location.href) {
								window.stop();
								window.history.replaceState(null, "", url);
								window.location.reload();
							}
						}
					}
				}
			}
		}
	};

	var setup_modified_titles = function () {
		var re_pattern = /\b(exhentai|e-hentai)/i,
			nodes, i;

		nodes = document.querySelectorAll("title");
		for (i = 0; i < nodes.length; ++i) {
			nodes[i].textContent = nodes[i].textContent.trim().replace(re_pattern, "Ez+$1");
		}
	};

	var setup_custom_settings_link = function () {
		var nodes, i, url;

		// Custom link
		API.add_header_link($("a", null, "Ez-Settings", { href: "/uconfig.php#!eze/settings" }));

		// Modify homepage links
		if (settings.get("custom_search_front_page")) {
			nodes = API.get_front_page_links(document.documentElement);
			url = modify_search_url("http://exhentai.org/");

			for (i = 0; i < nodes.length; ++i) {
				nodes[i].setAttribute("href", url);
			}
		}
	};

	var setup_search = (function () {

		var setup_search = function (page_type) {
			var re_pattern = /\b(exhentai|e-hentai)/i,
				nodes, i, n1, n2, m;

			nodes = document.querySelectorAll("h1.ih");
			for (i = 0; i < nodes.length; ++i) {
				nodes[i].textContent = nodes[i].textContent.trim().replace(re_pattern, "Ez+$1");
			}

			// Add a random button
			if ((n1 = document.querySelector("p+table.ptt")) !== null) {
				n1 = n1.previousSibling;

				n2 = document.createElement("span");
				n2.textContent = " | ";
				n1.appendChild(n2);

				n2 = document.createElement("a");
				n2.setAttribute("href", "#!eze?random");
				n2.textContent = "random";
				n1.appendChild(n2);
			}

			// Make favorites classes clickable (WHY: onclick="document.location='http://exhentai.org/favorites.php?favcat='")
			if (page_type === "favorites") {
				nodes = document.querySelectorAll("div.fp");
				for (i = 0; i < nodes.length; ++i) {
					n1 = nodes[i];
					if ((m = /document\s*\.\s*location\s*=\s*'([^']*)'/.exec(n1.getAttribute("onclick") || "")) !== null) {
						// Replace
						n2 = document.createElement("a");
						n2.setAttribute("href", m[1]);
						n2.style.textDecoration = "none";
						n1.parentNode.insertBefore(n2, n1);
						n2.appendChild(n1);

						// Remove onclick
						n1.removeAttribute("onclick");
					}
				}
			}

			// Setup custom search
			setup_custom_search();

			// Setup navigation
			h_nav.on_change(on_hash_change);
		};

		var on_hash_change = function (h) {
			if (h.path_array[0] !== "eze") return;

			if ("random" in h.vars) {
				// Search for the page counters
				var doc = document.documentElement,
					pages = API.get_pages_info_from_html(doc);

				if (pages !== null && pages.count > 0) {
					// Go to a random page
					var p_id = Math.floor(Math.random() * pages.count);
					window.location.href = API.form_page_url(doc, p_id, false) + Hash.sep + "eze?random-gallery";
				}
			}
			else if ("random-gallery" in h.vars) {
				var results = API.get_search_page_results(document.documentElement);

				if (results.length > 0) {
					// Go to a random gallery
					var g_id = Math.floor(Math.random() * results.length),
						r = results[g_id];

					window.location.href = "/g/" + r.gallery.gid + "/" + r.gallery.token;
				}
			}
		};

		var setup_custom_search = function () {
			if (settings.get("custom_search_form")) {
				var params = settings.get("custom_search_params");
				if (params !== null && typeof(params) === "object") {
					var n = document.querySelector("#advdiv");
					if (n !== null) {
						var n2 = null;
						var ns = document.querySelectorAll(".nopm>a[onclick]");
						for (var i = 0; i < ns.length; ++i) {
							if (ns[i].getAttribute("onclick").indexOf("toggle_advsearch_pane") >= 0) {
								n2 = ns[i];
								break;
							}
						}

						if (n2 !== null && n.style.display === "none") {
							var s = n2.textContent;
							n2.click();
							n2.textContent = s;

							s = n2.getAttribute("onclick");
							n2.removeAttribute("onclick");
							n2.addEventListener("click", function (event) {
								var n = document.querySelector("#advdiv");
								if (n.innerHTML.length > 0 && n.style.display === "none") {
									this.textContent = "Hide Advanced Options";
									n.style.display = "";
									event.preventDefault();
									event.stopImmediatePropagation();
									return false;
								}
							}, false);
							n2.setAttribute("onclick", s);

							n.style.display = "none";

							for (var k in params) {
								n2 = n.querySelector("[name='" + k + "']");
								if (n2 !== null) {
									if (n2.tagName === "INPUT") {
										if (n2.type === "checkbox") {
											n2.checked = (params[k] === "on");
										}
									}
									else if (n2.tagName === "SELECT") {
										n2.value = params[k];
									}
								}
							}
						}
					}
				}
			}
		};

		return setup_search;

	})();

	var setup_gallery = (function () {

		var setup_gallery = function () {
			var gal_info = API.get_gallery_info_from_html(document.documentElement);

			//fix_tags();
			if (gal_info !== null) {
				insert_custom(gal_info);
				recreate_favorite_link(gal_info.gallery);
			}
		};



		var fix_tags = function () {
			// Modify tag links
			var nodes, i, s;

			nodes = document.querySelectorAll("#taglist td>div>a[href]");
			for (i = 0; i < nodes.length; ++i) {
				s = nodes[i].getAttribute("href");
				s = s.replace(/^(.*)\/([^\/]*)$/, "$1/\"$2\"");
				nodes[i].setAttribute("href", s);
			}
		};
		var insert_custom = function (gal_info) {
			var par, rel, n;

			// Parent/relative
			rel = document.querySelector(".gm");
			if (rel === null) return;
			par = rel.parentNode;
			rel = rel.nextSibling;

			// Create
			n = create_custom_gallery_bar(gal_info);

			// Add
			if (rel !== null) {
				par.insertBefore(n, rel);
			}
			else {
				par.appendChild(n);
			}
		};
		var recreate_favorite_link = function (gallery) {
			var link = document.querySelector("#favoritelink");

			if (link) {
				link.setAttribute("href", "http://exhentai.org/gallerypopups.php?gid=" + gallery.gid + "&t=" + gallery.token + "&act=addfav");

				/*
				// Create
				n = $("a", "eze_favorite_link", link.textContent, { href: link.getAttribute("href") },
					$.ON, [ "click", on_favorite_link_click, false, [ $.node, gallery.gid, gallery.token ] ]
				);

				// Replace
				link.parentNode.insertBefore(n, link);
				link.parentNode.removeChild(link);
				*/
			}
		};

		var create_custom_gallery_bar = function (gal_info) {
			var page_info = API.get_pages_info_from_html(document.documentElement),
				search_links = create_custom_search_links(gal_info),
				thumb_loader, i, n0, n1, n2, n3, n4, n5;

			// DOM create
			n0 = $("div", "gm eze_gallery_custom_container", [
				$("div", "eze_gallery_custom", [
					$("div", "eze_gallery_custom_table", [
						$("div", "eze_gallery_custom_row", [
							$("div", "eze_gallery_custom_cell", [
								$("p", [
									$("label", "eze_gallery_link", [
										$("span", null, "Load all thumbnails "),
										n1 = $("span"),
										n2 = $("input", { type: "checkbox" }),
									]),
								]),
								$("p", [
									n3 = $("a", "eze_gallery_link", "Download gallery"),
								]),
							]),
							n4 = $("div", "eze_gallery_custom_cell"),
						]),
					]),
				]),
				n5 = $("div", "eze_dl_container"),
			]);

			// Search links
			for (i = 0; i < search_links.length; ++i) {
				$("p", [ search_links[i] ], $.P, n4);
			}

			// Thumbnail loader
			thumb_loader = new ThumbnailLoader(gal_info.gallery.gid, gal_info.gallery.token, page_info, n2, n1);

			// Download link
			n3.addEventListener("click", bind(on_download_gallery_click, n3, {
				gallery: {
					gid: gal_info.gallery.gid,
					token: gal_info.gallery.token,
				},
				loader: null,
				thumb_loader: thumb_loader,
				container: n5,
			}), false);

			// Done
			return n0;
		};

		/*
		var on_favorite_link_click = function (gid, token, event) {
			// Skip
			if (event.which != 1) return;

			// Create menu
			var menu = new Menu();
			menu.add_option("Select a category", { label: true });
			menu.on("select", function (event) {
				event.menu.close();
			});
			menu.show(this, Menu.BELOW | Menu.LEFT | Menu.CENTER | Menu.VERTICAL);

			// Stop
			event.preventDefault();
			event.stopPropagation();
			return false;
		};
		*/
		var on_download_gallery_click = function (data, event) {
			// Skip
			if (event.which != 1) return;

			if (data.loader === null) {
				// Create loader
				data.loader = new GalleryDownloadManager(data.gallery, data.container, data.thumb_loader);
				delete data.gallery;
				delete data.thumb_loader;
			}
			else {
				// Toggle visibility
				data.container.classList.toggle("eze_dl_container_visible");
			}

			// Stop
			event.preventDefault();
			event.stopPropagation();
			return false;
		};



		return setup_gallery;

	})();

	var setup_gallery_deleted = (function () {

		var setup_gallery_deleted = function () {
			var url_info = API.get_gallery_url_info(window.location.href),
				n;

			// Invalid
			if (url_info === null) return;

			// Hide
			if ((n = document.querySelector("div.d")) !== null) {
				n.parentNode.removeChild(n);
			}

			// Get
			API.get_gallery(url_info.gid, url_info.token, 0, true, on_gallery_acquire);
		};



		var on_gallery_acquire = function (status, gal_info) {
			if (status != API.OK) return; // An error occured

			var search_links = create_custom_search_links(gal_info),
				n0, n1, n2, i, k;

			// Create DOM
			n0 = $("div", "eze_main_container", [ //{
				$("div", "eze_main eze_main_middle", [
					$("div", "eze_main_box", [
						// Main table
						$("div", "eze_dgallery_table", [
							$("div", "eze_dgallery_row", [
								$("div", "eze_dgallery_cell", [
									// Image
									$("img", "eze_dgallery_image", {
										src: gal_info.thumbnail,
										alt: "",
									}),
								]),
								$("div", "eze_dgallery_cell eze_dgallery_cell_full", [
									// Body table
									$("div", "eze_dgallery_table", [
										$("div", "eze_dgallery_row", [
											$("div", "eze_dgallery_cell", [
												// Title content
												$("h1", "eze_dgallery_title", gal_info.title),
												gal_info.title_original ? $("h2", "eze_dgallery_title_alt", gal_info.title_original) : null,
											]),
										]),
										$("div", "eze_dgallery_row", [
											$("div", "eze_dgallery_cell", [
												// Info table
												$("div", "eze_dgallery_table eze_dgallery_table_spaced", [
													$("div", "eze_dgallery_row", [
														$("div", "eze_dgallery_cell eze_dgallery_cell_nowhite eze_dgallery_cell_pre_border", [
															// Body content
															// Category
															$("p", [
																$("a", { href: "/" + gal_info.category }, [
																	$("img", "ic", {
																		src: "http://st.exhentai.net/img/c/" + gal_info.category + ".png",
																		title: gal_info.category,
																	}),
																]),
															]),
															// Uploader
															$("p", [
																$("span", "eze_dgallery_info_label", "Uploader: "),
																$("a", null, gal_info.uploader, { href: "/uploader/" + gal_info.uploader }),
															]),
															// Uploaded
															$("p", [
																$("span", "eze_dgallery_info_label", "Uploaded: "),
																$.text(date_format(gal_info.date_uploaded, "Y-m-d H:i")),
															]),
															// Image count
															$("p", [
																$("span", "eze_dgallery_info_label", "Images: "),
																$.text(gal_info.image_count + " @ " + bytes_to_labeled_string(gal_info.total_file_size_approx)),
															]),

														]),
														$("div", "eze_dgallery_cell eze_dgallery_cell_full eze_dgallery_cell_border", [
															// Tags
															n1 = $("div", "eze_dgallery_tag_container"),
														]),
													]),
												]),
											]),
										]),
										$("div", "eze_dgallery_row", [
											$("div", "eze_dgallery_extra_container", [
												// Extra stuff
												n2 = $("p", [
													$("a", "eze_gallery_link", "Modify favorite", {
														href: "http://exhentai.org/gallerypopups.php?gid=" + gal_info.gallery.gid + "&t=" + gal_info.gallery.token + "&act=addfav",
														target: "_blank",
													}, $.ON, [ "click", on_favorite_edit_click ]),
												]),
												$("p", [
													$("a", "eze_gallery_link", "Return to front page", { href: "/" }),
												]),
											]),
										]),
									]),
								]),
							]),
						]),
					]),
				]),
			]); //}

			// Search links
			for (i = 0; i < search_links.length; ++i) {
				$("p", [ search_links[i] ], $.B, n2);
			}

			// Add tags
			for (k in gal_info.tags) {
				for (i = 0; i < gal_info.tags[k].length; ++i) {
					$("a", "eze_dgallery_tag", gal_info.tags[k][i], { href: "/tag/\"" + encodeURIComponent(gal_info.tags[k][i]) + "\"" }, $.P, n1);
				}
			}

			// Done
			document.body.innerHTML = "";
			document.body.appendChild(n0);
		};

		var on_favorite_edit_click = function (event) {
			// Skip
			if (event.which != 1) return;

			// Pop-up
			var window_id = "_pu_ezec" + (Math.random() + "").replace(/0\./, ""),
				window_width = 675,
				window_height = 415,
				screen_width = 0,
				screen_height = 0,
				window_settings;

			try {
				screen_width = screen.width;
				screen_height = screen.height;
			}
			catch (e) {}
			window_settings = "toolbar=0,scrollbars=0,location=0,statusbar=0,menubar=0,resizable=0,width=" + window_width + ",height=" + window_height + ",left=" + ((screen_width - window_width) / 2) + ",top=" + ((screen_height - window_height) / 2);

			window.open(this.getAttribute("href"), window_id, window_settings);

			// Stop
			event.preventDefault();
			event.stopPropagation();
			return false;
		};



		return setup_gallery_deleted;

	})();

	var setup_panda = (function () {

		// Primary setup function
		var setup_panda = function () {
			// Setup login
			set_doctype();
			setup_document();
			setup_title();
			setup_stylesheet();
			setup_dom();
		}._w();



		var set_doctype = function () {
			var new_doctype = document.implementation.createDocumentType(
				"html",
				"-//W3C//DTD XHTML 1.0 Transitional//EN",
				"http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtdd"
			);

			if (document.doctype) {
				document.replaceChild(new_doctype, document.doctype);
			}
			else {
				document.insertBefore(new_doctype, document.firstChild);
			}
		};
		var setup_document = function () {
			var doc_el = document.documentElement,
				head = doc_el.querySelector("head") || document.head || null,
				body = doc_el.querySelector("body") || document.body || null,
				meta_charset = $("meta", { charset: "UTF-8" }),
				n;

			// Create head
			if (head !== null) {
				head.innerHTML = "";
			}
			else {
				head = $("head");
				n = doc_el.firstChild;
				if (n !== null) {
					doc_el.insertBefore(head, n);
				}
				else {
					doc_el.appendChild(head);
				}
			}

			// Create body
			if (body === null) {
				body = $("body");
				doc_el.appendChild(body);
			}

			// Setup head
			head.appendChild(meta_charset);
		};
		var setup_title = function () {
			var doc_el = document.documentElement,
				title = $("title"),
				head = doc_el.querySelector("head"),
				i, n;

			// Remove titles
			n = document.querySelectorAll("title");
			for (i = 0; i < n.length; ++i) {
				n[i].parentNode.removeChild(n[i]);
			}

			// Add title
			head.appendChild(title);

			// Update title
			update_title(title);

			// Observe
			var MutationObserver = (window.MutationObserver || window.WebKitMutationObserver);
			if (MutationObserver) {
				new MutationObserver(function () {
					update_title(title);
				})
				.observe(title, { childList: true });
			}
		};
		var update_title = function (title) {
			var text = title.textContent,
				text_target = "Login Helper";

			// Update title
			if (text != text_target) {
				title.textContent = text_target;
			}
		};
		var setup_stylesheet = function () {
			// Styling
			var vars = {
				border: CSS.color("#000000"),
				bg: CSS.color("#43464e"),
				bg_dark: CSS.color("#34353b"),
				bg_light: CSS.color("#4f535b"),
				text: CSS.color("#f1f1f1"),
				text_link: CSS.color("#dddddd"),
				text_link_hover: CSS.color("#fffbdb"),
				text_error: CSS.color("#ff8080"),
				text_success: CSS.color("#80ff80"),
			};

			// Create css
			var css = CSS.format(
				[ //{
				"body{font-size:10pt;font-family:arial,helvetica,sans-serif;color:{{color:text}};background:{{color:bg_dark}};padding:0;margin:0;}",
				"a{color:{{color:text_link}};text-decoration:underline;cursor:pointer;}",
				"a:hover{color:{{color:text_link_hover}};}",

				".eze_main_container{position:absolute;left:0;top:0;bottom:0;right:0;white-space:nowrap;line-height:0;text-align:center;}",
				".eze_main_container:before{content:\"\";display:inline-block;width:0;height:100%;vertical-align:middle;}",
				".eze_main{display:inline-block;vertical-align:top;white-space:normal;line-height:normal;text-align:left;margin:2em 0;}",
				".eze_main.eze_main_middle{vertical-align:middle;}",
				".eze_main_box{border:1px solid {{color:border}};background-color:{{color:bg}};padding:1em;box-sizing:border-box;-moz-box-sizing:border-box;}",

				".eze_input_line{display:block;text-align:left;width:20em;box-sizing:border-box;-moz-box-sizing:border-box;}",
				".eze_input_line+.eze_input_line{margin-top:0.5em;}",
				".eze_input_line.eze_input_center{text-align:center;}",
				".eze_input_line_label_text{font-size:1.5em;font-weight:bold;}",
				].join(""), //}
				vars
			);

			// Insert
			API.inject_style(css);
		};
		var setup_dom = function () {
			var doc_el = document.documentElement,
				body = document.body,
				image = doc_el.querySelector("img"),
				loc = window.location.href,
				site = "" + window.location.hostname.replace(/\.[^\.]*$/, ""),
				n0, image_new, link1_container, link1, link2, link3;

			// Find image url
			if (image !== null) {
				loc = image.getAttribute("src");
			}
			image_new = $("img", "eze_login_image", {
				src: loc,
				alt: "",
			});

			// Create DOM
			n0 = $("div", "eze_main_container", [ //{
				$("div", "eze_main eze_main_middle", [
					$("div", "eze_main_box", [
						$("div", "eze_input_line eze_input_center", [
							image_new,
						]),
						$("div", "eze_input_line", [
							$("span", "eze_input_line_label_text", "Login Instructions:"),
						]),
						$("div", "eze_input_line", [
							link1_container = $("span", "eze_instruction eze_instruction_ready", [
								$.text("Delete all e-hentai and "),
								link1 = $("a", null, site, { title: "Click to delete " + site + " cookies" }),
								$.text(" cookies"),
							]),
						]),
						$("div", "eze_input_line", [
							link2 = $("a", "eze_instruction", "Go to the homepage and log in", { href: "http://e-hentai.org/", target: "_blank", rel: "noreferrer nofollow" }),
						]),
						$("div", "eze_input_line", [
							link3 = $("a", "eze_instruction", "Refresh the page", { href: "" }),
						]),
					]),
				]),
			]); //}

			var remove_cookies = function () {
				Cookies.remove("yay", "/", "." + window.location.hostname);
			};

			// Events
			link1.addEventListener("click", function (event) {
				if (event.which !== 1) return;

				remove_cookies();

				link1_container.classList.add("eze_instruction_complete");
				link2.classList.add("eze_instruction_ready");
				link3.classList.add("eze_instruction_ready");

				event.preventDefault();
				event.stopPropagation();
				return false;
			}, false);
			link3.addEventListener("click", function (event) {
				if (event.which !== 1) return;

				remove_cookies(); // just in case

				link2.classList.add("eze_instruction_complete");
				link3.classList.add("eze_instruction_complete");

				event.preventDefault();
				event.stopPropagation();
				window.location.reload();
				return false;
			}, false);

			// Replace
			body.innerHTML = "";
			body.appendChild(n0);
		};



		return setup_panda;

	})();

	var setup_settings = (function () {

		var setup_settings = function () {
			// Setup navigation
			h_nav.on_change(on_hash_change);
		};



		var on_hash_change = function (h) {
			if (h.path_array.length < 2 || h.path_array[0] !== "eze" || h.path_array[1] !== "settings") {
				hide_settings_panel();
			}
			else {
				if (!show_settings_panel()) create_settings_panel();
			}
		};
		var hide_settings_panel = function () {
			var n = document.querySelector(".eze_settings_container");
			if (n !== null) {
				n.classList.remove("eze_settings_container_visible");
				return true;
			}
			return false;
		};
		var show_settings_panel = function () {
			var n = document.querySelector(".eze_settings_container");
			if (n !== null) {
				n.classList.add("eze_settings_container_visible");
				return true;
			}
			return false;
		};

		var create_settings_panel = function () {
			// Create
			var rel = document.querySelector(".stuffbox"),
				container = $("div", "eze_settings_container eze_settings_container_visible"),
				params = settings.get("custom_search_params"),
				n_min_rating, box;

			n_min_rating = new OptionBox([ ["2"] , ["3"] , ["4"] , ["5"] ], ("f_srdd" in params ? params.f_srdd : "2"), function (value) {
				var v = settings.get("custom_search_params");
				if ("f_sr" in v) {
					v.f_srdd = value;
					settings.set("custom_search_params", v);
				}
			});

			// Primary settings
			box = $("div", "eze_settings_box", [
				$("h1", "eze_settings_header", "Search link settings"),
				$("div", "eze_settings_entry_container", [
					$("div", "eze_settings_entry", [
						$("label", "eze_settings_label", [
							$("input", { type: "checkbox" }, $.ON, [ "change", on_checkbox_change, false, [ $.node, "custom_search_front_page" ] ], $.CHECKED, settings.get("custom_search_front_page")),
							$("strong", null, "Apply these settings to the front page"),
						]),
					]),
					$("div", "eze_settings_entry", [
						$("label", "eze_settings_label", [
							$("input", { type: "checkbox" }, $.ON, [ "change", on_checkbox_change, false, [ $.node, "custom_search_links" ] ], $.CHECKED, settings.get("custom_search_links")),
							$("strong", null, "Apply these settings to custom search links"),
						]),
					]),
					$("div", "eze_settings_entry", [
						$("label", "eze_settings_label", [
							$("input", { type: "checkbox" }, $.ON, [ "change", on_checkbox_change, false, [ $.node, "custom_search_form" ] ], $.CHECKED, settings.get("custom_search_form")),
							$("strong", null, "Apply these settings to the search form"),
						]),
					]),
					create_search_setting("Search gallery descriptions", "f_sdesc", "on"),
					create_search_setting("Search low-power tags", "f_sdt1", "on"),
					create_search_setting("Search downvoted tags", "f_sdt2", "on"),
					create_search_setting("Search torrent filenames", "f_storr", "on"),
					create_search_setting("Show exclusively galleries with torrents", "f_sto", "on"),
					create_search_setting("Show expunged galleries", "f_sh", "on"),
					$("div", "eze_settings_entry", [
						$("label", "eze_settings_label", [
							$("input", { type: "checkbox" }, $.ON, [ "change", on_search_setting2_change, false, [ $.node, "f_sr", "on", "f_srdd", n_min_rating ] ], $.CHECKED, "f_sr" in params),
							$("span", null, "Minimum rating"),
							n_min_rating.node,
						]),
					]),
				]),
				// minimum rating
			], $.P, container);

			n_min_rating.node.classList.add("eze_settings_pad_left");

			// Add
			if (rel !== null) {
				rel.parentNode.insertBefore(container, rel);
			}
			else {
				document.body.appendChild(container);
			}
		};
		var create_search_setting = function (name, var_name, var_value) {
			var checked = (var_name in settings.get("custom_search_params")),
				n1;

			n1 = $("div", "eze_settings_entry", [
				$("label", "eze_settings_label", [
					$("input", { type: "checkbox" }, $.ON, [ "change", on_search_setting_change, false, [ $.node, var_name, var_value ] ], $.CHECKED, checked),
					$("span", null, name),
				]),
			]);

			return n1;
		};

		var on_search_setting_change = function (var_name, var_value) {
			var v = settings.get("custom_search_params");
			if (this.checked) {
				// Set
				v[var_name] = var_value;
				settings.set("custom_search_params", v);
			}
			else {
				// Remove
				if (var_name in v) {
					delete v[var_name];
					settings.set("custom_search_params", v);
				}
			}
		};
		var on_search_setting2_change = function (var_name, var_value, var_name2, option_box) {
			var v = settings.get("custom_search_params");

			if (this.checked) {
				// Set
				v[var_name] = var_value;
				v[var_name2] = option_box.get();
				settings.set("custom_search_params", v);
			}
			else {
				// Remove
				var changed = false;
				if (var_name in v) {
					delete v[var_name];
					changed = true;
				}
				if (var_name2 in v) {
					delete v[var_name2];
					changed = true;
				}
				if (changed) {
					settings.set("custom_search_params", v);
				}
			}
		};
		var on_checkbox_change = function (var_name) {
			settings.set(var_name, this.checked);
		};



		return setup_settings;

	})();



	// Init
	var settings = new Settings();
	var h_nav = new Hash();
	setup_before_ready();
	on_ready(function () {
		// Page check
		var page_type = API.get_page_type_from_html(document.documentElement);
		if (page_type === null) return; // Don't do anything

		if (page_type == "panda") {
			// Sad panda
			setup_panda();
		}
		else {
			// Styling
			insert_stylesheet();
			setup_modified_titles();
			setup_custom_settings_link();

			if (page_type == "search" || page_type == "favorites") {
				setup_search(page_type);
			}
			else if (page_type == "gallery") {
				setup_gallery();
			}
			else if (page_type == "gallery_deleted") {
				setup_gallery_deleted();
			}
			else if (page_type == "settings") {
				setup_settings();
			}
		}

		// Init hash navigation
		h_nav.init();
	});

})(window);


