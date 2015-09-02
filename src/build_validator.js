(function () {
	"use strict";

	var fs = require("fs");

	var main = function () {
		// Input check
		if (process.argv.length <= 2) {
			process.stderr.write("No input files detected\n");
			return -1;
		}

		var i, src, filename;
		for (i = 2; i < process.argv.length; ++i) {
			// Read file
			filename = process.argv[i];
			try {
				src = fs.readFileSync(filename, { encoding: "utf-8", flag: "r" });
			}
			catch (e) {
				process.stderr.write("Exception reading file \"" + filename + "\":\n" + e + "\n");
				return -2;
			}

			// Bad type (?)
			if (typeof(src) !== "string") {
				process.stderr.write("File \"" + filename + "\" read did not return a string\n");
				return -3;
			}

			// Wrap
			src = '"use strict";(function(){' + src + '});';

			// Eval
			try {
				eval(src);
			}
			catch (e) {
				process.stderr.write("Exception while executing \"" + filename + "\":\n" + e + "\n");
				return -4;
			}
		}

		// Okay
		return 0;
	};

	if (require.main === module) process.exit(main() || 0);

})();

