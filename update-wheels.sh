#!/bin/bash
set -ex

rm -rf tmp
mkdir tmp
cd tmp

# gprof2dot is not yet published as wheel.
git clone -b 2019.11.30 https://github.com/jrfonseca/gprof2dot.git --depth 1
cd gprof2dot
pip3 wheel -w ../../wheels .
