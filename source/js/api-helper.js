import get from "lodash/get";

import cryptoCurrencies from "../data/cryptocurrencies.json";
import settings from "../settings.json";
import utils from "./utils";

const CORSBlaster = "https://cors-anywhere.herokuapp.com/";

function getUserStocks() {
  return JSON.parse(localStorage.getItem("userStocks")) || [];
}

function setUserStocks(stocks) {
  localStorage.setItem("userStocks", JSON.stringify(stocks));
}

function getUserCurrency() {
  return localStorage.getItem("userCurrency") || "NOK";
}

function setUserCurrency(currency) {
  localStorage.clear();
  localStorage.setItem("userCurrency", currency);
  window.location.reload();
}

function getBackupData() {
  return JSON.stringify({
    userStocks: JSON.parse(localStorage.getItem("userStocks")),
    graphData: JSON.parse(localStorage.getItem("graphData"))
  });
}

function insertBackupData(data) {
  const newData = JSON.parse(data);

  Object.keys(newData).forEach(key => {
    localStorage.setItem(key, JSON.stringify(newData[key]));
  });

  window.location.reload();
}

function addGraphPoint(sum) {
  const points = JSON.parse(localStorage.getItem("graphData")) || [];
  const lastPoint = points[points.length - 1];
  const newPoint = {
    x: new Date(new Date().toDateString()).getTime(),
    y: parseFloat(sum.toFixed(2))
  };

  if (
    lastPoint &&
    new Date().getTime() - lastPoint.x < settings.graph.updateInterval
  ) {
    // Last point is newer than 24 hours. Update point
    points[points.length - 1] = Object.assign({}, newPoint);
  } else {
    // Last point is older than 24 hours or does not exist. Add new point
    points.push(newPoint);
  }

  if (sum) {
    localStorage.setItem("graphData", JSON.stringify(points));
  }
}

function getGraphPoints() {
  return JSON.parse(localStorage.getItem("graphData")) || [];
}

function getStoredData(key) {
  const data = JSON.parse(localStorage.getItem(key));

  if (data && new Date().getTime() - data.timeStamp < settings.storage.maxAge) {
    console.log(`Bruker lagret data for '${key}'`);
    return data;
  } else {
    return false;
  }
}

function storeData(key, data) {
  localStorage.setItem(
    key,
    JSON.stringify({
      data,
      timeStamp: new Date().getTime()
    })
  );
}

function getCurrencyData() {
  return new Promise((resolve, reject) => {
    fetch(
      `${CORSBlaster}https://openexchangerates.org/api/latest.json?app_id=4a4d89fbd62942c6ba24dbb60b7f67a0`
    )
      .then(response => response.json())
      .then(json => {
        storeData("currencies", json);
        resolve(json);
      })
      .catch(e => {
        console.log(e);
        reject("Klarte ikke å hente valuta");
      });
  });
}

function getHistoricalCurrencyData(date) {
  return new Promise((resolve, reject) => {
    fetch(
      `${CORSBlaster}https://openexchangerates.org/api/historical/${date}.json?app_id=4a4d89fbd62942c6ba24dbb60b7f67a0`
    )
      .then(response => response.json())
      .then(json => {
        resolve(json);
      })
      .catch(e => {
        console.log(e);
        reject("Klarte ikke å hente historiske valutadata");
      });
  });
}

function getCurrencies() {
  return new Promise((resolve, reject) => {
    const currencies = getStoredData("currencies");

    if (currencies && currencies.data) {
      resolve(currencies.data);
    } else {
      console.log("Henter nye valutadata");
      getCurrencyData()
        .then(currencyData => {
          resolve(currencyData);
        })
        .catch(e => {
          console.log(e);
          reject("Klarte ikke å hente ny valutadata.");
        });
    }
  });
}

