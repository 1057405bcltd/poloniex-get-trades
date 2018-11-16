#!/usr/bin/env node

import * as moment from "moment";
import * as _ from "lodash";
const assert = require("assert");
const fs = require("fs-extra");
const Json2csvParser = require("json2csv").Parser;
const json2csvParser = new Json2csvParser({ header: false });

const Poloniex = require("poloniex-api-node");
const poloniex = new Poloniex(
  process.env.POLONIEX_API_KEY,
  process.env.POLONIEX_API_SECRET,
  {
    socketTimeout: 60000,
  },
);

const timer = (timeout) => new Promise((resolve, reject) => {
  try {
    setTimeout(resolve, timeout, null);
  } catch (err) {
    reject(err);
  }
});

const startOfEpoch = "2016-01-01";

interface IPoloniexTrade {
  globalTradeID: string;
  date: string;
}

console.log("Start of Epoch: ", startOfEpoch);

const saveToCsv = async (trades: object[], market: string) => {

  try {

    for (const trade of trades.values()) {

      // Prepend market to all records
      const data = { market, ...trade };

      const csvTrade = json2csvParser.parse(data);
      console.log({ saving: csvTrade });

      await fs.outputFile("trades.csv", csvTrade, { flag: "a" });
      await fs.outputFile("trades.csv", "\r", { flag: "a" });

    }

    console.log(`\n${market} Trades Saved: ${trades.length}`);

  } catch (err) {
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
        limit) as IPoloniexTrade[];

      return trades;
    }

    catch (err) {

      console.log(`${err.message}...retrying`);
      await timer(200);
    }
  }
}

const tradesMap = new Map();

/*

The function getTrades (market, start, end) is recursive as follows.
If the call to getTradeHistory() returns 10000 records (the maximum possible),
then getTrades recursively calls itself twice, like so:

• getTrades (market, start, midPoint);
• getTrades (market, midPoint, end);

Some overlap of returns is expected, as duplicates are handled by tradesMap,
a Javascript Mao.

*/

const getTrades = async (market: string, startRange, endRange) => {

  try {

    await timer(150);

    const trades = await getTradeHistory(
      market,
      startRange.unix(),
      endRange.unix(),
      10000) as IPoloniexTrade[];

    console.log({ trades });

    const sortedTrades = trades.sort((a, b) => {

      if (moment(a.date) > moment(b.date)) {
        return -1;
      } else if (moment(a.date) < moment(b.date)) {
        return 1;
      } else {
        return 0;
      }
    }) as IPoloniexTrade[];

    for (const trade of sortedTrades) {

      tradesMap.set(trade.globalTradeID, trade);
    }

    if (trades.length === 10000) {

      console.log('Split');
      await getTrades(market, moment(sortedTrades[0].date), endRange);
      await getTrades(market, startRange, moment(sortedTrades[sortedTrades.length - 1].date));
    }

  } catch (err) {
    console.log(new Error(err.message));
  }
}

(async () => {

  try {

    // Remove the old file
    await fs.remove("trades.csv");

    const markets = Object.keys(await poloniex.returnTicker());

    for (const market of markets) {

      console.log("\nCapturing Trades Data For Market: ", market);

      tradesMap.clear();
      await getTrades(market, moment(startOfEpoch), moment().startOf("day"));

      if (tradesMap.size) {
        console.log(`Converting ${tradesMap.size} ${market} Trades to CSV`);
        await saveToCsv(Array.from(tradesMap.values()), market);
      }
    }

    process.exit(0);

  } catch (err) {
    console.log(new Error(err.message));
    process.exit(1);
  }

})();
