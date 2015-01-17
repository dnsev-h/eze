python all_in_one.py eze.dev.user.js eze.meta.js -nosep -meta

python all_in_one.py eze.dev.user.js eze.user.js -nosep

replace.py eze.user.js eze.final.user.js

del eze.user.js
ren eze.final.user.js eze.user.js

move eze.meta.js ..\builds\
move eze.user.js ..\builds\

