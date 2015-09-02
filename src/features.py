import os, re, sys;
from all_in_one import Parser;

input = os.path.abspath(sys.argv[1]);
output = os.path.abspath(sys.argv[2]);

if (input == output):
	sys.stderr.write("Input and output are the same");
	sys.exit(-1);



# Read
f = open(input, "rb");
s = f.read();
f.close();


# Features
features = sys.argv[2:];
feature_stack = [];
removed_features = {};
kept_features = {};


# Process
re_feature = re.compile(r"/\*<(/)?feature:([^>]*)>\*/");
p = Parser(s);
tokens = [];
enabled = True;
loop = True;
while (loop):
	t = p.get_token();
	loop = (t[0] is not None);

	if (t[0] == Parser.COMMENT_BLOCK):
		m = re_feature.match(t[2]);
		if (m is not None):
			t = None;
			tag = m.group(2);
			if (m.group(1) is None):
				# Opener
				feature_stack.append([ tag , enabled ]);
				if (tag in features):
					if (tag not in kept_features): kept_features[tag] = 0;
					kept_features[tag] += 1;
				else:
					enabled = False;
					if (tag not in removed_features): removed_features[tag] = 0;
					removed_features[tag] += 1;
			else:
				# Closer
				if (len(feature_stack) > 0 and feature_stack[-1][0] == tag):
					pass;
				else:
					sys.stderr.write("Mismatched feature tag\n");
					sys.exit(-1);
				enabled = feature_stack.pop()[1];

	if (enabled and t is not None):
		tokens.append(t[1]);
		tokens.append(t[2]);



# Output
s_out = "".join(tokens);
f = open(output, "wb");
f.write(s_out);
f.close();



# Done
def feature_info(map, label1, label2):
	keys = map.keys();
	keys.sort(key=lambda k: k.lower());
	if (len(keys) == 0):
		sys.stdout.write("{0:s}\n".format(label1));
	else:
		sys.stdout.write("{0:s}\n".format(label2));
		for k in keys:
			v = map[k];
			sys.stdout.write("  {0:s}: {1:d} section{2:s}\n".format(k, v, "" if (v == 1) else "s"));

feature_info(kept_features, "No features kept", "Features kept");
feature_info(removed_features, "No features removed", "Features removed");

sys.exit(0);
