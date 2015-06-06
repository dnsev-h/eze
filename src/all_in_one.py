#! /usr/bin/env python
import re, os, sys;



class Parser:
	__operators = (
		">>=" , "<<=" , "===" , "!==" , ">>>" ,
		">>" , "<<" , "++" , "--" , "==" , "!=" , "<=" , ">=" , "&&" , "||" , "+=" , "-=" , "*=" , "/=" , "%=" , "|=" , "&=" , "^=" ,
		"=" , "+" , "-" , "*" , "/" , "%" , "&" , "|" , "^" , ">" , "<" , "!" , "~" , "." , "[" , "]" , "(" , ")" , "{" , "}" , "?" , ":" , "," , ";"
	);
	__regex_symbols = (
		">>=" , "<<=" , "===" , "!==" , ">>>" ,
		">>" , "<<" , "++" , "--" , "==" , "!=" , "<=" , ">=" , "&&" , "||" , "+=" , "-=" , "*=" , "/=" , "%=" , "|=" , "&=" , "^=" ,
		"=" , "+" , "-" , "*" , "/" , "%" , "&" , "|" , "^" , ">" , "<" , "!" , "~" , "." , "[" , "(" , "{"  , "?" , ":" , "," , ";"
	);
	WORD = 0;
	NUMBER = 1;
	SYMBOL = 2;
	STRING = 3;
	COMMENT = 4;
	COMMENT_BLOCK = 5;
	REGEX = 6;

	@staticmethod
	def is_alphanumeric(ch):
		ch = ord(ch.lower());
		return (ch >= ord('a') and ch <= ord('z')) or (ch >= ord('0') and ch <= ord('9')) or ch == ord('_') or ch == ord('$');
	@staticmethod
	def is_alphabetic(ch):
		ch = ord(ch.lower());
		return (ch >= ord('a') and ch <= ord('z')) or ch == ord('_') or ch == ord('$');
	@staticmethod
	def is_numeric(ch):
		ch = ord(ch.lower());
		return (ch >= ord('0') and ch <= ord('9'));

	def __init__(self, src):
		self.src = src;
		self.pos = 0;
		self.token_type_pre = None;
		self.token_str_pre = None;

	def get_token(self):
		# Remove whitespace
		whitespace = "";
		while (self.pos < len(self.src) and ord(self.src[self.pos]) <= 32):
			whitespace += self.src[self.pos];
			self.pos += 1;
		# Done?
		if (self.pos >= len(self.src)):
			self.token_type_pre = None;
			self.token_str_pre = None;
			return ( None , whitespace , "" );

		# Get type
		type = None;
		if (self.src[self.pos] == '"' or self.src[self.pos] == '\''):
			type = Parser.STRING;
		elif (self.src[self.pos] == '/' and self.pos + 1 < len(self.src) and (self.src[self.pos + 1] == '/' or self.src[self.pos + 1] == '*')):
			if (self.src[self.pos + 1] == '*'):
				type = Parser.COMMENT_BLOCK;
			else:
				type = Parser.COMMENT;
		elif (self.src[self.pos] == '/' and (self.token_type_pre == Parser.SYMBOL and self.token_str_pre in Parser.__regex_symbols)): # not perfect, but should work
			type = Parser.REGEX;
		elif (Parser.is_alphabetic(self.src[self.pos])):
			type = Parser.WORD;
		elif (Parser.is_numeric(self.src[self.pos])):
			type = Parser.NUMBER;
		else:
			if (self.src[self.pos] == '.' and self.pos + 1 < len(self.src) and Parser.is_numeric(self.src[self.pos + 1])):
				type = Parser.NUMBER;
			else:
				type = Parser.SYMBOL;

		# Parse based on type
		literal = self.src[self.pos];
		self.pos += 1;
		if (type == Parser.WORD):
			# Parse
			while (self.pos < len(self.src) and Parser.is_alphanumeric(self.src[self.pos])):
				literal += self.src[self.pos];
				self.pos += 1;
		elif (type == Parser.NUMBER):
			# Parse
			while (self.pos < len(self.src) and Parser.is_alphanumeric(self.src[self.pos])):
				literal += self.src[self.pos];
				self.pos += 1;
		elif (type == Parser.SYMBOL):
			# Currently only works for a maximum of length=3 operators
			if (self.pos + 1 < len(self.src) and (literal + self.src[self.pos] + self.src[self.pos + 1]) in Parser.__operators):
				literal += self.src[self.pos] + self.src[self.pos + 1];
				self.pos += 2;
			elif (self.pos < len(self.src) and (literal + self.src[self.pos]) in Parser.__operators):
				literal += self.src[self.pos];
				self.pos += 1;
		elif (type == Parser.STRING):
			# Init
			escape = False;
			quote = literal;
			# Parse
			while (self.pos < len(self.src)):
				literal += self.src[self.pos];
				if (escape):
					escape = False;
				else:
					if (self.src[self.pos] == '\\'):
						escape = True;
					elif (self.src[self.pos] == quote or self.src[self.pos] == '\n'):
						self.pos += 1;
						break;
				self.pos += 1;
		elif (type == Parser.REGEX):
			# Init
			escape = False;
			quote = literal;
			# Parse
			while (self.pos < len(self.src)):
				literal += self.src[self.pos];
				if (escape):
					escape = False;
				else:
					if (self.src[self.pos] == '\\'):
						escape = True;
					elif (self.src[self.pos] == quote or self.src[self.pos] == '\n'):
						self.pos += 1;
						break;
				self.pos += 1;
			# Flags
			while (self.pos < len(self.src)):
				if (ord(self.src[self.pos]) >= ord('a') and ord(self.src[self.pos]) <= ord('z')):
					literal += self.src[self.pos];
					self.pos += 1;
				else:
					break;
		elif (type == Parser.COMMENT):
			# Init
			literal += self.src[self.pos];
			self.pos += 1;
			# Parse
			while (self.pos < len(self.src)):
				literal += self.src[self.pos];
				self.pos += 1;
				if (self.src[self.pos - 1] == '\n'):
					if (self.pos >= 2 and self.src[self.pos - 2] == '\\'):
						# Escaped
						pass;
					elif (self.pos >= 3 and self.src[self.pos - 2] == '\r' and self.src[self.pos - 3] == '\\'):
						# Escaped
						pass;
					else:
						break;
		elif (type == Parser.COMMENT_BLOCK):
			# Init
			literal += self.src[self.pos];
			self.pos += 1;
			was_star = False;
			# Parse
			while (self.pos < len(self.src)):
				literal += self.src[self.pos];
				self.pos += 1;
				if (was_star and self.src[self.pos - 1] == '/'): break;
				was_star = (self.src[self.pos - 1] == '*');
		else: # if (type == Parser.PP_CMD):
			# Init
			# Parse
			while (self.pos < len(self.src)):
				# Comment check
				if (self.pos + 1 < len(self.src) and self.src[self.pos] == '/' and (self.src[self.pos + 1] == '/' or self.src[self.pos + 1] == '*')):
					break;
				# Append
				literal += self.src[self.pos];
				self.pos += 1;
				# Endlines
				if (self.src[self.pos - 1] == '\n'):
					if (self.pos >= 2 and self.src[self.pos - 2] == '\\'):
						# Escaped
						pass;
					elif (self.pos >= 3 and self.src[self.pos - 2] == '\r' and self.src[self.pos - 3] == '\\'):
						# Escaped
						pass;
					else:
						break;

		# Return
		if (type != Parser.COMMENT and type != Parser.COMMENT_BLOCK):
			self.token_type_pre = type;
			self.token_str_pre = literal;
		return ( type , whitespace , literal );

	def join(self, token1, token2, newline, pre_whitespace):
		# Ignore
		if (token2[0] == Parser.COMMENT_BLOCK):
			return [ None , "" ];
		if (token2[0] == Parser.COMMENT):
			return [ None , token2[1] + "\n" ];

		# First token
		if (token1 == None): return token2[2];

		# Newlines
		if ((pre_whitespace + token2[1]).rfind("\n") >= 0):
			pos = token2[1].rfind("\n");
			return newline + token2[1][pos + 1 : ] + token2[2];

		# Spacing
		space = " ";
		if ((token1[0] == Parser.WORD or token1[0] == Parser.NUMBER) and (token2[0] == Parser.WORD or token2[0] == Parser.NUMBER) and (self.is_alphanumeric(token1[2][-1]) and self.is_alphanumeric(token2[2][0]))):
			# Separate words and regex
			return " " + token2[2];
		if ((token1[0] == Parser.REGEX) and (token2[0] == Parser.WORD or token2[0] == Parser.NUMBER)):
			# Separate words and regex
			return " " + token2[2];
		if (token1[0] == Parser.SYMBOL and token2[0] == Parser.SYMBOL):
			for i in range(len(token2[2])):
				if ((token1[2] + token2[2][ : i + 1]) in Parser.__operators):
					# Separate operators;
					return " " + token2[2];
		# Since this isn't doing smart parsing, do this instead
		#if (token1[0] == Parser.SYMBOL and (token1[2] == ")" or token1[2] == "]" or token1[2] == "}") and token2[1].find("\n") >= 0):
		#	return "\n" + token2[2];

		# Done
		return token2[2];


