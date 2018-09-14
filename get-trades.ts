#!/usr/bin/env node

import * as moment from "moment";
import * as _ from "lodash";
import * as request from "request-promise-native";

const assert = require('assert');
var fs = require('fs-extra');
var json2csv = require('json2csv');

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

type RemainingMarket = {
  market: string,
  firstYear: any
}

type PoloniexTrade = {
  globalTradeID: string
  date: string
}

console.log("Start of Epoch: ", startOfEpoch);

const isSorted = (trades) => {

  // Deal with the vacuous cases first
  if (trades.length === 0 || trades.length === 1) {
    return true;
  }

  let i;
  if (trades[0].date <= trades[1].date) {
    for (i = 0; i < trades.length - 1 && moment(trades[i].date) <= moment(trades[i + 1].date); i++) { }
  } else {
    for (i = 0; i < trades.length - 1 && moment(trades[i].date) >= moment(trades[i + 1].date); i++) { }
  }

  return i === trades.length - 1;
}

const filename = process.argv[3];


const saveToCsv = async (trades: Array<any>, market: string) => {

  try {

    const csvTrades = json2csv(
      {
        // data: trades,
        data: trades.map(trade => ({ market, ...trade })),
        preserveNewLinesInValues: true,
        hasCSVColumnTitle: false
      });

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

    process.stdout.write ('.')

    const trades = await getTradeHistory(
      market,
      startRange.unix(),
      endRange.unix(),
      10000) as Array<PoloniexTrade>;

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

    if (process.argv.length != 4) {
      console.log('Usage: gettrades exchange outfile');
      process.exit(1);
    }

    switch (process.argv[2].toLowerCase()) {

      case 'poloniex':
        break;

      default:
        console.log('Unknown Exchange');
        process.exit(1);
    }

    // Remove the old file
    await fs.remove(process.argv[3]);

    const markets = Object.keys(await poloniex.returnTicker());

    for (const market of markets) {

      console.log('\nCapturing Trades Data For Market: ', market);

      tradesMap.clear();
      await getTrades(market, moment('2016-01-01'), moment().startOf('day'));

      tradesMap.size ? await saveToCsv(Array.from(tradesMap.values()), market) : _.noop;
    }

  } catch (err) {
    console.log(new Error(err.message));
    process.exit(1);
  }

})();
