# Regression testing

This directory is meant to contain all the relevant data to perform regression testing. Sadly, the setup is manual for now and as a result, continuous integration builds do not run regression testing yet.

## Setup

Find the latest test data zip file located on Google Drive and save it into this directory. If your data ever becomes stale, the python script will indicate as such and you will need to perform this step again. The zip file contains a number of clips from the [Carnegie-Mellon University](../external/acl/docs/cmu_performance.md) database that were hand selected. A readme file within the zip file details this.

*  **v3** Test data [link](https://drive.google.com/file/d/1ZxQp1-q_stN2MIgyQm6v6FP2zg6GmNPk/view?usp=sharing) (**Latest**)

## Running the tests

Using **Python 3**, run [make.py](../make.py) with the `-regression_test` command line switch.

## Test configurations

All clips are tested with default compression settings.

## Debugging a test failure

If a regression test fails, the python script will output the clip that failed along with the command line used to reproduce the failure.