def write_compressed(source, out, t_pre, newline):
	p = Parser(source);
	add = "";
	while (True):
		t = p.get_token();
		if (t[0] == None): break;
		s = p.join(t_pre, t, newline, add);
		if (s[0] != None):
			add = "";
			out.write(s);
			t_pre = t;
		else:
			add += s[1];

	return t_pre;


def get_meta(source):
	# Find headers
	metadata_labels = [ "UserScript" , "Meta" ];
	metadata_types = [ 0 , 0 ];
	metadata = [];
	i = 0;
	for label in range(len(metadata_labels)):
		metadata.append([]);
		in_header = False;
		while (i < len(source)):
			s = re.split(r"\s", source[i]);
			if (s[0][:2] == "//"):
				# Comment line
				pos = source[i].find("//");
				data = source[i][pos + 2 : ].strip();
				if (in_header):
					if (data == ("==/" + metadata_labels[label] + "==")):
						i += 1;
						break;
					elif (metadata_types[label] == 1):
						metadata[label].append(source[i]);
					elif (data[0] == "@"):
						# Parse the option
						s = re.split(r"\s", data);
						param = s[0][1:];
						value = data[1 + len(param) : ].strip();
						metadata[label].append((param , value));
				elif (data == ("==" + metadata_labels[label] + "==")): in_header = True;
				else: break;
			elif (metadata_types[label] == 1):
				metadata[label].append(source[i]);
			else: break;
			i += 1;
	source_line_first = i;

	return ( metadata , source_line_first );


