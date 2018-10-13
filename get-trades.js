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
const _ = require("lodash");
const assert = require('assert');
var fs = require('fs-extra');
const Json2csvParser = require('json2csv').Parser;
const json2csvParser = new Json2csvParser({ header: false });
const Poloniex = require('poloniex-api-node');
let poloniex = new Poloniex(process.env.POLONIEX_API_KEY, process.env.POLONIEX_API_SECRET, { socketTimeout: 60000 });
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
const filename = process.argv[2];
const saveToCsv = (trades, market) => __awaiter(this, void 0, void 0, function* () {
    try {
        const data = trades.map(trade => (Object.assign({ market }, trade)));
        const csvTrades = json2csvParser.parse(data);
        yield fs.outputFile(filename, csvTrades, { 'flag': 'a' });
        yield fs.outputFile(filename, '\r', { 'flag': 'a' });
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
        yield timer(150);
        process.stdout.write('.');
        const trades = yield getTradeHistory(market, startRange.unix(), endRange.unix(), 10000);
        console.log({ trades });
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
            yield getTrades(market, moment(sortedTrades[0].date), endRange);
            yield getTrades(market, startRange, moment(sortedTrades[sortedTrades.length - 1].date));
        }
    }
    catch (err) {
        console.log(new Error(err.message));
    }
});
(() => __awaiter(this, void 0, void 0, function* () {
    try {
        if (process.argv.length != 3) {
            console.log('Usage: gettrades outfile');
            process.exit(1);
        }
        yield fs.remove(process.argv[2]);
        const markets = Object.keys(yield poloniex.returnTicker());
        for (const market of markets) {
            console.log('\nCapturing Trades Data For Market: ', market);
            tradesMap.clear();
            yield getTrades(market, moment(startOfEpoch), moment().startOf('day'));
            tradesMap.size ? yield saveToCsv(Array.from(tradesMap.values()), market) : _.noop;
        }
        process.exit(0);
    }
    catch (err) {
        console.log(new Error(err.message));
        process.exit(1);
    }
}))();
