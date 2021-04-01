#!/bin/bash

BUILD_TARGET="../latk.js"
BUILD_TARGET_MIN="../latk.min.js"

SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ]; do # resolve $SOURCE until the file is no longer a symlink
  DIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"
  SOURCE="$(readlink "$SOURCE")"
  [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE" # if $SOURCE was a relative symlink, we need to resolve it relative to the path where the symlink file was located
done
DIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"

cd $DIR

rm $BUILD_TARGET
touch $BUILD_TARGET

cat "latk-header.js" "libraries/jszip/jszip.min.js" "libraries/jszip/jszip-utils.min.js" "latk-point.js" "latk-stroke.js" "latk-frame.js" "latk-layer.js" "latk-main.js" > $BUILD_TARGET

uglifyjs $BUILD_TARGET --compress --mangle --output $BUILD_TARGET_MIN



