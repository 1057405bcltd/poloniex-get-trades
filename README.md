# Get Trades #

## Introduction

The purpose of this software is to retrieve an account's trade history and record it to a CSV file.

### System Requirements ##

1. Ubuntu 16.04
2. NodeJS 8.9.4 or later.
3. The following environemnt variables must be defined:

	POLONIEX_API_KEY
	POLONIEX_API_SECRET

## Installation

	cd ~
	git clone https://github.com/roderickmonk/get-trades.git
	cd get-trades
	npm install

##	get-trades ##

From the command line:

	node get-trades poloniex <filename>

