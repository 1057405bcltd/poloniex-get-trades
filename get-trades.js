#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const moment = require("moment");
const assert = require("assert");
const fs = require("fs-extra");
const Json2csvParser = require("json2csv").Parser;
const json2csvParser = new Json2csvParser({ header: false });
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
const saveToCsv = (trades, market) => __awaiter(this, void 0, void 0, function* () {
    try {
        for (const trade of trades) {
            const data = Object.assign({ market }, trade);
            const csvTrade = json2csvParser.parse(data);
            console.log({ saving: csvTrade });
            yield fs.outputFile("trades.csv", csvTrade, { flag: "a" });
            yield fs.outputFile("trades.csv", "\r", { flag: "a" });
        }
        console.log(`\n${market} Trades Saved: ${trades.length}`);
    }
    catch (err) {
        console.error(err);
        process.exit(1);
    }
});
const getTradeHistory = (market, start, end, limit) => __awaiter(this, void 0, void 0, function* () {
    while (true) {
        try {
            const trades = yield poloniex.returnMyTradeHistory(market, start, end, limit);
            return trades;
        }
        catch (err) {
            console.log(`${err.message}...retrying`);
            yield timer(200);
        }
    }
});
const tradesMap = new Map();
const getTrades = (market, startRange, endRange) => __awaiter(this, void 0, void 0, function* () {
    try {
        console.log({ startRange, endRange });
        yield timer(150);
        const trades = yield getTradeHistory(market, startRange.unix(), endRange.unix(), 10000);
        console.log({ length: trades.length });
        const sortedTrades = trades.sort((a, b) => {
            if (moment(a.date) > moment(b.date)) {
                return -1;
            }
            else if (moment(a.date) < moment(b.date)) {
                return 1;
            }
            else {
                return 0;
            }
        });
        for (const trade of sortedTrades) {
            tradesMap.set(trade.globalTradeID, trade);
        }
        if (trades.length === 10000) {
            const midRange = startRange.clone().add(1, "days");
            console.log({ stuff: Math.floor(endRange.diff(startRange, "days") / 2) });
            console.log({ startRange, midRange, endRange });
            process.exit(1);
            yield getTrades(market, startRange, midRange);
            yield getTrades(market, midRange, endRange);
        }
    }
    catch (err) {
        console.log(new Error(err.message));
        process.exit(1);
    }
});
(() => __awaiter(this, void 0, void 0, function* () {
    try {
        yield fs.remove("trades.csv");
        const markets = Object.keys(yield poloniex.returnTicker());
        for (const market of markets) {
            console.log("\nCapturing Trades Data For Market: ", market);
            tradesMap.clear();
            yield getTrades(market, moment(startOfEpoch), moment().startOf("day"));
            if (tradesMap.size) {
                console.log(`Converting ${tradesMap.size} ${market} Trades to CSV`);
                yield saveToCsv(Array.from(tradesMap.values()), market);
            }
        }
        process.exit(0);
    }
    catch (err) {
        console.log(new Error(err.message));
        process.exit(1);
    }
}))();
