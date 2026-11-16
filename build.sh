#!/bin/sh
# Rebuilds js/riffbook.js from the sources in src/ (needs Node.js + esbuild)
cd "$(dirname "$0")"
npx esbuild src/app.js --bundle --format=iife --target=es2020 --minify --sourcemap --outfile=js/riffbook.js
