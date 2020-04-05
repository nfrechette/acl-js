# Getting started

In order to contribute to or build `acl-js` you will first need to setup your environment.

## Setting up your environment

1. Install CMake 3.4+, Python 3.4+, Emscripten SDK 1.39.11+.
2. Execute `git submodule update --init` to get the files of external submodules (e.g. ACL).
3. Generate the the make files with: `python make.py` (output under `./build`).
4. Build with: `python make.py -build` (output under `./bin`).
5. Run the regression tests with: `python make.py -regression_test` (see [here](../test_data/README.md) for details).

*Above steps have been tested under OS X and Linux.*

## Commit message format

This library uses the [angular.js message format](https://github.com/angular/angular.js/blob/master/DEVELOPERS.md#commits) and it is enforced with commit linting through every pull request.
