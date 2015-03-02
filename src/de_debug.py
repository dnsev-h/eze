import os, sys;
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



# Process
add_depth = 0;
p = Parser(s);
tokens = [];
wrap_positions = [];
debug_removals = 0;
while (True):
	t = p.get_token();

	if (t[0] == Parser.COMMENT_BLOCK):
		if (t[2] == "/*<debug>*/"):
			if (add_depth == 0):
				debug_removals += 1;
				tokens.append(t[1]);
			add_depth += 1;
		elif (t[2] == "/*</debug>*/"):
			add_depth -= 1;
			if (add_depth < 0): add_depth = 0;
		else:
			if (add_depth == 0):
				tokens.append(t[1]);
				tokens.append(t[2]);
	else:
		if (add_depth == 0):
			tokens.append(t[1]);
			tokens.append(t[2]);
			if (t[2] == "_w"):
				wrap_positions.append(len(tokens) - 3);

	if (t[0] == None): break;



# Remove wrap functions
match = [ "." , "_w" , "(" , ")" ];
wrapper_removals = 0;
for p in wrap_positions:
	if (p < 1): continue;

	try:
		m = 0;
		for i in range(p, p + 4 * 2, 2):
			if (tokens[i] != match[m]): break;
			m += 1;

		if (m == len(match)):
			wrapper_removals += 1;
			for i in range(p, p + 4 * 2):
				tokens[i] = "";
	except IndexError:
		pass;



# Output
s_out = "".join(tokens);
f = open(output, "wb");
f.write(s_out);
f.close();



# Done
sys.stdout.write("Removed {0:d} debug segment(s)\n".format(debug_removals));
sys.stdout.write("Removed {0:d} wrapper functions(s)\n".format(wrapper_removals));
sys.exit(0);
