@echo off

set BUILD_TARGET=..\latk.js
cd /D %~dp0

del %BUILD_TARGET%

copy /b header.js+libraries\jszip\jszip.min.js+libraries\jszip\jszip-utils.min.js+main.js %BUILD_TARGET%

rem copy %BUILD_TARGET% "%homepath%\AppData\Roaming\Blender Foundation\Blender\2.91\scripts\addons"

@pause

