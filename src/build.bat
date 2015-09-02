@echo off
color



:: Compile
call :compile "" "" || goto :error



:: Done
goto :eof



:: Compile
:compile

set VERSION=%1
set VERSION_FULL=%2
set DEST_META=..\builds\eze%VERSION%.meta.js
set DEST=..\builds\eze%VERSION%.user.js

call :get_features %*

:: Meta building
python all_in_one.py eze.dev.user.js eze.meta.js -nosep -meta -version %VERSION_FULL%

:: Main
python all_in_one.py      eze.dev.user.js    eze.user.js -nosep -version %VERSION_FULL%
python replace.py         eze.user.js        eze.build1.user.js
python de_debug.py        eze.build1.user.js eze.build2.user.js
python features.py        eze.build2.user.js eze.build3.user.js %FEATURES%
python string_compress.py eze.build3.user.js eze.build4.user.js

node build_validator.js eze.build4.user.js || exit /B 1

:: Delete, copy, and cleanup
del %DEST_META% > NUL 2> NUL
del %DEST% > NUL 2> NUL

copy eze.meta.js ..\builds\eze%VERSION%.meta.js > NUL 2> NUL
copy eze.build4.user.js ..\builds\eze%VERSION%.user.js > NUL 2> NUL

del eze.meta.js > NUL 2> NUL

del eze.user.js > NUL 2> NUL
del eze.build1.user.js > NUL 2> NUL
del eze.build2.user.js > NUL 2> NUL
del eze.build3.user.js > NUL 2> NUL
del eze.build4.user.js > NUL 2> NUL

exit /B 0

goto :eof



:: Get features from arguments
:get_features

set FEATURES=
shift
shift

if "%~1" neq "" (
	set FEATURES=%1
	shift
)

:get_features_loop
if "%~1" neq "" (
	set FEATURES=%FEATURES% %1
	shift
	goto :get_features_loop
)

goto :eof



:: Error
:error
color c
echo Something went wrong while building
goto :eof


