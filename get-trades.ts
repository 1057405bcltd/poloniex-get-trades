#!/usr/bin/env node

import * as moment from "moment";
import * as _ from "lodash";

const assert = require('assert');
var fs = require('fs-extra');
const Json2csvParser = require('json2csv').Parser;
const json2csvParser = new Json2csvParser({ header: false });

const Poloniex = require('poloniex-api-node');
let poloniex = new Poloniex(process.env.POLONIEX_API_KEY, process.env.POLONIEX_API_SECRET, { socketTimeout: 60000 });

const timer = (timeout) => new Promise((resolve, reject) => {
  try {
    setTimeout(resolve, timeout, null);
  } catch (err) {
    reject(err);
  }
});

const startOfEpoch = "2016-01-01";

type PoloniexTrade = {
  globalTradeID: string
  date: string
}

console.log("Start of Epoch: ", startOfEpoch);

const filename = process.argv[2];

const saveToCsv = async (trades: Array<any>, market: string) => {

  try {

    const data = trades.map(trade => ({ market, ...trade }));

    const csvTrades = json2csvParser.parse(data);

    await fs.outputFile(filename, csvTrades, { 'flag': 'a' });
    await fs.outputFile(filename, '\r', { 'flag': 'a' });

    console.log(`\n${market} Trades Saved: ${trades.length}`);

  } catch (err) {
    // Errors are thrown for bad options, or if the data is empty and no fields are provided.
    // Be sure to provide fields if it is possible that your data array will be empty.
    console.error(err);
    process.exit(1);
  }
}

const getTradeHistory = async (market, start, end, limit) => {

  while (true) {

    try {

      const trades = await poloniex.returnMyTradeHistory(
        market,
        start,
        end,
        limit) as Array<PoloniexTrade>;

      return trades;
    }

    catch (err) {

      console.log(`${err.message}...retrying`);
      await timer(200);
    }
  }
}

const tradesMap = new Map();

const getTrades = async (market: string, startRange, endRange) => {

  try {

    await timer(150);

    process.stdout.write('.')

    const trades = await getTradeHistory(
      market,
      startRange.unix(),
      endRange.unix(),
      10000) as Array<PoloniexTrade>;

    console.log({ trades })

    const sortedTrades = trades.sort((a, b) => {

      if (moment(a.date) > moment(b.date)) {
        return -1;
      } else if (moment(a.date) < moment(b.date)) {
        return 1;
      } else {
        return 0;
      }
    }) as Array<PoloniexTrade>;

    for (const trade of sortedTrades) {

      tradesMap.set(trade.globalTradeID, trade);
    }

    if (trades.length === 10000) {

      await getTrades(market, moment(sortedTrades[0].date), endRange);
      await getTrades(market, startRange, moment(sortedTrades[sortedTrades.length - 1].date));
    }

  } catch (err) {
    console.log(new Error(err.message));
  }
}

(async () => {

  try {

    if (process.argv.length != 3) {
      console.log('Usage: gettrades outfile');
      process.exit(1);
    }

    // Remove the old file
    await fs.remove(process.argv[2]);

    const markets = Object.keys(await poloniex.returnTicker());

    for (const market of markets) {

      console.log('\nCapturing Trades Data For Market: ', market);

      tradesMap.clear();
      await getTrades(market, moment(startOfEpoch), moment().startOf('day'));

      tradesMap.size ? await saveToCsv(Array.from(tradesMap.values()), market) : _.noop;
    }

    process.exit(0);

  } catch (err) {
    console.log(new Error(err.message));
    process.exit(1);
  }

})();
