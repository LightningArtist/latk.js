@echo off

set BUILD_TARGET=..\latk.js
set BUILD_TARGET_MIN=..\latk.min.js

cd /D %~dp0

del %BUILD_TARGET%

copy /b latk-header.js+libraries\jszip\jszip.min.js+libraries\jszip\jszip-utils.min.js+latk-point.js+latk-stroke.js+latk-frame.js+latk-layer.js+latk-main.js %BUILD_TARGET%

uglifyjs %BUILD_TARGET% --compress --mangle --output %BUILD_TARGET_MIN%

@pause

