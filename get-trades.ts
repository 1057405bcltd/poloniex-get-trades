#!/usr/bin/env node

import * as moment from "moment";
import * as _ from "lodash";
import { constants } from "http2";
const assert = require("assert");
const fs = require("fs-extra");
const Json2csvParser = require("json2csv").Parser;
const json2csvParser = new Json2csvParser({ header: false });
const debug = require("debug")("debug");
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

const getTradeHistory = async (market, start, end, limit) => {

  while (true) {

    try {

      const trades = await poloniex.returnMyTradeHistory(
        market,
        start,
        end,
        limit) as IPoloniexTrade[];

      return trades;

    } catch (err) {

      console.log(`${err.message}...retrying`);
      await timer(200);
    }
  }
};

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

const getTrades = async (market: string, startRange: moment.Moment, endRange: moment.Moment) => {

  try {

    debug({ startRange, endRange });

    await timer(150);

    const trades = await getTradeHistory(
      market,
      startRange.unix(),
      endRange.unix(),
      10000) as IPoloniexTrade[];

    debug({ length: trades.length });

    if (trades.length === 10000) {

      const midRange = startRange.clone().add(Math.floor(endRange.diff(startRange) / 2));

      await getTrades(market, startRange, midRange);

      // Ensure no overlap by adding 1 second to the start range
      await getTrades(market, midRange.clone().add(1, "seconds"), endRange);

    } else {

      const sortedTrades = trades.sort((a, b) => {

        if (moment(a.date) > moment(b.date)) {
          return 1;
        } else if (moment(a.date) < moment(b.date)) {
          return -1;
        } else {
          return 0;
        }
      }) as IPoloniexTrade[];

      for (const trade of sortedTrades) {

        await fs.outputFile(
          `./trades/${market}.csv`,
          Object.values({ market, ...trade }).join() + "\n",
          { flag: "a" },
        );

        console.log({ trade });

        process.exit(1);
      }
    }
  } catch (err) {

    console.log(new Error(err.message));
    process.exit(1);
  }
};

const referenceTrade = {
  globalTradeID: 48401099,
  tradeID: "1556039",
  date: "2016-08-12 19:06:00",
  rate: "0.02019039",
  amount: "8.50297500",
  total: "0.17167838",
  fee: "0.00000000",
  orderNumber: "20456928618",
  type: "buy",
  category: "exchange",
};

(async () => {

  try {

    // Remove data from a previous run
    await fs.remove("./trades");

    const markets = Object.keys(await poloniex.returnTicker());

    for (const market of markets) {

      console.log("\nCapturing Trades Data For Market: ", market);

      await fs.outputFile(
        `./trades/${market}.csv`,
        Object.keys({ market, ...referenceTrade }).join() + "\n",
        { flag: "a" },
      );

      process.exit(1);

      tradesMap.clear();
      await getTrades(market, moment(startOfEpoch), moment().startOf("day"));

    }
    console.log("That's All Folks");
    process.exit(0);

  } catch (err) {
    console.log(new Error(err.message));
    process.exit(1);
  }

})();
