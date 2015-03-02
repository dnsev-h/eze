@echo off

python all_in_one.py eze.dev.user.js eze.meta.js -nosep -meta
python all_in_one.py eze.dev.user.js eze.user.js -nosep

replace.py eze.user.js eze.v2.user.js
de_debug.py eze.v2.user.js eze.v3.user.js

move eze.meta.js ..\builds\eze.meta.js
move eze.v3.user.js ..\builds\eze.user.js

del eze.user.js
del eze.v2.user.js
