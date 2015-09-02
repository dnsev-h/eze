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



# Join string tokens
def escape_quote(string, quote):
	i = 0;
	escaped = False;
	string_len = len(string);
	last_pos = 0;
	parts = [];

	while (i < string_len):
		c = string[i];
		if (escaped):
			escaped = False;
			if (c == "\n"):
				parts.append(string[last_pos : i]);
				last_pos = i + 1;
			elif (c == "\r"):
				parts.append(string[last_pos : i]);
				if (i + 1 < string_len and string[i + 1] == "\n"):
					i += 1;
				last_pos = i + 1;
		else:
			if (c == "\\"):
				escaped = True;
			elif (c == quote):
				parts.append(string[last_pos : i]);
				parts.append("\\");
				last_pos = i;

		# Next
		i += 1;

	if (len(parts) > 0):
		parts.append(string[last_pos : ]);
		return "".join(parts);
	else:
		return string;

def join_string_tokens(strings, joiner):
	# Find most common quote
	counts = {};
	quote = '"';

	if (len(strings) > 0):
		for s in strings:
			c = s[0];
			if (c not in counts): counts[c] = 1;
			else: counts[c] += 1;

		counts = counts.items();
		counts.sort(key=lambda k: k[1]);
		quote = counts[0][0];
	quote = '"';

	# Modify joiner
	if (joiner[0] == quote):
		joiner = joiner[1:-1];
	else:
		joiner = escape_quote(joiner[1:-1], quote);

	# Join
	full = [ quote ];

	first = True;
	for s in strings:
		if (first):
			first = False;
		else:
			full.append(joiner);

		if (s[0] == quote):
			full.append(s[1:-1]);
		else:
			full.append(escape_quote(s[1:-1], quote));

	full.append(quote);
	return "".join(full);



# Process
p = Parser(s);
tokens = [];
loop = True;
string_state = 0;
string_tokens_all = [];
string_tokens = [];
string_token_middle = None;
string_token_first_whitespace = None;
pre_was_string = False;
open_comment_blocks = 0;
re_newline = re.compile("\r\n?|\n");
while (loop):
	t = p.get_token();
	loop = (t[0] is not None);

	if (string_state <= 0):
		if (t[0] == Parser.SYMBOL and t[2] == "["):
			string_token_first_whitespace = t[1];
			string_tokens_all.extend([ t[1], t[2] ]);
			string_state = 1;
			pre_was_string = False;
			open_comment_blocks = 0;
			t = None;

		elif (string_state == -2):
			if (t[0] == Parser.COMMENT):
				# skip
				if (t[2][:3] == "//}"):
					t = None;
					open_comment_blocks -= 1;
					if (open_comment_blocks <= 0):
						string_state = 0;
			if (t is not None and re_newline.search(t[1] + t[2]) is not None):
				string_state = 0;

	elif (string_state == 1):
		# Potentially forming a string
		string_tokens_all.extend([ t[1], t[2] ]);
		if (t[0] == Parser.COMMENT or t[0] == Parser.COMMENT_BLOCK):
			# skip
			start = t[2][:3];
			if (start == "//{"):
				open_comment_blocks += 1;
			elif (start == "//}"):
				open_comment_blocks -= 1;
				if (open_comment_blocks < 0): open_comment_blocks = 0;
		elif (t[0] == Parser.STRING):
			pre_was_string = True;
			string_tokens.append(t[2]);
		elif (t[0] == Parser.SYMBOL):
			if (t[2] == "]"):
				string_state = 2;
			elif (t[2] == ","):
				if (not pre_was_string):
					# Not a string
					string_state = -1;
			else:
				# Not a string
				string_state = -1;
		else:
			# Not a string
			string_state = -1;

		t = None;

	else:
		# Look for .join("")
		string_tokens_all.extend([ t[1], t[2] ]);
		if (string_state == 2): # .
			if (t[2] == "."):
				string_state = 3;
			else:
				string_state = -1;

			t = None;
		elif (string_state == 3): # join
			if (t[2] == "join"):
				string_state = 4;
			else:
				string_state = -1;

			t = None;
		elif (string_state == 4): # (
			if (t[2] == "("):
				string_state = 5;
			else:
				string_state = -1;

			t = None;
		elif (string_state == 5): # string
			if (t[0] == Parser.STRING):
				string_token_middle = t[2];
				string_state = 6;
			else:
				string_state = -1;

			t = None;
		elif (string_state == 6): # )
			if (t[2] == ")"):
				# Complete
				tokens.append(string_token_first_whitespace);
				tokens.append(join_string_tokens(string_tokens, string_token_middle));
				string_tokens_all = [];
				string_tokens = [];
				string_state = 0;
				if (open_comment_blocks > 0):
					string_state = -2;
			else:
				string_state = -1;

			t = None;


	if (t is not None):
		tokens.append(t[1]);
		tokens.append(t[2]);
	elif (string_state == -1):
		tokens.extend(string_tokens_all);
		string_tokens_all = [];
		string_tokens = [];
		string_state = 0;




# Output
s_out = "".join(tokens);
f = open(output, "wb");
f.write(s_out);
f.close();



# Done
sys.exit(0);
