#! /usr/bin/env python
import re, os, sys, json, shutil, base64, all_in_one;


def replace_pattern(match, replacement_data):
	valid_patterns = [ "metadata" ];

	if (match.group(1) in valid_patterns):
		# Increase count
		replacement_data["count"] += 1;

		# Replacement
		r = json.dumps(replacement_data["metadata_new"], separators=(',', ':'));
		r = re.sub(r"^\{|\}$", "", r);

		# Modify
		return r;
	else:
		# Same
		return m.group(0);


def main():
	f = open(sys.argv[1], "rb");
	source = f.read();
	f.close();

	# Get metadata
	source_lines = source.splitlines();
	for i in range(len(source_lines)): source_lines[i] = source_lines[i].rstrip();
	metadata = all_in_one.get_meta(source_lines)[0];

	# Split metadata
	metadata_new = {};
	for m_type in metadata:
		for m_entry in m_type:
			if (m_entry[0] not in metadata_new):
				metadata_new[m_entry[0]] = [];
			metadata_new[m_entry[0]].append(m_entry[1]);

	# Un-array
	is_array = [ "grant" , "include" , "require" ];
	for m in metadata_new:
		if (len(metadata_new[m]) == 1 and (m not in is_array)):
			metadata_new[m] = metadata_new[m][0];

	# Replace
	p = re.compile(r"\/\*\{(.+?)\}\*\/");
	replacement_data = {
		"count": 0,
		"metadata_new": metadata_new
	};
	source_new = p.sub(lambda m: replace_pattern(m, replacement_data), source);

	# Write
	f = open(sys.argv[2], "wb");
	f.write(source_new);
	f.close();

	# Okay
	return 0;



if (__name__ == "__main__"): sys.exit(main());