def main():
	# Usage
	if (len(sys.argv) < 3):
		print "Usage:"
		print "  " + sys.argv[0] + " input_userscript.js output_filename.js";
		return -1;

	# Input/output files
	input = sys.argv[1];
	output = sys.argv[2];
	shrink = ("-min" in sys.argv[3:]);
	meta_only = ("-meta" in sys.argv[3:]);
	no_separators = ("-nosep" in sys.argv[3:]);
	if (input.lower() == output.lower()):
		print "Error: input and output scripts cannot be the same";
		return -1;
	output_meta = output.replace(".user.js", ".meta.js");
	output_target = output.replace(".meta.js", ".user.js");

	# Read input
	f = open(input, "rb");
	source = f.read().splitlines();
	f.close();
	for i in range(len(source)): source[i] = source[i].rstrip();

	# Find headers
	metadata_labels = [ "UserScript" , "Meta" ];
	metadata = get_meta(source);
	source_line_first = metadata[1];
	metadata = metadata[0];

	# Setup
	out = open(output, "wb"); # sys.stdout;
	padding = 0;
	newline = "\n";
	for i in range(len(metadata[0])): padding = max(padding, len(metadata[0][i][0]));
	for i in range(len(metadata[1])): padding = max(padding, len(metadata[1][i][0]));
	padding = padding + 1;
	requires = [];

	# Metadata
	out.write("// ==" + metadata_labels[0] + "==" + newline);
	for i in range(len(metadata[0])):
		key = metadata[0][i][0];
		val = metadata[0][i][1];
		if (key != "require"):
			# Remove "(dev)" tag from title
			if (key == "name"):
				val = re.compile(r"\s*\(dev\)\s*$", re.I).sub("", val);
			out.write("// @" + key + (" " * (padding - len(key))) + val + newline);
		else:
			requires.append(val.rsplit("/", 1)[-1]);
	for i in range(len(metadata[1])):
		out.write("// @" + metadata[1][i][0] + (" " * (padding - len(metadata[1][i][0]))) + metadata[1][i][1].replace("{{target}}", output_target).replace("{{meta}}", output_meta) + newline);
	out.write("// ==/" + metadata_labels[0] + "==" + newline);

	# Done
	if (meta_only):
		out.close();
		return 0;

	if (not shrink):
		if (not no_separators):
			out.write(newline + newline);
	else:
		out.write("// For license information, check the individual files" + newline);

	# Include requirements
	t_pre = None;
	for i in range(len(requires)):
		f = open(requires[i], "rb");
		require_source = f.read();
		f.close();

		if (shrink):
			t_pre = write_compressed(require_source, out, t_pre, newline);
			out.write(newline);
		else:
			if (not no_separators):
				out.write(("/" * 80) + newline);
				out.write("//{ " + requires[i] + newline);
				out.write(("/" * 80) + newline);

			require_source = require_source.splitlines();
			for j in range(len(require_source)):
				out.write(require_source[j].rstrip() + newline);

			if (not no_separators):
				out.write(("/" * 80) + newline);
				out.write("//} /" + requires[i] + newline);
				out.write(("/" * 80) + newline + newline + newline);

	# Main source
	if (shrink):
		t_pre = write_compressed(newline.join(source[source_line_first : ]), out, t_pre, newline);
		out.write(newline);
	else:
		if (not no_separators):
			out.write(("/" * 80) + newline);
			out.write("//{ Userscript" + newline);
			out.write(("/" * 80) + newline);

		for i in range(source_line_first, len(source)):
			out.write(source[i].rstrip() + newline);

		if (not no_separators):
			out.write(("/" * 80) + newline);
			out.write("//} /Userscript" + newline);
			out.write(("/" * 80) + newline + newline);

	# Done
	out.close();
	return 0;


# Run
if (__name__ == "__main__"): sys.exit(main());

