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

From the command line:

	$ node get-trades.js

##	Output ##

The output file is `trades.csv`