#!/usr/bin/env sh

# abort on errors
set -e

# clear out old dist
rm -rf dist

# build
npm run build

# navigate into the build output directory
cd dist/blutack

# place .nojekyll to bypass Jekyll processing
echo > .nojekyll

# if you are deploying to a custom domain
# echo 'www.example.com' > CNAME

git init
git checkout -b main
git add -A
git commit -m 'deploy'

# if you are deploying to https://<USERNAME>.github.io/<REPO>
git push -f git@github.com:pvh/blutack.git main:gh-pages

cd -
