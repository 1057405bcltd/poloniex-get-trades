#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const moment = require("moment");
const assert = require("assert");
const fs = require("fs-extra");
const debug = require("debug")("debug");
const Poloniex = require("poloniex-api-node");
const poloniex = new Poloniex(process.env.POLONIEX_API_KEY, process.env.POLONIEX_API_SECRET, {
    socketTimeout: 15000,
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
const getTrades = async (market, startRange, endRange) => {
    try {
        await timer(150);
        const trades = await getTradeHistory(market, startRange.unix(), endRange.unix(), 10000);
        debug({ market, length: trades.length, startRange, endRange });
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
                await fs.outputFile(`./trades/${market}.csv`, Object.values(trade).join() + "\n", { flag: "a" });
            }
            if (trades.length > 0) {
                console.log(`Captured ${trades.length} Trades, Market: ${market}, Range: ${startRange} -> ${endRange}`);
            }
        }
    }
    catch (err) {
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
        await fs.remove("./trades");
        const markets = Object.keys(await poloniex.returnTicker());
        for (const market of ["BTC_DAO"]) {
            console.log("Capturing Trades Data For Market: ", market);
            await fs.outputFile(`./trades/${market}.csv`, Object.keys(referenceTrade).join() + "\n", { flag: "a" });
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
