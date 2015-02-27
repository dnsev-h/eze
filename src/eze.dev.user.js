// ==UserScript==
// @name           eze
// @version        1.0.1.1
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
// @include        http://forums.e-hentai.org/*
// @include        https://forums.e-hentai.org/*
// @icon           data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwAQMAAABtzGvEAAAABlBMVEUAAABmBhHV14kpAAAAAXRSTlMAQObYZgAAADFJREFUeAFjIB4w//9BLPWBgSLq//HH/w8QQYE18GOj6hgwKCBCpcDOZQaZQpgiGgAA0dhUnSJVLdEAAAAASUVORK5CYII=
// ==/UserScript==
// ==Meta==
// @updateURL      https://raw.githubusercontent.com/dnsev-h/eze/master/builds/{{meta}}
// @downloadURL    https://raw.githubusercontent.com/dnsev-h/eze/master/builds/{{target}}
// ==/Meta==



// Main scope
(function () {
	"use strict";



	// Classes required for fast exit
	// URL hash reader
	var HashReader = (function () {

		var HashReader = {

			encode_hash: function (path, vars, no_pretty) {
				var str = hash_prefix;

				if (typeof(path) == "string") {
					str += path;
				}
				else {
					str += path.join("/");
				}

				if (vars) {
					str += hash_var_separator;
					str += HashReader.encode_vars(vars, no_pretty);
				}

				return str;
			},
			decode_hash: function (hash, no_pretty) {
				var i = 0;

				// Remove prefix
				while (i < hash_prefix.length && hash[i] == hash_prefix[i]) ++i;
				if (i > 0) hash = hash.substr(i);

				// Split parts
				i = hash.indexOf(hash_var_separator);
				if (i >= 0) {
					return [ hash.substr(0, i) , HashReader.decode_vars(hash.substr(i + hash_var_separator.length), no_pretty) ];
				}
				else {
					return [ hash , null ];
				}
			},

			encode_vars: function (vars, no_pretty) {
				var str = "",
					escape_fcn = (no_pretty === true) ? escape_var_simple : escape_var,
					v;

				if (Array.isArray(vars)) {
					// Array of vars
					for (v = 0; v < vars.length; ++v) {
						if (v > 0) str += "&";

						str += escape_fcn(vars[v][0]);
						if (vars[v].length > 1) {
							str += "=";
							str += escape_fcn(vars[v][1]);
						}
					}
				}
				else {
					// Object of vars
					for (v in vars) {
						if (str.length > 0) str += "&";

						str += escape_fcn(v);
						if (vars[v] !== null) {
							str += "=";
							str += escape_fcn(vars[v]);
						}
					}
				}

				return str;
			},
			decode_vars: function (str, no_pretty) {
				var vars = {},
					str_split = str.split("&"),
					escape_fcn = (no_pretty === true) ? unescape_var : unescape_var_pretty,
					match, i;

				for (i = 0; i < str_split.length; ++i) {
					// Get the match
					if (str_split[i].length === 0) continue;
					match = re_decode_var.exec(str_split[i]);

					// Set the var
					vars[escape_fcn(match[1])] = (match[2]) ? escape_fcn(match[2]) : null;
				}

				// Return the vars
				return vars;
			},

		};



		var hash_prefix = "#!",
			hash_var_separator = "?",
			re_encode_pretty = /\%20/g,
			re_decode_pretty = /\+/g,
			re_decode_var = /^(.*?)(?:=(.*))?$/,
			re_encode_simple = /[ %&=]/g,
			re_encode_simple_map = {
				" ": "+",
				"%": "%25",
				"&": "%26",
				"=": "%3D",
			};

		var escape_var = function (str) {
			return encodeURIComponent(str).replace(re_encode_pretty, "+");
		};
		var escape_var_simple = function (str) {
			return str.replace(re_encode_simple, function (m) {
				return re_encode_simple_map[m[0]];
			});
		};
		var unescape_var_pretty = function (str) {
			return decodeURIComponent(str.replace(re_decode_pretty, "%20"));
		};
		var unescape_var = function (str) {
			return decodeURIComponent(str);
		};



		return HashReader;

	})();

	// Quick exit
	var eze_hash = null;
	if (window.location.hostname == "forums.e-hentai.org") {
		eze_hash = HashReader.decode_hash(window.location.hash);
		if (eze_hash[0] != "eze") return; // No execute
	}



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
			"d": function (date) { // Day of the month, 2 digits with leading zeros
				var s = date.getDate().toString();
				if (s.length < 2) s = "0" + s;
				return s;
			},
			"j": function (date) { // Day of the month without leading zeros
				return date.getDate().toString();
			},
			"l": function (date) { // A full textual representation of the day of the week
				return days[date.getDay()];
			},
			"D": function (date) { // A textual representation of a day, three letters
				return days_short[date.getDay()];
			},
			"S": function (date) { // English ordinal suffix for the day of the month, 2 characters
				var i = (date.getDate() - 1); // % 100
				if ((i < 10 || i > 19) && (i = i % 10) <= 3) return ordinals[i];
				return ordinals[0];
			},
			"w": function (date) { // Numeric representation of the day of the week
				return date.getDay().toString();
			},
			"F": function (date) { // A full textual representation of a month, such as January or March
				return months[date.getMonth()];
			},
			"M": function (date) { // A short textual representation of a month, three letters
				return months_short[date.getMonth()];
			},
			"m": function (date) { // Numeric representation of a month, with leading zeros
				var s = (date.getMonth() + 1).toString();
				if (s.length < 2) s = "0" + s;
				return s;
			},
			"n": function (date) { // Numeric representation of a month, without leading zeros
				return (date.getMonth() + 1).toString();
			},
			"y": function (date) { // Year, 2 digits
				return date.getFullYear().toString().substr(2);
			},
			"Y": function (date) { // A full numeric representation of a year, 4 digits
				return date.getFullYear().toString();
			},
			"a": function (date) { // Lowercase Ante meridiem and Post meridiem
				return (date.getHours() >= 11 && date.getHours() <= 22 ? "pm" : "am");
			},
			"A": function (date) { // Uppercase Ante meridiem and Post meridiem
				return (date.getHours() >= 11 && date.getHours() <= 22 ? "PM" : "AM");
			},
			"g": function (date) { // 12-hour format of an hour without leading zeros
				return ((date.getHours() % 12) + 1).toString();
			},
			"h": function (date) { // 12-hour format of an hour with leading zeros
				var s = ((date.getHours() % 12) + 1).toString();
				if (s.length < 2) s = "0" + s;
				return s;
			},
			"G": function (date) { // 24-hour format of an hour without leading zeros
				return date.getHours().toString();
			},
			"H": function (date) { // 24-hour format of an hour with leading zeros
				var s = date.getHours().toString();
				if (s.length < 2) s = "0" + s;
				return s;
			},
			"i": function (date) { // Minutes with leading zeros
				var s = date.getMinutes().toString();
				if (s.length < 2) s = "0" + s;
				return s;
			},
			"s": function (date) { // Seconds with leading zeros
				var s = date.getSeconds().toString();
				if (s.length < 2) s = "0" + s;
				return s;
			},
			"u": function (date) { // Milliseconds (note: this is different from PHP)
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
		};
		BufferWriter.prototype = {
			constructor: BufferWriter,

			reset: function (buffer) {
				this.buffer = buffer;
				this.pos = 0;
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



		ZipCreator.array_to_string = array_to_string;
		ZipCreator.string_to_array = string_to_array;



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

			to_buffer: function () {
				var total_size = this.calculate_size(),
					file_count = this.files.length,
					bw = new BufferWriter(new Uint8Array(total_size)),
					pos_cd, i, f;

				// Write file data
				for (i = 0; i < file_count; ++i) {
					f = this.files[i];
					f.prepare(bw.pos);

					// Header
					bw.write_data(signatures.file); // Signature
					write_file_header.call(this, bw, f);

					// Data
					bw.write_data(f.name_data); // Name
					bw.write_data(f.extra_data); // Extra
					bw.write_data(f.data); // Data
				}

				// Central directory
				pos_cd = bw.pos;
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
				bw.write_data(signatures.footer); // Signature
				write_footer.call(this, bw, file_count, pos_cd, bw.pos);
				bw.write_data(this.comment_data); // Comment

				// Done
				return bw.buffer;
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
					var val = GM_getValue(key, undefined);
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
						GM_setValue(key, JSON.stringify(value));
					}
					catch (e) {
						okay = false;
					}
					if (callback) callback.call(null, okay);
				},
				del: function (key, callback) {
					// Remove
					GM_deleteValue(key);
					if (callback) callback.call(null, true);
				},
				keys: function (callback) {
					// List keys
					var keys = GM_listValues();
					callback.call(null, keys, true);
				},
				size: function (callback) {
					var keys = GM_listValues(),
						size = 0,
						i;

					// Create representation
					for (i = 0; i < keys.length; ++i) {
						size += object_byte_size(keys[i]) + ((GM_getValue(keys[i], null) || "").length || 0);
					}

					// Return
					callback.call(null, size, true);
				},
				clear: function (callback) {
					var keys = GM_listValues(),
						i;

					// Create representation
					for (i = 0; i < keys.length; ++i) {
						GM_deleteValue(keys[i]);
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

		var Cookies = {

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



		var invalid_cookies = [ "expires" , "max-age" , "path" , "domain" , "secure" ];



		return Cookies;

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
			"json": function (text) {
				try {
					return JSON.parse(text);
				}
				catch (e) {
					return null;
				}
			},
			"document": function (text) {
				try {
					var parser = new DOMParser(),
						doc = parser.parseFromString(text, "text/html");

					return doc;
				}
				catch (e) {
					return null;
				}
			},
			"arraybuffer": function (text) {
				var array = new Uint8Array(new ArrayBuffer(text.length)),
					i;

				for (i = 0; i < text.length; ++i) {
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
			extra.response_headers = header_string_parse(response_headers);
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
		var Ajax = function (method, url, data, settings, on_load, on_error, on_complete, on_progress) {
			var extra, xhr_data, xhr, parser, okay, v;
			extra = {
				url: url,
				response_headers: null,
			};

			// Values
			this.abort = null;

			// Run
			if (settings && settings.use_gm && can_use_gm) {
				// Setup xhr args
				xhr_data = {
					method: method,
					url: url,
				};
				parser = null;

				// Setup
				if (settings) {
					if ("response_type" in settings) {
						v = settings.response_type;

						if (v in response_parsers) {
							parser = response_parsers[v];
						}
						if (v == "arraybuffer") {
							xhr_data.overrideMimeType = "text/plain; charset=x-user-defined";
						}
					}
					if ("headers" in settings) {
						xhr_data.headers = settings.headers;
					}
				}

				// Events
				if (on_load || on_complete) {
					xhr_data.onload = function (response) {
						// Complete extra
						complete_extra(extra, response.responseHeaders);

						// Process response
						var res_data = response.responseText;
						if (parser !== null) res_data = parser.call(null, res_data);

						// Events
						if (on_load) on_load.call(null, res_data, response.status, response.statusText, extra);
						if (on_complete) on_complete.call(null, true, extra);
					};
				}
				if (on_error || on_complete) {
					xhr_data.onerror = function () {
						// Complete extra
						complete_extra(extra, response.responseHeaders);

						// Events
						if (on_error) on_error.call(null, "error", extra);
						if (on_complete) on_complete.call(null, false, extra);
					};
					xhr_data.onabort = function () {
						// Complete extra
						complete_extra(extra, response.responseHeaders);

						// Events
						if (on_error) on_error.call(null, "abort", extra);
						if (on_complete) on_complete.call(null, false, extra);
					};
				}
				if (on_progress) {
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
						on_progress.call(null, perc, event.loaded, total, extra);
					};
				}


				// Send
				if (data !== null) xhr_data.data = data;
				xhr = GM_xmlhttpRequest(xhr_data);

				// Done
				this.abort = function () {
					if (xhr !== null) {
						var x = xhr;
						xhr = null;
						try {
							x.abort();
						}
						catch (e) {} // Shouldn't happen, but just to be safe
					}
				};
			}
			else {
				// Create XHR
				xhr = new XMLHttpRequest();
				okay = false;

				// Open
				xhr.open(method, url, true);

				// Setup
				if (settings) {
					if ("response_type" in settings) {
						v = settings.response_type;

						xhr.responseType = v;
						if (v == "arraybuffer") {
							xhr.overrideMimeType("text/plain; charset=x-user-defined");
						}
					}
					if ("headers" in settings) {
						for (v in settings.headers) {
							xhr.setRequestHeader(v, settings.headers[v]);
						}
					}
				}

				// Events
				if (on_load) {
					xhr.addEventListener("load", function () {
						// Complete extra
						complete_extra(extra, xhr.getAllResponseHeaders());

						// Event
						okay = true;
						on_load.call(null, xhr.response, xhr.status, xhr.statusText, extra);
					}, false);
				}
				if (on_error) {
					xhr.addEventListener("error", function () {
						// Complete extra
						complete_extra(extra, xhr.getAllResponseHeaders());

						// Event
						on_error.call(null, "error", extra);
					}, false);
					xhr.addEventListener("abort", function () {
						// Complete extra
						complete_extra(extra, xhr.getAllResponseHeaders());

						// Event
						on_error.call(null, "abort", extra);
					}, false);
				}
				if (on_complete) {
					xhr.addEventListener("loadend", function () {
						// Event
						on_complete.call(null, okay, extra);
					}, false);
				}
				if (on_progress) {
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
						on_progress.call(null, perc, event.loaded, total, extra);
					}, false);
				}

				// Send
				if (data === null) {
					xhr.send();
				}
				else {
					xhr.send(data);
				}

				// Done
				this.abort = function () {
					if (xhr !== null) {
						xhr.abort();
						xhr = null;
					}
				};
			}
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



		var CSS = {

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
				return getComputedStyle(node)[style];
			},

		};



		return CSS;

	})();

	// Page geometry
	var Geometry = (function () {

		var Geometry = {

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
			get_document_offset: function () {
				var doc = document.documentElement;

				return {
					left: (window.pageXOffset || doc.scrollLeft || 0) - (doc.clientLeft || 0),
					top: (window.pageYOffset || doc.scrollTop || 0)  - (doc.clientTop || 0),
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



		return Geometry;

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
			};
		}
		else {
			return function () {
				return callback.apply(self, arguments);
			};
		}
	};

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
			re_remove_slashes = /^\/+|\/{2,}/g;

		var encode_vars = function (vars) {
			var str = "",
				first = true,
				v;

			if (Array.isArray(vars)) {
				for (v = 0; v < vars.length; ++v) {
					if (v > 0) str += "&";

					str += encodeURIComponent(vars[v][0]);
					if (vars[v][1] !== null) {
						str += "=";
						str += encodeURIComponent(vars[v][1]);
					}
				}
			}
			else {
				for (v in vars) {
					if (first) first = false;
					else str += "&";

					str += encodeURIComponent(v);
					if (vars[v] !== null) {
						str += "=";
						str += encodeURIComponent(vars[v]);
					}
				}
			}

			return str;
		};

		var parse_state = function (h) {
			var i, m1, m2, s, k, v;

			// Normalize
			for (i = 0; i < hash_sep.length && h[i] === hash_sep[i]; ++i);
			if (i > 0) h = h.substr(i);

			// Match
			m1 = re_parts.exec(h);

			// Parse path
			this.path = m1[1].replace(re_remove_slashes, "");
			this.path_array = this.path.split("/");
			for (i = 0; i < this.path_array.length; ++i) {
				this.path_array[i] = decodeURIComponent(this.path_array[i]);
			}

			// Parse vars
			this.vars = {};
			this.vars_array = [];
			if (m1[2] !== undefined) {
				s = m1[2].split("&");

				for (i = 0; i < s.length; ++i) {
					// Skip
					if (s[i].length === 0) continue;

					// Match
					m2 = re_decode_var.exec(s[i]);

					// Set the var
					k = decodeURIComponent(m2[1]);
					v = (m2[2] === undefined) ? null : decodeURIComponent(m2[2]);
					this.vars[k] = v;
					this.vars_array.push([ k , v ]);
				}
			}
		};

		var trigger_change = function (reason) {
			// Update state
			parse_state.call(this, window.location.hash);

			// Trigger a change event
			for (var i = 0; i < this.change_listeners.length; ++i) {
				this.change_listeners[i].call(null, this, reason);
			}
		};



		Hash.sep = hash_sep;



		Hash.prototype = {
			init: function () {
				// Events
				window.addEventListener("popstate", this.onchange_listener, false);

				// Init trigger
				trigger_change.call(this, "init");
			},

			parse: function (url) {
				var m = re_hash_find.exec(url),
					obj;

				if (m !== null) {
					obj = new ParsedHash(m[0]);
				}
				else {
					obj = new ParsedHash(null);
				}

				return obj;
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



		return Hash;

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
				petition_expunge: 0,
				petition_rename: [ 0 , 0 ],
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
			};
		};
		var create_blank_image_data = function () {
			return {
				page: 0,
				page_count: 0,
				gallery: {
					gid: 0,
					token: "",
					title: null,
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
					direct_id: null,
				},
			};
		};

		var api_site = (window.location.hostname == "exhentai.org") ? "exhentai" : "e-hentai";



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
			request_document: function (url, on_load, on_error, on_complete, on_progress) {
				return new Ajax(
					"GET",
					url,
					null,
					{
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
					if (path[0] != "g") return null; // invalid

					if (path.length >= 3) {
						// Good
						data.gid = parseInt(path[1], 10);
						data.token = path[2];
					}

					// Page
					if (match[2]) {
						if ((match = /[\?\&]p=(\d+)/.exec(match[2]))) {
							data.page = parseInt(match[1], 10);
						}
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

					info.title_alt = title_split.slice(0, i).join("|");
					info.title = title_split.slice(i).join("|");
				}
				else {
					info.title = title;
				}

				// Done
				return info;
			},

			get_pages_info_from_html: function (html) {
				// Detect page groups
				var pages = html.querySelectorAll(".ptt td"),
					i, n;

				// Not found
				if (pages.length === 0) return null;

				// Create info
				var page_info = {
					current: 0,
					count: 0,
				};

				// Max
				if ((n = pages[pages.length - 2])) {
					page_info.count = (parseInt(n.textContent.trim(), 10) || 1);
				}

				// Current
				for (i = 0; i < pages.length; ++i) {
					n = pages[i];
					if (n.classList.contains("ptds")) {
						page_info.current = (parseInt(n.textContent.trim(), 10) || 1) - 1;
					}
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

				if ((par = html.querySelectorAll("#gdd tr")).length >= 6) {
					// Date uploaded
					if (
						(n = par[0].querySelector(".gdt2")) !== null &&
						(m = API.get_date_uploaded_from_node(n)) !== null
					) {
						data.date_uploaded = m;
					}

					// Image count/size
					pattern = /([0-9]+)\s*@\s*([0-9\.]+)\s*(\w+)/;
					if (
						(n = par[1].querySelector(".gdt2")) !== null &&
						(m = pattern.exec(n.textContent))
					) {
						data.image_count = parseInt(m[1], 10);
						data.total_file_size_approx = size_label_to_bytes(m[2], m[3]);
					}

					// Resized
					pattern = /for\s+browsing/i;
					if (
						(n = par[2].querySelector(".gdt2")) !== null &&
						(m = pattern.exec(n.textContent))
					) {
						data.images_resized = true;
					}

					// Parent
					if (
						(n = par[3].querySelector(".gdt2>a")) !== null &&
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
						(n = par[4].querySelector(".gdt2")) &&
						(m = pattern.exec(n.textContent))
					) {
						data.visible = false;
						data.visible_reason = m[1];
					}

					// Language
					pattern = /(.+)(?:\s*\((.+?)\))/i;
					if (
						(n = par[5].querySelector(".gdt2")) &&
						(m = pattern.exec(n.textContent))
					) {
						data.language = m[1].trim();
						data.translated = !!m[2];
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
				if ((n = html.querySelector("#favcount")) !== null) {
					data.favorites.count = parseInt(n.textContent.trim(), 10);
				}
				if ((n = html.querySelector("#fav>div.i")) !== null) {
					info = API.get_favorite_icon_info_from_node(n);
					data.favorites.category = info[0]
					data.favorites.category_title = info[1];
				}

				// Petitions
				if ((n = html.querySelector("#expungecount")) !== null) {
					data.petition_expunge = parseFloat(n.textContent.trim());
				}
				if ((n = html.querySelector("#rename_r")) !== null) {
					data.petition_rename[0] = parseFloat(n.textContent.trim());
				}
				if ((n = html.querySelector("#rename_j")) !== null) {
					data.petition_rename[1] = parseFloat(n.textContent.trim());
				}

				// Thumbnail settings
				if ((par = html.querySelectorAll("#gd5>.g1")).length >= 2) {
					if (
						(n = par[0].firstChild) !== null &&
						(n.tagName == "A")
					) {
						data.thumbnail_size = "large";
					}
					else {
						data.thumbnail_size = "normal";
					}

					pattern = /bold/i;
					for (n = par[0].firstChild; n; n = n.nextSibling) {
						if (pattern.exec(n.getAttribute("style"))) {
							data.thumbnail_rows = parseInt(n.textContent.trim(), 10);
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

				div.innerHTML = json.title; // Replace special &#...; chars
				data.title = div.textContent;
				div.innerHTML = json.title_jpn;
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
					large, nodes, image, i, n, m, n2;

				// Find containers
				if ((n = html.querySelector("#gdt")) !== null) {
					// Image nodes
					nodes = n.querySelectorAll(".gdtm");
					if ((large = (nodes.length === 0))) {
						nodes = n.querySelectorAll(".gdtl");
					}

					// Scan all
					for (i = 0; i < nodes.length; ++i) {
						n = nodes[i];

						// Create new image
						image = create_blank_gallery_image_data();

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
				var page_vars, nodes, info, re, i, n, m;

				// Setup data
				var data = create_blank_image_data();

				// Scripts
				if ((n = html.querySelector("body>script:not([src])")) !== null) {
					// Get vars
					re = /var\s+(\w+)\s*=\s*(.+?);/g;
					page_vars = {};
					n.textContent.replace(re, function (full, name, val) {
						try {
							page_vars[name] = JSON.parse(val);
						}
						catch (e) {}
						return "";
					});

					if ("startkey" in page_vars) data.navigation.key_current = page_vars.startkey;
					if ("showkey" in page_vars) data.navigation.api_key = page_vars.showkey;
					if ("si" in page_vars) data.navigation.direct_id = page_vars.si || null;
				}
				if (data.navigation.direct_id === null) {
					if ((n = html.querySelectorAll("a[onclick]")).length > 0) {
						re = /^\s*return\s+nl\s*\(\s*(\d+)\s*\)\s*$/;
						for (i = 0; i < n.length; ++i) {
							if ((m = re.exec(n[i].getAttribute("onclick") || ""))) {
								data.navigation.direct_id = parseInt(m[1], 10);
								break;
							}
						}
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
					info, re, m, n;

				// Setup data
				var data = create_blank_image_data();

				// Basic info
				data.page = (json.p || 1) - 1;
				data.navigation.key_current = json.k || "";
				data.navigation.direct_id = json.si || 0;

				data.image.width = parseInt(json.x, 10) || 0;
				data.image.height = parseInt(json.y, 10) || 0;

				// Get info
				div.innerHTML = json.i || "";
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
				div.innerHTML = json.i3 || "";
				if ((n = div.querySelector("#img")) !== null) {
					data.image.url = n.getAttribute("src") || "";
				}
				else {
					return null;
				}

				// Get pages
				div.innerHTML = json.n;
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

				// Gallery
				div.innerHTML = json.i5;
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
					div.innerHTML = json.i7;
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
									callback.call(null, API.OK, data);
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
					// Request the page
					return API.request_document("/s/" + key + "/" + gid + "-" + (page + 1) + (direct_id !== null ? "?nl=" + direct_id : ""),
						// On load
						function (response, status, status_text) {
							if (on_load) on_load.apply(this, arguments);

							if (status == 200) {
								var data = API.get_image_info_from_html(response);
								if (data !== null) {
									callback.call(null, API.OK, data);
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

				if ((n = html.querySelector("#searchbox")) !== null) {
					return "search";
				}
				else if ((n = html.querySelector("input.stdbtn[value='Search Favorites']")) !== null) {
					return "favorites";
				}
				else if ((n = html.querySelector("#i1>h1")) !== null) {
					return "image";
				}
				else if ((n = html.querySelector(".gm h1#gn")) !== null) {
					return "gallery";
				}
				else if (
					(n = html.querySelector("body>.d>p")) !== null &&
					/this gallery has been removed, and is unavailable\./i.exec(n.textContent.trim()) !== null
				) {
					return "gallery_deleted";
				}
				else if ((n = html.querySelector("img[src]")) !== null) {
					if (n.getAttribute("src") === window.location.href && window.location.pathname.substr(0, 3) !== "/t/") {
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
								data.favorites.category = info[0]
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
								data.favorites.category = info[0]
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
					search = m[2].substr(1).replace(new RegExp("(^|&)" + page_key + "=[^&]*/", "g"), function (m, prefix) {
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



		var trigger = function (event, data) {
			for (var i = 0, list = this.events[event]; i < list.length; ++i) {
				list[i].call(null, data, event);
			}
		};
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

			on: function (event, callback) {
				if (event in this.events) {
					this.events[event].push(callback);
					return true;
				}
				return false;
			},
			off: function (event, callback) {
				if (event in this.events) {
					for (var i = 0, list = this.events[event]; i < list.length; ++i) {
						if (list[i] === callback) {
							list.splice(i, 1);
							return true;
						}
					}
				}
				return false;
			},

			add_option: function (data, settings) {
				var tag_type = "a",
					tag_class = "eze_menu_option",
					is_label = false,
					opt, on_click;

				if (settings) {
					if (settings.label) {
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

	// Gallery downloader
	var GalleryDownloader = (function () {

		var GalleryDownloader = function (gallery) {
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
			};

			this.active = false;
			this.state = GalleryDownloader.NOT_STARTED;

			this.request_gallery = new Requester(this, request_gallery_page, request_gallery_page_done, 1.0, 3.0, 1.0);
			this.request_image_page = new Requester(this, request_image_page, request_image_page_done, 1.0, 3.0, 1.0);
			this.request_image = new Requester(this, request_image, request_image_done, 1.0, 3.0, 1.0);

			this.request_timeout = 30.0;
			this.request_image.retry_max = 2;

			this.use_full_images = true;

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
			this.images = [];
			this.image_counts = [ 0 , 0 , 0 , 0 , 0 ];
			this.image_total_bytes = [ 0 , 0 , 0 ];
			this.image_total_bytes_loaded = 0;
		};



		var Requester = function (downloader, request_function, completion_check, delay_okay, delay_error, delay_abort) {
			this.downloader = downloader;

			this.index = 0;
			this.progress = 0.0;
			this.progress_loaded = 0;
			this.progress_total = 0;
			this.retry_index = 0;
			this.retry_max = 0;

			this.delays = [ delay_okay , delay_error , delay_abort ];

			this.request = null;
			this.timeout_timer = null;
			this.delay_timer = null;

			this.request_function = request_function;
			this.completion_check = completion_check;
		};
		Requester.prototype = {
			constructor: Requester,

			stop: function () {
				// Returns true if a request was active, false otherwise
				if (this.timeout_timer !== null) {
					clearTimeout(this.timeout_timer);
					this.timeout_timer = null;
				}
				if (this.request !== null) {
					this.request.abort();
					this.request = null;
					this.progress_reset();
					return true;
				}

				return false;
			},
			resume: function () {
				// Don't continue if a delay timeout is active
				if (this.request === null && this.delay_timer === null && !this.completion_check.call(this.downloader, this)) {
					this.retry_index = 0;
					this.progress_reset();
					this.request_function.call(this.downloader, this);
					if (this.request !== null) {
						this.timeout_timer = setTimeout(bind(this.on_request_timeout, this), this.downloader.request_timeout * 1000);
					}
				}
			},

			next: function (event_name) {
				// Next
				var i = this.index;
				++this.index;
				this.retry_index = 0;

				// Done
				trigger.call(this.downloader, event_name, {
					downloader: this.downloader,
					index: i,
				});

				// Delay next
				this.delay(GalleryDownloader.DELAY_OKAY);
			},
			delay: function (mode) {
				this.delay_timer = setTimeout(this.on_delay_timeout.bind(this), (mode >= 0) ? this.delays[mode] * 1000 : 0.0);
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
					this.delay(GalleryDownloader.DELAY_ERROR);
				}
			},

			progress_reset: function () {
				this.progress = 0.0;
				this.progress_loaded = 0;
				this.progress_total = 0;
			},

			on_delay_timeout: function () {
				// Stop timer
				this.delay_timer = null;
				if (this.downloader.active && this.request === null && !this.completion_check.call(this.downloader, this)) {
					this.progress_reset();
					this.request_function.call(this.downloader, this);
					if (this.request !== null) {
						this.timeout_timer = setTimeout(bind(this.on_request_timeout, this), this.downloader.request_timeout * 1000);
					}
				}
			},
			on_request_timeout: function () {
				// Stop timer
				this.timeout_timer = null;

				// Stop request
				this.stop();

				// Error
				trigger_error.call(this.downloader, "Request timed out");

				// Retry
				this.retry();
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



		var trigger = function (event, data) {
			for (var i = 0, list = this.events[event]; i < list.length; ++i) {
				list[i].call(null, data, event);
			}
		};
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
				this.request_gallery.resume();
			}
			else if (this.state == GalleryDownloader.REQUESTING_IMAGES) {
				this.request_image_page.resume();
				this.request_image.resume();
			}
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
			req.stop();

			if (status == API.OK) {
				// Set info
				if (this.gal_info === null) {
					this.gal_info = data;
					this.gal_title_info = API.get_gallery_title_info(this.gal_info.title);
					this.image_total_bytes[GalleryDownloader.IMAGE_NOT_ACQUIRED] = this.gal_info.total_file_size_approx;
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
					i;

				for (i = 0; i < images.length; ++i) {
					this.images.push({
						info_from_gallery: images[i],
						info: null,
						info_fallback: null,
						byte_data: null,
						used: {
							method: GalleryDownloader.IMAGE_NOT_ACQUIRED,
							info: null,
						},
					});
				}
				this.image_counts[GalleryDownloader.IMAGE_NOT_ACQUIRED] += images.length;

				// Next
				req.next("gallery_page_get");
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
				if (i.navigation.key_next) {
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
			req.stop();

			if (status == API.OK) {
				// Set info
				this.images[req.index].info = data;

				// Update size
				this.image_total_bytes[GalleryDownloader.IMAGE_FULL] += (data.image_original !== null) ? data.image_original.size_approx : data.image.size_approx;
				this.image_total_bytes[GalleryDownloader.IMAGE_RESIZED] += data.image.size_approx;

				// Next
				req.next("image_page_get");

				// Continue the image requester
				this.request_image.resume();
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
			if (try_index === 0) {
				// Get the primary image
				if (use_full) {
					if (image_data.info.image_original === null) {
						using_data = image_data.info.image;
						using_method = GalleryDownloader.IMAGE_UNRESIZED;
					}
					else {
						using_data = image_data.info.image_original;
						using_method = GalleryDownloader.IMAGE_FULL;
					}
				}
				else {
					using_data = image_data.info.image;
					using_method = (image_data.info.image_original === null) ? GalleryDownloader.IMAGE_UNRESIZED : GalleryDownloader.IMAGE_RESIZED;
				}
			}
			else {
				if (use_full && try_index <= (image_data.info.image_original === null ? 0 : 1)) {
					// Get the resized image
					using_data = image_data.info.image;
					using_method = GalleryDownloader.IMAGE_RESIZED;
				}
				else if (image_data.info_fallback !== null) {
					// Get the fallback image
					using_data = image_data.info_fallback.image;
					using_method = GalleryDownloader.IMAGE_FALLBACK;
				}
				// Else, get the fallback page
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
			req.request = null;
			req.stop();

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
			req.next("image_get");
		};
		var on_request_image_error = function (req, event) {
			req.request = null;
			req.stop();

			if (event != "abort") {
				// Error
				trigger_error.call(this, "Request for image failed");

				// Retry
				req.retry();
			}
		};
		var on_request_image_fallback_page_callback = function (req, status, data) {
			req.stop();

			if (status == API.OK) {
				// Set info
				this.images[req.index].info_fallback = data;

				// Delay next
				req.delay(GalleryDownloader.DELAY_OKAY);
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
				if (this.request_gallery.stop()) {
					this.request_gallery.delay(GalleryDownloader.DELAY_ABORT);
				}
				if (this.request_image_page.stop()) {
					this.request_image_page.delay(GalleryDownloader.DELAY_ABORT);
				}
				if (this.request_image.stop()) {
					this.request_image.delay(GalleryDownloader.DELAY_ABORT);
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

			get_use_full_images: function () {
				return this.use_full_images;
			},
			set_use_full_images: function (use_full) {
				this.use_full_images = use_full;
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

			on: function (event, callback) {
				if (event in this.events) {
					this.events[event].push(callback);
					return true;
				}
				return false;
			},
			off: function (event, callback) {
				if (event in this.events) {
					for (var i = 0, list = this.events[event]; i < list.length; ++i) {
						if (list[i] === callback) {
							list.splice(i, 1);
							return true;
						}
					}
				}
				return false;
			},

		};



		return GalleryDownloader;

	})();

	// Gallery downloader (GUI/manager)
	var GalleryDownloadManager = (function () {

		var GalleryDownloadManager = function (gallery, container) {
			// Vars
			var n0;

			// Create
			this.loader = new GalleryDownloader(gallery);
			this.zip = new ZipCreator();
			this.zip_blob = null;
			this.zip_blob_url = null;

			// Values
			this.filename_mode = constants.MAIN_NAME_FULL;
			this.filename_ext_mode = constants.FILE_EXTENSION_ZIP;
			this.image_naming_mode = constants.IMAGE_NAMING_SINGLE_NUMBER;

			this.zip_info_json_name = "info.json";
			this.zip_info_json_mode = constants.JSON_READABLE_2SPACE;

			// Nodes
			this.node_main_link = null;

			this.node_info_status = null;
			this.node_info_count = null;
			this.node_info_error = null;

			this.node_opts_filename_mode = null;
			this.node_opts_filename_ext_mode = null;
			this.node_opts_image_naming_mode = null;
			this.node_opts_zip_info_json_mode = null;

			this.node_progress_gallery = null;
			this.node_progress_gallery_text = null;
			this.node_progress_image_pages = null;
			this.node_progress_image_pages_text = null;
			this.node_progress_images = null;
			this.node_progress_images_text = null;
			this.node_progress_image_size = null;
			this.node_progress_image_size_text = null;

			this.node_zip_info_json_name = null;

			this.node_full_image_checkbox = null;

			this.node_failure_timeout = null;
			this.node_failure_retry_max = null;

			// Create nodes
			n0 = $("div", "eze_gallery_custom_container_inner", [ //{
				$("div", "eze_dl_title", [
					this.node_main_link = $("a", "eze_dl_link", null, "Begin downloading"),
				]),
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
				$("div", "eze_dl_title eze_dl_title_pad_above", "Download settings"),
				$("div", [
					$("div", "eze_dl_setting", [
						$("div", "eze_dl_setting_row", [
							$("div", "eze_dl_setting_cell", [
								$("div", "eze_dl_setting_title", "Output filename"),
								$("div", "eze_dl_setting_desc", "Set the primary output .zip file's name"),
							]),
							$("div", "eze_dl_setting_cell", [
								this.node_opts_filename_mode = create_option_box([
									[ "Full gallery name", constants.MAIN_NAME_FULL ],
									[ "Short gallery name", constants.MAIN_NAME_SHORT ],
								], this.filename_mode, bind(on_option_filename_change, this)),
								this.node_opts_filename_ext_mode = create_option_box([
									[ ".zip", constants.FILE_EXTENSION_ZIP ],
									[ ".cbz", constants.FILE_EXTENSION_CBZ ],
								], this.filename_ext_mode, bind(on_option_filename_ext_change, this)),
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
								this.node_opts_image_naming_mode = create_option_box([
									[ "Single number", constants.IMAGE_NAMING_SINGLE_NUMBER ],
									[ "Full gallery name + number", constants.IMAGE_NAMING_FULL_NAME ],
									[ "Short gallery name + number", constants.IMAGE_NAMING_SHORT_NAME ],
									[ "Original filenames", constants.IMAGE_NAMING_ORIGINAL_NAME ],
								], this.image_naming_mode, bind(on_option_image_name_change, this)),
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
									this.node_opts_zip_info_json_mode = create_option_box([
										[ "Omit", constants.JSON_OMIT ],
										[ "Compressed", constants.JSON_COMPRESSED ],
										[ "Human readable (2 space indent)", constants.JSON_READABLE_2SPACE ],
										[ "Human readable (4 space indent)", constants.JSON_READABLE_4SPACE ],
										[ "Human readable (tab indent)", constants.JSON_READABLE_TABS ],
									], this.zip_info_json_mode, bind(on_option_zip_info_json_mode_change, this)),
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
									$("span", null, "Download full sized images if available"),
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
			this.node_failure_timeout.value = this.loader.get_request_timeout();
			this.node_failure_retry_max.value = this.loader.get_image_max_retry_count();
			this.node_full_image_checkbox.checked = this.loader.get_use_full_images();
			this.node_zip_info_json_name.value = this.zip_info_json_name;

			// Setup events
			this.node_main_link.addEventListener("click", bind(on_main_link_click, this));
			this.node_full_image_checkbox.addEventListener("change", bind(on_option_full_images_change, this));
			this.node_failure_timeout.addEventListener("change", bind(on_option_failure_timeout_change, this));
			this.node_failure_retry_max.addEventListener("change", bind(on_option_failure_retry_max_change, this));
			this.node_zip_info_json_name.addEventListener("change", bind(on_option_zip_info_json_name_change, this));

			this.loader.on("error", bind(on_loader_error, this));
			this.loader.on("active_change", bind(on_loader_active_change, this));
			this.loader.on("state_change", bind(on_loader_state_change, this));
			this.loader.on("gallery_page_get", bind(on_loader_gallery_page_get, this));
			this.loader.on("image_page_get", bind(on_loader_image_page_get, this));
			this.loader.on("image_get", bind(on_loader_image_get, this));
			this.loader.on("image_progress", bind(on_loader_image_progress, this));

			// Load settings
			load_values.call(this);

			// Update text
			update_main_link_text.call(this);
			update_info_status_text.call(this);
			update_progress_bars.call(this);

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
				zip_info_json_name: this.zip_info_json_name,
				zip_info_json_mode: this.zip_info_json_mode,
				use_full_images: this.loader.get_use_full_images(),
				request_timeout: this.loader.get_request_timeout(),
				image_max_retry_count: this.loader.get_image_max_retry_count(),
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
						set_option_box_value(self.node_opts_filename_mode, self.filename_mode);
					}
					if (validate(value.filename_ext_mode, [ constants.FILE_EXTENSION_ZIP , constants.FILE_EXTENSION_CBZ ])) {
						self.filename_ext_mode = value.filename_ext_mode;
						set_option_box_value(self.node_opts_filename_ext_mode, self.filename_ext_mode);
					}
					if (validate(value.image_naming_mode, [ constants.IMAGE_NAMING_SINGLE_NUMBER , constants.IMAGE_NAMING_FULL_NAME , constants.IMAGE_NAMING_SHORT_NAME , constants.IMAGE_NAMING_ORIGINAL_NAME ])) {
						self.image_naming_mode = value.image_naming_mode;
						set_option_box_value(self.node_opts_image_naming_mode, self.image_naming_mode);
					}
					if (validate(value.zip_info_json_mode, [ constants.JSON_OMIT , constants.JSON_COMPRESSED , constants.JSON_READABLE_2SPACE , constants.JSON_READABLE_4SPACE , constants.JSON_READABLE_TABS ])) {
						self.zip_info_json_mode = value.zip_info_json_mode;
						set_option_box_value(self.node_opts_zip_info_json_mode, self.zip_info_json_mode);
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
					if ("request_timeout" in value) {
						self.loader.set_request_timeout(value.request_timeout);
						self.node_failure_timeout.value = self.loader.get_request_timeout();
					}
					if ("image_max_retry_count" in value) {
						self.loader.set_image_max_retry_count(value.image_max_retry_count);
						self.node_failure_retry_max.value = self.loader.get_image_max_retry_count();
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
				this.node_main_link.text = "Click to download file";
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
				num, dem;


			// Progress calculations
			if (state != GalleryDownloader.NOT_STARTED) {
				if (state == GalleryDownloader.REQUESTING_IMAGES) {
					// Image progress
					num = this.loader.get_image_total_bytes_loaded() + this.loader.get_current_image_bytes_loaded();
					dem = Math.max(num, this.loader.get_image_total_bytes());

					bytes_p = num / dem;

					bytes_t = "" + bytes_to_labeled_string(num) + " / " + bytes_to_labeled_string(dem);
					bytes_t += " (" + fraction_to_percent(bytes_p, 0) + ")";
				}
				else if (state == GalleryDownloader.COMPLETED) {
					bytes_p = 1.0;
					bytes_t = "done";
				}
			}


			// Node updates
			this.node_progress_image_size.style.width = fraction_to_percent(bytes_p, 2);
			this.node_progress_image_size_text.nodeValue = bytes_t;
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

		var create_option_box = function (options, selected_value, callback) {
			var sel = null,
				n0, n1, i;

			n0 = $("div", "eze_dl_option_box");

			for (i = 0; i < options.length; ++i) {
				n1 = $("div", "eze_dl_option_box_entry", options[i][0], {
					"data-eze-option-id": i,
					"data-eze-value": JSON.stringify(options[i][1]),
				}, $.P, n0);

				if (sel === null || options[i][1] == selected_value) sel = n1;
			}

			if (sel !== null) {
				sel.classList.add("eze_dl_option_box_entry_selected");
			}

			n0.addEventListener("click", bind(on_option_box_click, n0, callback), false);

			return n0;
		};
		var set_option_box_value = function (option_box, target_value) {
			var opts = option_box.querySelectorAll(".eze_dl_option_box_entry"),
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
				opts = option_box.querySelectorAll(".eze_dl_option_box_entry_selected");
				for (i = 0; i < opts.length; ++i) {
					opts[i].classList.remove("eze_dl_option_box_entry_selected");
				}

				// Select
				sel.classList.add("eze_dl_option_box_entry_selected");
			}
		};

		var update_final_filename = function () {
			if (this.zip_blob_url !== null) {
				// Get name
				var base_name;
				if (this.filename_mode == constants.MAIN_NAME_FULL) {
					base_name = filename_normalize.call(this, this.loader.gal_info.title);
				}
				else { // if (this.filename_mode == constants.MAIN_NAME_SHORT) {
					base_name = filename_normalize.call(this, this.loader.gal_title_info.title);
				}

				if (this.filename_ext_mode == constants.FILE_EXTENSION_ZIP) {
					base_name += ".zip";
				}
				else { // if (this.filename_ext_mode == constants.FILE_EXTENSION_CBZ) {
					base_name += ".cbz";
				}

				// Apply to link
				this.node_main_link.setAttribute("download", base_name);
			}
		};
		var set_image_naming_mode = function (mode) {
			// No change
			if (this.image_naming_mode == mode) return;

			// Update
			this.image_naming_mode = mode;

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
			if (this.zip_blob !== null) {
				create_zip.call(this);
			}
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
				ext = filename_get_ext(image_data.image_url).toLowerCase();

			if (ext.length === 0) ext = filename_get_ext(image_data.info.image.filename).toLowerCase();
			ext = valid_extensions[ext in valid_extensions ? ext : ""];

			// New name
			if (this.image_naming_mode == constants.IMAGE_NAMING_ORIGINAL_NAME) {
				// Set filename
				base_name += filename_normalize(filename_remove_ext(image_data.info.image.filename));
				base_name += ext;
			}
			else {
				// Append number
				var number = "" + (index + 1);
				while (number.length < digit_count) number = "0" + number;

				base_name += number;
				base_name += ext;
			}

			// Update
			return base_name;
		};
		var create_zip = function () {
			// Revoke
			if (this.zip_blob_url !== null) {
				window.URL.revokeObjectURL(this.zip_blob_url);
			}

			// Create
			this.zip_blob = this.zip.to_blob();
			this.zip_blob_url = window.URL.createObjectURL(this.zip_blob);

			// Apply link
			this.node_main_link.setAttribute("href", this.zip_blob_url);
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
			if (this.zip_blob !== null) {
				create_zip.call(this);
			}
		};

		var on_option_box_click = function (callback, event) {
			// Skip
			if (event.which != 1) return;

			var sel = this.querySelector(".eze_dl_option_box_entry_selected"),
				val;

			// Deselect
			if (sel !== null) {
				sel.classList.remove("eze_dl_option_box_entry_selected");

				sel = sel.nextSibling;
				if (sel === null) sel = this.firstChild;
			}
			else {
				sel = this.firstChild;
			}

			if (sel !== null) {
				// Select new
				sel.classList.add("eze_dl_option_box_entry_selected");

				// Value
				try {
					val = JSON.parse(sel.getAttribute("data-eze-value") || "");
				}
				catch (e) {
					val = null;
				}
				if (callback) callback.call(null, val, sel);
			}

			// Stop
			event.preventDefault();
			event.stopPropagation();
			return false;
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
			set_image_naming_mode.call(this, value);

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

		var on_main_link_click = function (event) {
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
				update_byte_progress_bar.call(this);
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

				// Update
				update_final_filename.call(this);
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

			// Hide error
			this.node_info_error.classList.remove("eze_dl_info_visible");
		};



		return GalleryDownloadManager;

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
			vars.dl_bar_bg1 = CSS.color("#0088ff");
			vars.dl_bar_bg2 = CSS.color("#00a020");
			vars.dl_bar_bg3 = CSS.color("#a07000");
			vars.dl_bar_bg4 = CSS.color("#c00000");
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
			vars.dl_bar_bg1 = CSS.color("#88ccff");
			vars.dl_bar_bg2 = CSS.color("#88ffaa");
			vars.dl_bar_bg3 = CSS.color("#ffc0aa");
			vars.dl_bar_bg4 = CSS.color("#ffaaaa");
		}

		// Create css
		css = CSS.format(
			[ //{
			".id1>.id2{overflow:visible;position:relative;}",
			".id1:hover>.id2{z-index:1;}",
			".id1:hover>.id2>a{text-shadow:0px 0px 1px {{color:gallery_item_hl}},0px 0px 1px {{color:gallery_item_hl}},0px 0px 1px {{color:gallery_item_hl}},0px 0px 1px {{color:gallery_item_hl}};background:{{color:bg,0.75}};display:inline-block;padding-bottom:0.5em;}",

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
			".eze_dl_info_container{margin-left:-0.5em;}",
			".eze_dl_info{display:inline-block;margin-left:0.5em;border:1px solid {{color:border}};background-color:{{color:bg}};border-bottom:none;padding:0.25em;}",
			".eze_dl_info.eze_dl_info_error{color:#f00000;}",
			".eze_dl_info:not(.eze_dl_info_visible){display:none;}",
			".eze_dl_progress_bar{position:relative;width:100%;box-sizing:border-box;-moz-box-sizing:border-box;border:1px solid {{color:border}};background-color:{{color:bg_dark}};}",
			".eze_dl_progress_bar+.eze_dl_progress_bar{border-top:none;}",
			".eze_dl_progress_bar_bg{position:absolute;left:0;top:0;bottom:0;background-color:{{color:dl_bar_bg1}};}",
			".eze_dl_progress_bar.eze_dl_progress_bar_image_pages>.eze_dl_progress_bar_bg{background-color:{{color:dl_bar_bg2}};}",
			".eze_dl_progress_bar.eze_dl_progress_bar_images>.eze_dl_progress_bar_bg{background-color:{{color:dl_bar_bg3}};}",
			".eze_dl_progress_bar.eze_dl_progress_bar_image_size>.eze_dl_progress_bar_bg{background-color:{{color:dl_bar_bg4}};}",
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
			".eze_dl_setting_input{border:1px solid {{color:border}};background-color:{{color:bg_dark}};color:{{color:text}};padding:0.125em;line-height:1.25em;width:10em;font-family:inherit;}",
			".eze_dl_setting_input.eze_dl_setting_input_small{width:4em;}",
			".eze_dl_option_box{display:inline-block;border:1px solid {{color:border}};background-color:{{color:bg_dark}};line-height:1.5em;padding:0 0.25em;height:1.5em;overflow:hidden;text-align:center;cursor:pointer;}",
			".eze_dl_option_box+.eze_dl_option_box{margin-left:0.5em;}",
			".eze_dl_option_box_entry{display:block;height:1.5em;}",
			".eze_dl_option_box_entry:not(.eze_dl_option_box_entry_selected){height:0;overflow:hidden;visibility:hidden;}",
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

		var create_custom_search_links = function (gal_info) {
			var title_info = API.get_gallery_title_info(gal_info.title),
				link1, link2, n1, n2;

			// Search exhentai by title
			link1 = "/?f_doujinshi=1&f_manga=1&f_artistcg=1&f_gamecg=1&f_western=1&f_non-h=1&f_imageset=1&f_cosplay=1&f_asianporn=1&f_misc=1&f_search=\"" + encodeURIComponent(title_info.title.replace(/,/g, " ")) + "\"";
			link2 = "/?f_doujinshi=1&f_manga=1&f_artistcg=1&f_gamecg=1&f_western=1&f_non-h=1&f_imageset=1&f_cosplay=1&f_asianporn=1&f_misc=1&f_search=\"" + encodeURIComponent(gal_info.title.replace(/,/g, " ")) + "\"";
			n1 = $("a", "eze_gallery_link", "Search by gallery name", { href: link1, target: "_blank" },
				$.ON, [ "click", on_search_link_click, false, [ $.node, link1, link2 ] ]
			);

			// Search nhentai by title
			link1 = "//nhentai.net/search/?q=\"" + encodeURIComponent(title_info.title) + "\"";
			link2 = "//nhentai.net/search/?q=\"" + encodeURIComponent(gal_info.title) + "\"";
			n2 = $("a", "eze_gallery_link", "Search on nhentai.net", { href: link1, target: "_blank" },
				$.ON, [ "click", on_search_link_click, false, [ $.node, link1, link2 ] ]
			);

			// Done
			return [ n1 , n2 ];
		};



		var on_search_link_click = function (link1, link2, event) {
			// Skip
			if (event.which != 1) return;

			// Create menu
			var menu = new Menu(),
				opt;

			opt = menu.add_option("Search by name");
			opt.setAttribute("href", link1);
			opt.setAttribute("target", "_blank");

			opt = menu.add_option("Search by exact name");
			opt.setAttribute("href", link2);
			opt.setAttribute("target", "_blank");

			menu.on("select", function (event) {
				// Follow link
				window.location.href = event.option.getAttribute("href");
				event.menu.close();
			});

			menu.show(this, Menu.BELOW | Menu.LEFT | Menu.CENTER | Menu.VERTICAL);

			// Stop
			event.preventDefault();
			event.stopPropagation();
			event = null;
			opt = null;
			return false;
		};



		return create_custom_search_links;

	})();

	var setup_modifyied_titles = function () {
		var re_pattern = /\b(exhentai|e-hentai)/i,
			nodes, i;

		nodes = document.querySelectorAll("title");
		for (i = 0; i < nodes.length; ++i) {
			nodes[i].textContent = nodes[i].textContent.trim().replace(re_pattern, "Ez+$1");
		}
	};

	var setup_search = (function () {

		var setup_search = function () {
			var re_pattern = /\b(exhentai|e-hentai)/i,
				h_nav = new Hash(),
				nodes, i, n1, n2;

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

			// Setup
			h_nav.on_change(on_hash_change);
			h_nav.init();
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

		return setup_search;

	})();

	var setup_gallery = (function () {

		var setup_gallery = function () {
			var gal_info = API.get_gallery_info_from_html(document.documentElement);

			fix_tags();
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
				thumb_loader, n0, n1, n2, n3, n4;

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
							$("div", "eze_gallery_custom_cell", [
								$("p", [ search_links[0] ]),
								$("p", [ search_links[1] ]),
							]),
						]),
					]),
				]),
				n4 = $("div", "eze_dl_container"),
			]);

			// Thumbnail loader
			n2.checked = false;
			thumb_loader = new ThumbnailLoader(gal_info.gallery.gid, gal_info.gallery.token, page_info, n2, n1);
			n2.addEventListener("change", bind(on_load_all_thumbnails_change, n2, thumb_loader), false);

			// Download link
			n3.addEventListener("click", bind(on_download_gallery_click, n3, {
				gallery: {
					gid: gal_info.gallery.gid,
					token: gal_info.gallery.token,
				},
				loader: null,
				container: n4,
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
		var on_load_all_thumbnails_change = function (thumb_loader) {
			if (this.checked) {
				thumb_loader.resume();
			}
			else {
				thumb_loader.pause();
			}

			thumb_loader.update_checkbox();
		};
		var on_download_gallery_click = function (data, event) {
			// Skip
			if (event.which != 1) return;

			if (data.loader === null) {
				// Create loader
				data.loader = new GalleryDownloadManager(data.gallery, data.container);
				delete data.gallery;
				delete data.container;
			}

			// Stop
			event.preventDefault();
			event.stopPropagation();
			return false;
		};

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
			this.index = this.start + 1;
			this.checkbox = checkbox;
			this.status_node = status_node;

			this.delay = 1.0;

			this.request = null;
			this.timeout = null;

			this.container = $("div", "eze_gallery_page_container");

			if (this.index >= this.count) {
				this.index = this.start - 1;
				if (this.index < 0) {
					this.index = 0;
				}
			}

			// Setup pages
			for (var i = 0; i < this.count; ++i) {
				this.pages.push(null);
			}

			// Start node
			var n = document.querySelector("#gdt");
			if (n !== null) {
				// Set page
				this.stylize_page(n, this.start);
				this.pages[this.start] = n;

				// Container
				n.parentNode.insertBefore(this.container, n);
				this.container.appendChild(n);
			}

			// Update
			this.update_checkbox();
			this.update_status();
		};
		ThumbnailLoader.prototype = {
			constructor: ThumbnailLoader,

			resume: function () {
				// Done
				if (this.completed >= this.count || this.request !== null || this.timeout !== null) return;

				// Start
				this.begin_request();
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

			update_checkbox: function () {
				this.checkbox.checked = (this.completed >= this.count || this.request !== null || this.timeout !== null);
			},
			update_status: function () {
				this.status_node.textContent = "(" + this.completed + "/" + this.count + ")";
			},

			begin_request: function () {
				this.request = API.request_document(
					"/g/" + this.gallery.gid + "/" + this.gallery.token + "?p=" + this.index,
					bind(this.on_response_load, this),
					bind(this.on_response_error, this)
				);
			},
			on_response_load: function (response, status) {
				// Clear
				this.request = null;
				if (status == 200) {
					// Okay
					if (this.process_response(response)) {
						// Next
						this.next();
						return;
					}
				}

				// Stop
				this.update_checkbox();
			},
			on_response_error: function () {
				// Stop
				this.request = null;
				this.update_checkbox();
			},
			process_response: function (html) {
				// Find node
				var n = html.querySelector("#gdt"),
					rel;

				if (n !== null) {
					// Set
					this.stylize_page(n, this.index);
					this.pages[this.index] = n;

					// Add
					if (this.index >= this.start) {
						this.container.appendChild(n);
					}
					else {
						rel = this.container.firstChild;
						if (rel === null) {
							this.container.appendChild(n);
						}
						else {
							this.container.insertBefore(n, rel);
						}
					}

					// Okay
					return true;
				}

				// Error
				return false;
			},

			next: function () {
				// Change index
				++this.completed;
				this.update_status();

				if (this.index >= this.start) {
					++this.index;
					if (this.index >= this.count) {
						this.index = this.start - 1;
					}
				}
				else {
					--this.index;
				}

				// Done
				if (this.index < 0) {
					this.index = 0;
					this.update_checkbox();
					return;
				}

				// Timeout
				var self = this;
				this.timeout = setTimeout(function () {
					self.begin_request();
				}, this.delay * 1000);
			},

			stylize_page: function (node, index) {
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
			},

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
				n0, n1, i, k;

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
												$("p", [ search_links[0] ]),
												$("p", [ search_links[1] ]),
												$("p", [
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
			new LoginGUI();
		};



		// Forum iframe checking/setup function
		setup_panda.iframe_setup = null;

		var setup_panda_forum_origin = null;
		var setup_panda_forum_auto_run = false;
		if (window.location.hostname == "forums.e-hentai.org" && eze_hash[0] == "eze") {
			// Remove eze url
			setup_panda_forum_origin = (eze_hash[1] ? eze_hash[1].origin : "") || "";
			setup_panda_forum_auto_run = (eze_hash[1] ? eze_hash[1].auto == "true" : false);
			window.history.replaceState(null, "", window.location.pathname + window.location.search);

			// Setup function
			setup_panda.iframe_setup = function () {
				// Setup
				var auto_hash = HashReader.encode_hash("eze", [
					[ "origin", setup_panda_forum_origin ],
					[ "auto", "true" ],
				]);

				IframeController = IframeController();
				new IframeController(setup_panda_forum_origin, setup_panda_forum_auto_run, auto_hash);
			};
		}



		var MutationObserver = (window.MutationObserver || window.WebKitMutationObserver);



		var LoginGUI = function () {
			var self = this;

			// Vars
			this.form = null;
			this.input_name = null;
			this.input_pass = null;
			this.status_text = null;

			this.iframe_container = null;
			this.iframe = null;
			this.iframe_target = "https://forums.e-hentai.org";
			this.iframe_loaded = false;
			this.iframe_state = LoginGUI.STATE_INACTIVE;

			// Setup
			this.set_doctype();
			this.setup_document();
			this.setup_title();
			this.setup_stylesheet();
			this.setup_dom();

			// Select
			setTimeout(function () {
				self.input_name.select();
			}, 10);

			// Events
			window.addEventListener("message", function (event) {
				if (event.origin == self.iframe_target) {
					self.process_message(JSON.parse(event.data));
				}
			}, false);
		};
		LoginGUI.STATE_INACTIVE = 0;
		LoginGUI.STATE_ACTIVE = 1;
		LoginGUI.STATE_LOGGED_IN = 2;
		LoginGUI.prototype = {
			constructor: LoginGUI,

			set_doctype: function () {
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
			},
			setup_document: function () {
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
			},
			setup_title: function () {
				var doc_el = document.documentElement,
					title = $("title"),
					head = doc_el.querySelector("head"),
					self = this,
					i, n;

				// Remove titles
				n = document.querySelectorAll("title");
				for (i = 0; i < n.length; ++i) {
					n[i].parentNode.removeChild(n[i]);
				}

				// Add title
				head.appendChild(title);

				// Update title
				this.update_title(title);

				// Observe
				if (MutationObserver) {
					new MutationObserver(function () {
						self.update_title(title);
					})
					.observe(title, { childList: true });
				}
			},
			update_title: function (title) {
				var text = title.textContent,
					text_target = "ExHentai Login";

				// Update title
				if (text != text_target) {
					title.textContent = text_target;
				}
			},
			setup_stylesheet: function () {
				// Styling
				var vars = {
					border: CSS.color("#000000"),
					bg: CSS.color("#43464E"),
					bg_dark: CSS.color("#34353B"),
					bg_light: CSS.color("#4f535b"),
					text: CSS.color("#F1F1F1"),
					text_link: CSS.color("#DDDDDD"),
					text_link_hover: CSS.color("#FFFBDB"),
					text_error: CSS.color("#ff8080"),
					text_success: CSS.color("#80ff80"),
				};

				// Create css
				var css = CSS.format(
					[ //{
					"body{font-size:10pt;font-family:arial,helvetica,sans-serif;color:{{color:text}};background:{{color:bg_dark}};padding:0;margin:0;}",
					"a{color:{{color:text_link}};}",
					"a:hover{color:{{color:text_link_hover}};}",
					"form{margin:0;padding:0;}",

					".eze_main_container{position:absolute;left:0;top:0;bottom:0;right:0;white-space:nowrap;line-height:0;text-align:center;}",
					".eze_main_container:before{content:\"\";display:inline-block;width:0;height:100%;vertical-align:middle;}",
					".eze_main{display:inline-block;vertical-align:top;white-space:normal;line-height:normal;text-align:left;margin:2em 0;}",
					".eze_main.eze_main_middle{vertical-align:middle;}",
					".eze_main_box{border:1px solid {{color:border}};background-color:{{color:bg}};padding:1em;box-sizing:border-box;-moz-box-sizing:border-box;}",

					".eze_input_line{display:block;text-align:center;width:20em;box-sizing:border-box;-moz-box-sizing:border-box;}",
					".eze_input_line:not(.eze_input_line_label)+.eze_input_line{margin-top:0.5em;}",
					".eze_input_line_label{text-align:left;}",
					".eze_input_line_label_text{font-size:1.5em;font-weight:bold;}",
					".eze_input{display:inline-block;vertical-align:middle;border:1px solid {{color:border}};background-color:{{color:bg_light}};color:{{color:text}};padding:0.25em;box-sizing:border-box;-moz-box-sizing:border-box;width:100%;font-size:2em;}",
					".eze_input_button{display:inline-block;vertical-align:middle;border:1px solid {{color:border}};background-color:{{color:bg_light}};color:{{color:text}};padding:0.25em;box-sizing:border-box;-moz-box-sizing:border-box;width:100%;font-size:1.5em;}",
					"input{outline:none;}",

					".eze_input_line.eze_status_line{text-align:left;overflow:hidden;}",
					".eze_status{font-size:1.25em;line-height:1.25em;height:1.25em;display:inline-block;white-space:nowrap;}",
					".eze_status.eze_status_error{color:{{color:text_error}};}",
					".eze_status.eze_status_success{color:{{color:text_success}};}",

					".eze_login_iframe{width:0;height:0;visibility:hidden;opacity:0;margin:0;padding:0;border:none;}",
					].join(""), //}
					vars
				);

				// Insert
				API.inject_style(css);
			},
			setup_dom: function () {
				var doc_el = document.documentElement,
					body = document.body,
					image = doc_el.querySelector("img"),
					loc = window.location.href,
					n0, image_new;

				// Find image url
				if (image !== null) {
					loc = image.getAttribute("src");
				}
				image_new = $("img", {
					src: loc,
					alt: "",
				});

				// Create DOM
				n0 = $("div", "eze_main_container", [ //{
					$("div", "eze_main eze_main_middle", [
						this.form = $("form", "eze_main_box", [
							$("div", "eze_input_line", [
								image_new,
							]),
							$("div", "eze_input_line eze_input_line_label", [
								$("span", "eze_input_line_label_text", "Username"),
							]),
							$("div", "eze_input_line", [
								this.input_name = $("input", "eze_input", {
									type: "text",
									maxlength: 32,
								}),
							]),
							$("div", "eze_input_line eze_input_line_label", [
								$("span", "eze_input_line_label_text", "Password"),
							]),
							$("div", "eze_input_line", [
								this.input_pass = $("input", "eze_input", {
									type: "password",
									maxlength: 32,
								}),
							]),
							$("div", "eze_input_line", [
								$("input", "eze_input_button", {
									type: "submit",
									value: "Log in",
								}),
							]),
							$("div", "eze_input_line eze_status_line", [
								this.status_text = $("span", "eze_status"),
							]),
							this.iframe_container = $("div"),
						], $.ON, [ "submit", this.on_form_submit, false, [ this ] ]),
					]),
				]); //}

				// Replace
				body.innerHTML = "";
				body.appendChild(n0);
			},

			on_form_submit: function (event) {
				if (this.iframe_state == LoginGUI.STATE_INACTIVE) {
					// Now active
					this.iframe_state = LoginGUI.STATE_ACTIVE;

					// Create iframe
					if (this.iframe === null) {
						this.iframe = $("iframe", "eze_login_iframe", {
							src: this.iframe_target + "/" + HashReader.encode_hash("eze", { origin: (window.location.protocol + "//" + window.location.host) }),
						}, $.ON, [ "load", this.on_iframe_load, false, [ this ] ], $.P, this.iframe_container);

						this.set_status("Loading login form...", false);
					}

					// Check if ready and execute code
					this.on_iframe_ready();
				}

				// Stop
				event.preventDefault();
				event.stopPropagation();
				return false;
			},
			on_iframe_load: function () {
				// Iframe has loaded
				if (!this.iframe_loaded) {
					this.iframe_loaded = true;
					this.on_iframe_ready();
				}
			},
			on_iframe_ready: function () {
				if (!this.iframe_loaded) return;

				// Update button
				this.set_status("Requesting login...", false);

				this.iframe.contentWindow.postMessage(JSON.stringify({
					method: "eze_request_login",
					name: this.input_name.value,
					pass: this.input_pass.value,
				}), this.iframe_target);
			},

			set_status: function (message, is_error, is_success) {
				this.status_text.textContent = message;

				if (is_error) {
					this.status_text.classList.add("eze_status_error");
					this.iframe_state = LoginGUI.STATE_INACTIVE;
				}
				else {
					this.status_text.classList.remove("eze_status_error");
				}

				if (is_success) {
					this.status_text.classList.add("eze_status_success");
					this.iframe_state = LoginGUI.STATE_LOGGED_IN;
				}
				else {
					this.status_text.classList.remove("eze_status_success");
				}
			},

			process_message: function (msg) {
				if (msg.method == "eze_request_login_ack") {
					// Now processing
					this.set_status("Processing login...", false);
				}
				else if (msg.method == "eze_login_failed") {
					// Error
					this.set_status(msg.reason, true);
				}
				else if (msg.method == "eze_login_success") {
					// Okay
					this.set_status("Waiting for cookie...", false);
				}
				else if (msg.method == "eze_login_cookie") {
					// Okay
					if (this.process_cookie(msg.cookie)) {
						this.set_status(msg.redundant ? "Already logged in - " : "Logged in - ", false, true);
						this.complete_login();
					}
					else {
						this.set_status("Login cookie not found", true);
					}
				}
			},
			process_cookie: function (cookie_str) {
				var cookies = Cookies.get_all(cookie_str),
					ipb_member_id = cookies.ipb_member_id,
					ipb_pass_hash = cookies.ipb_pass_hash,
					d;

				if (ipb_member_id && ipb_pass_hash) {
					// Create date
					d = new Date();
					d = new Date(d.getFullYear() + 1, d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());

					// Remove this
					Cookies.remove("yay", "/", ".exhentai.org");

					// Set new
					Cookies.set("ipb_member_id", ipb_member_id, d, "/", ".exhentai.org");
					Cookies.set("ipb_pass_hash", ipb_pass_hash, d, "/", ".exhentai.org");

					// Okay
					return true;
				}

				// Error
				return false;
			},

			complete_login: function () {
				// Remove iframe
				if (this.iframe.parentNode !== null) {
					this.iframe.parentNode.removeChild(this.iframe);
				}

				// Refresh link
				this.status_text.appendChild($("a", { href: "." }, "Reload page"));

				// Reload now
				window.location.reload();
			},
		};



		var IframeController = function () {

			var IframeController = function (origin, auto_run, auto_hash) {
				this.origin = origin;
				this.parent_window = null;
				this.auto_hash = auto_hash;

				// Get parent window
				try {
					this.parent_window = parent;
				}
				catch (e) {}

				if (this.parent_window !== null) {
					// Run
					if (auto_run) {
						this.auto_send_cookie();
					}
					else {
						// Message listening
						var self = this;
						window.addEventListener("message", function (event) {
							if (event.origin == self.origin) {
								self.process_message(JSON.parse(event.data));
							}
						}, false);
					}
				}
			};



			IframeController.prototype = {
				constructor: IframeController,

				send_message: function (data) {
					// Respond
					this.parent_window.postMessage(JSON.stringify(data), this.origin);
				},

				process_message: function (msg) {
					if (msg.method == "eze_request_login") {
						// Respond
						this.send_message({
							method: "eze_request_login_ack",
						});

						// Create form
						var inputs = {
							"CookieDate": "1",
							"Privacy": "1",
							"b": "",
							"bt": "",
							"UserName": msg.name,
							"PassWord": msg.pass,
							"act": "Login",
							"CODE": "01",
						};

						var input_str = "",
							self = this,
							i;
						for (i in inputs) {
							if (input_str.length > 0) input_str += "&";
							input_str += encodeURIComponent(i) + "=" + encodeURIComponent("" + inputs[i]);
						}

						// Create XHR
						var xhr = new XMLHttpRequest();
						xhr.open("POST", "/index.php?act=Login&CODE=01", true);
						xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
						xhr.responseType = "document";

						xhr.addEventListener("load", function () {
							if (xhr.status == 200) {
								// Process
								self.process_response(xhr.response);
							}
							else {
								// Status error
								self.send_message({
									method: "eze_login_failed",
									reason: "Status: " + xhr.status + " - " + xhr.statusText,
								});
							}
						}, false);
						xhr.addEventListener("error", function () {
							// XHR error
							self.send_message({
								method: "eze_login_failed",
								reason: "Error",
							});
						}, false);

						// Send
						xhr.send(input_str);
					}
				},

				process_response: function (html) {
					var n;
					if ((n = html.querySelector("#userlinks>.home")) !== null) {
						// Okay
						this.send_message({
							method: "eze_login_cookie",
							cookie: document.cookie,
							redundant: true,
						});
					}
					else if ((n = html.querySelector("#redirectwrap")) !== null) {
						// Okay
						this.send_message({
							method: "eze_login_success",
						});

						// Refresh window
						this.refresh_window();
					}
					else if ((n = html.querySelector(".errorwrap>p")) !== null) {
						// Login error
						this.send_message({
							method: "eze_login_failed",
							reason: n.textContent,
						});
					}
				},

				refresh_window: function () {
					// Update hash
					window.location.hash = this.auto_hash;

					// Reload
					window.location.reload();
				},

				auto_send_cookie: function () {
					// Okay
					this.send_message({
						method: "eze_login_cookie",
						cookie: document.cookie,
						redundant: false,
					});
				},

			};



			return IframeController;

		};



		return setup_panda;

	})();



	// Init
	API.block_redirections();
	on_ready(function () {
		// Forums
		if (setup_panda.iframe_setup !== null) {
			// Login support
			setup_panda.iframe_setup();
			return;
		}

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
			setup_modifyied_titles();

			if (page_type == "search" || page_type == "favorites") {
				setup_search();
			}
			else if (page_type == "gallery") {
				setup_gallery();
			}
			else if (page_type == "gallery_deleted") {
				setup_gallery_deleted();
			}
		}
	});

})();


