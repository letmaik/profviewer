#!/bin/bash
set -ex

rm -rf tmp
mkdir tmp
cd tmp

# Packages that are not yet published as wheel.
git clone -b 2019.11.30 https://github.com/jrfonseca/gprof2dot.git --depth 1
git clone -b 0.4 https://github.com/baverman/flameprof.git --depth 1

pip3 wheel -w . gprof2dot/
pip3 wheel -w . flameprof/

cp -n *.whl ..
