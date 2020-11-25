@echo off

set BUILD_TARGET=..\latk.js
cd /D %~dp0

del %BUILD_TARGET%

copy /b latk-header.js+libraries\jszip\jszip.min.js+libraries\jszip\jszip-utils.min.js+latk-main.js+latk-layer.js+latk-frame.js+latk-stroke.js+latk-point.js+latk-util.js %BUILD_TARGET%

rem copy %BUILD_TARGET% "%homepath%\AppData\Roaming\Blender Foundation\Blender\2.91\scripts\addons"

@pause

