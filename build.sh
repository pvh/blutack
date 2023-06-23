#!/usr/bin/env sh

# abort on errors
set -e

yarn run build-app
yarn run build-lib
