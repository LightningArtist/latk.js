#!/bin/bash

BUILD_TARGET="../latk.js"

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

cat "header.js" "libraries/jszip/jszip.min.js" "libraries/jszip/jszip-utils.min.js" "main.js" > $BUILD_TARGET

#cp $BUILD_TARGET "${HOME}/Applications/blender/2.91/scripts/addons/"