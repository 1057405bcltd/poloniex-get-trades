#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const moment = require("moment");
const assert = require("assert");
const fs = require("fs-extra");
const Json2csvParser = require("json2csv").Parser;
const json2csvParser = new Json2csvParser({ header: false });
const debug = require("debug")("debug");
const Poloniex = require("poloniex-api-node");
const poloniex = new Poloniex(process.env.POLONIEX_API_KEY, process.env.POLONIEX_API_SECRET, {
    socketTimeout: 60000,
});
const timer = (timeout) => new Promise((resolve, reject) => {
    try {
        setTimeout(resolve, timeout, null);
    }
    catch (err) {
        reject(err);
    }
});
const startOfEpoch = "2016-01-01";
console.log("Start of Epoch: ", startOfEpoch);
const saveToCsv = async (trades, market) => {
    try {
        for (const trade of trades) {
            await fs.outputFile("trades.csv", Object.values(trade).join() + "\n", { flag: "a" });
        }
        console.log(`\n${market} Trades Saved: ${trades.length}`);
    }
    catch (err) {
        console.error(err);
        process.exit(1);
    }
};
const getTradeHistory = async (market, start, end, limit) => {
    while (true) {
        try {
            const trades = await poloniex.returnMyTradeHistory(market, start, end, limit);
            return trades;
        }
        catch (err) {
            console.log(`${err.message}...retrying`);
            await timer(200);
        }
    }
};
const tradesMap = new Map();
const getTrades = async (market, startRange, endRange) => {
    try {
        debug({ startRange, endRange });
        await timer(150);
        const trades = await getTradeHistory(market, startRange.unix(), endRange.unix(), 10000);
        debug({ length: trades.length });
        if (trades.length === 10000) {
            const midRange = startRange.clone().add(Math.floor(endRange.diff(startRange) / 2));
            await getTrades(market, startRange, midRange);
            await getTrades(market, midRange.clone().add(1, "seconds"), endRange);
        }
        else {
            const sortedTrades = trades.sort((a, b) => {
                if (moment(a.date) > moment(b.date)) {
                    return 1;
                }
                else if (moment(a.date) < moment(b.date)) {
                    return -1;
                }
                else {
                    return 0;
                }
            });
            for (const trade of sortedTrades) {
                await fs.outputFile(`./trades-${market}.csv`, Object.values(Object.assign({ market }, trade)).join() + "\n", { flag: "a" });
            }
        }
    }
    catch (err) {
        console.log(new Error(err.message));
        process.exit(1);
    }
};
(async () => {
    try {
        await fs.remove("./trades");
        const junkTime = moment();
        console.log(junkTime);
        console.log(junkTime.clone().add(1, "seconds"));
        process.exit(0);
        const markets = Object.keys(await poloniex.returnTicker());
        for (const market of markets) {
            console.log("\nCapturing Trades Data For Market: ", market);
            tradesMap.clear();
            await getTrades(market, moment(startOfEpoch), moment().startOf("day"));
        }
        console.log("That's All Folks");
        process.exit(0);
    }
    catch (err) {
        console.log(new Error(err.message));
        process.exit(1);
    }
})();