function getStockData(symbol) {
  console.log(`Henter data for ${symbol}`);
  return fetch(
    `${CORSBlaster}https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol.toUpperCase()}?formatted=false&modules=price`,
    {
      headers: new Headers({
        "Content-Type": "application/json",
        Origin: "asbjorn.org"
      })
    }
  )
    .then(response => {
      if (response.ok) {
        return response.json();
      } else {
        throw new Error("Fant ikke aksje");
      }
    })
    .then(json => {
      const data = get(json, "quoteSummary.result[0]");

      if (data) {
        const longName =
          cryptoCurrencies[symbol] ||
          get(data, "price.longName") ||
          get(data, "price.shortName") ||
          get(data, "price.symbol");

        return {
          currency: get(data, "price.currency"),
          currencySymbol: get(data, "price.currencySymbol"),
          longName: longName.replace(/&amp;/g, "&"),
          price: get(data, "price.regularMarketPrice")
        };
      } else {
        throw new Error("Uforventet svarformat");
      }
    });
}

function hasStoredStocks() {
  return !!getUserStocks().length;
}

function getStocks() {
  return new Promise((resolve, reject) => {
    const userStocks = getUserStocks();
    const stocks = getStoredData("stocks");

    getCurrencies().then(currencies => {
      if (stocks && stocks.data && stocks.data.length >= userStocks.length) {
        const sum = utils.sumAndConvert(
          stocks.data,
          currencies,
          getUserCurrency()
        );
        addGraphPoint(sum);
        resolve({
          lastUpdated: stocks.timeStamp,
          stocks: stocks.data.filter(({ id }) => {
            return !!userStocks.find(stock => stock.id === id);
          }),
          sum
        });
      } else {
        console.log("Henter nye aksjedata");
        Promise.all(userStocks.map(stock => getStockData(stock.symbol)))
          .then(stockData => {
            // Merge userStocks data and stockData
            const stocks = userStocks.map((stock, index) =>
              Object.assign({}, stock, stockData[index])
            );

            const sum = utils.sumAndConvert(
              stocks,
              currencies,
              getUserCurrency()
            );
            storeData("stocks", stocks);
            addGraphPoint(sum);
            resolve({
              stocks,
              lastUpdated: new Date().getTime(),
              sum
            });
          })
          .catch(e => {
            console.log(e);
            reject("Klarte ikke å hente nye aksjedata");
          });
      }
    });
  });
}

function getPurchaseRate(stock, stockCurrency) {
  return new Promise(resolve => {
    if (stock.purchaseRate) {
      resolve(stock.purchaseRate);
    } else {
      getHistoricalCurrencyData(
        stock.purchaseDate
      ).then(historicalCurrencies => {
        resolve(
          utils.convert(
            stock.purchasePrice / stock.qty,
            getUserCurrency(),
            stockCurrency,
            historicalCurrencies
          )
        );
      });
    }
  });
}

function addStock(formData) {
  return new Promise((resolve, reject) => {
    getStockData(formData.symbol)
      .then(stockData => {
        // Get exchange rate at time of purchase
        getPurchaseRate(formData, stockData.currency)
          .then(purchaseRate => {
            const newStock = {
              id: String(new Date().getTime()),
              symbol: formData.symbol,
              qty: parseInt(formData.qty),
              purchasePrice: parseFloat(formData.purchasePrice),
              purchaseRate: parseFloat(purchaseRate)
            };

            const userStocksList = getUserStocks();
            setUserStocks(userStocksList.concat(newStock));

            getStocks()
              .then(({ stocks, lastUpdated, sum }) => {
                resolve({ stocks, lastUpdated, sum });
              })
              .catch(e => {
                console.log(e);
                reject("Klarte ikke å hente aksjedata");
              });
          })
          .catch(e => {
            console.log(e);
            reject("Klarte ikke å finne valutakurs ved kjøp");
          });
      })
      .catch(e => {
        console.log(e);
        reject("Fant ikke aksje");
      });
  });
}

function deleteStock(id) {
  return new Promise(resolve => {
    const userStocksList = getUserStocks();
    setUserStocks(userStocksList.filter(stock => stock.id !== id));
    const stocks = getStoredData("stocks");
    storeData("stocks", stocks.data.filter(stock => stock.id !== id));

    getStocks().then(({ stocks, sum }) => {
      resolve({ stocks, sum });
    });
  });
}

function deleteAllData() {
  localStorage.clear();
  window.location.reload();
}

export default {
  addStock,
  deleteAllData,
  deleteStock,
  getBackupData,
  getCurrencies,
  getGraphPoints,
  getStocks,
  getUserCurrency,
  hasStoredStocks,
  insertBackupData,
  setUserCurrency
};
