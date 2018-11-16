# Get Trades #

## Introduction

The purpose of this software is to retrieve an account's Poloniex trade history and record it to a CSV file.
It has been tested on Ubuntu 16.04.  It may also run on other Operating Systems, but this has
not been confirmed.

### System Requirements ##

<ol>
<li>Ubuntu 16.04</li>
<li>NodeJS 10.12 or later</li>
<li>The following environment variables must be defined:

	export POLONIEX_API_KEY=...
	export POLONIEX_API_SECRET=...
</li>
</ol>

## Installation

	cd ~
	git clone https://github.com/1057405bcltd/poloniex-get-trades.git
	cd poloniex-get-trades
	npm install

##	Running ##

To view process output at the console and capture it in a log file, log.txt:

	$ node get-trades.js | tee log.txt

A more detailed trace of activity is available by enabling debug mode:

	$ DEBUG=debug node get-trades.js | tee log.txt


##	Output ##

The output files can be found in the folder `trades`, one file per market.

##	Verification ##

In order to verify correct execution, the following steps are suggested.

<ol>
<li>Contained within the repo is a file `expected-log.txt`.  Its contents must correspond to that produced locally (note: the "ESOCKETTIMEDOUT...retrying" messages can be ignored).</li>
<li>Further, the file <b>expected-wc.txt</b>, also found in the repo, contains the output of the <b>wc</b> command. Its content can be derived locally with the following command: <b>wc -l trades/*</b>.  Its contents are the number of trade records in each file <b>plus 1</b> (i.e. every file contains at minimum a CSV header record; so if there was a no trade activity on a given market, then it will be shown as having 1 record).</li>
</ol>

