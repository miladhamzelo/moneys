import get from "lodash/get";

import config from "../../config.json";
import cryptoCurrencies from "../data/cryptocurrencies.json";
import storage from "./storage-helper";
import utils from "./utils";

const fuckYouCORS = "https://cors-anywhere.herokuapp.com/";

// function getFromApi(url) {
//   return new Promise(resolve => {
//     fetch(url)
//       .then(response => response.json())
//       .then(json => {
//         if (json.success) {
//           resolve(json.payload);
//         } else {
//           throw new Error("Bad response from API");
//         }
//       });
//   });
// }

let currencyNames = [];
function getCurrencyNames() {
  return new Promise(resolve => {
    if (currencyNames.length) {
      resolve(currencyNames);
    } else {
      fetch(`${fuckYouCORS}https://api.coinbase.com/v2/currencies`)
        .then(response => response.json())
        .then(json => {
          currencyNames = json.data;
          resolve(currencyNames);
        });
    }
  });
}

function getCurrencies() {
  const storedCurrencies = storage.getStoredData("currencies");

  return new Promise(resolve => {
    fetch("https://api.coinbase.com/v2/exchange-rates")
      .then(response => {
        if (response.ok) {
          return response.json();
        } else {
          resolve(storedCurrencies.data);
        }
      })
      .then(currencies => {
        if (currencies) {
          storage.storeData("currencies", currencies.data.rates);
          resolve(currencies.data.rates);
        }
      })
      .catch(e => {
        console.log(e);
        resolve(storedCurrencies.data);
      });
  });
}

function getHistoricalCurrencyData(date) {
  return new Promise((resolve, reject) => {
    fetch(
      `${fuckYouCORS}https://openexchangerates.org/api/historical/${
        date
      }.json?app_id=${config.openExchangeRatesAppId}`,
      {
        headers: new Headers({
          "Content-Type": "application/json",
          Origin: window.location
        })
      }
    )
      .then(response => response.json())
      .then(json => {
        resolve(json.rates);
      })
      .catch(e => {
        console.log(e);
        reject("Failed to get historical currency data");
      });
  });
}

function getStock({ symbol, type, intermediateCurrency }, storedStock) {
  if (type && type.toLowerCase() === "currency") {
    return getCurrencyPair(
      symbol,
      intermediateCurrency || storage.getUserCurrency(),
      storedStock
    );
  } else {
    return getStockData(symbol, storedStock);
  }
}

function getCurrencyPair(fromCurrency, toCurrency, storedStock) {
  return new Promise(resolve => {
    function resolveWithBackup() {
      if (storedStock) {
        return resolve(
          Object.assign({}, storedStock, {
            isOutdated: true
          })
        );
      } else {
        throw new Error("Failed to get stock data");
      }
    }

    fetch(
      `https://api.coinbase.com/v2/prices/${fromCurrency}-${toCurrency}/spot`,
      {
        headers: new Headers({
          "CB-VERSION": "2017-12-01"
        })
      }
    )
      .then(response => {
        if (response.ok) {
          return response.json();
        } else {
          resolveWithBackup();
        }
      })
      .then(json => {
        getCurrencyNames().then(currencyNames => {
          resolve({
            currency: toCurrency,
            longName: get(
              currencyNames.find(
                currencyName => currencyName.id === fromCurrency
              ),
              "name",
              cryptoCurrencies[fromCurrency]
            ),
            price: parseFloat(get(json, "data.amount", 0))
          });
        });
      })
      .catch(e => {
        console.log(e);
        resolveWithBackup();
      });
  });
}

function getStockData(symbol, storedStock) {
  console.log(`Getting data for ${symbol}`);
  return new Promise(resolve => {
    function resolveWithBackup() {
      if (storedStock) {
        return resolve(
          Object.assign({}, storedStock, {
            isOutdated: true
          })
        );
      } else {
        throw new Error("Failed to get stock data");
      }
    }

    fetch(
      `${
        fuckYouCORS
      }https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol.toUpperCase()}?formatted=false&modules=price`,
      {
        headers: new Headers({
          "Content-Type": "application/json",
          Origin: window.location
        })
      }
    )
      .then(response => {
        if (response.ok) {
          return response.json();
        } else {
          resolveWithBackup();
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

          resolve({
            currency: get(data, "price.currency"),
            currencySymbol: get(data, "price.currencySymbol"),
            longName: longName.replace(/&amp;/g, "&"),
            price: get(data, "price.regularMarketPrice")
          });
        } else {
          resolveWithBackup();
        }
      })
      .catch(e => {
        console.log(e);
        resolveWithBackup();
      });
  });
}

function hasStoredStocks() {
  return !!storage.getUserStocks().length;
}

function getData() {
  return new Promise((resolve, reject) => {
    const userStocks = storage.getUserStocks();
    const storedStocks = storage.getStoredData("stocks");

    getCurrencies().then(currencies => {
      if (
        storedStocks &&
        !storedStocks.isOutdated &&
        storedStocks.data &&
        storedStocks.data.length >= userStocks.length
      ) {
        const sum = utils.sumAndConvert(
          storedStocks.data,
          currencies,
          storage.getUserCurrency()
        );
        storage.addGraphPoint(sum.difference);
        resolve({
          lastUpdated: storedStocks.timeStamp,
          stocks: storedStocks.data,
          sum,
          graphData: storage.getGraphPoints()
        });
      } else {
        console.log("Getting new stock data");
        Promise.all(
          userStocks.map(stock => {
            if (!stock.isRealized) {
              return getStock(
                stock,
                get(storedStocks, "data", []).find(
                  storedStock => storedStock.id === stock.id
                )
              );
            } else {
              return new Promise(resolve => {
                resolve(stock);
              });
            }
          })
        )
          .then(stockData => {
            // Merge userStocks data and stockData
            const stocks = userStocks.map((stock, index) =>
              Object.assign({}, stock, stockData[index])
            );

            const sum = utils.sumAndConvert(
              stocks,
              currencies,
              storage.getUserCurrency()
            );
            storage.storeData("stocks", stocks);
            storage.addGraphPoint(sum.difference);
            resolve({
              stocks,
              lastUpdated: new Date().getTime(),
              sum,
              graphData: storage.getGraphPoints()
            });
          })
          .catch(e => {
            console.log(e);
            reject("Failed to get new stock data");
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
      getHistoricalCurrencyData(stock.purchaseDate).then(
        historicalCurrencies => {
          resolve(
            utils.convert(
              parseFloat(stock.purchasePrice) / parseFloat(stock.qty),
              storage.getUserCurrency(),
              stockCurrency,
              historicalCurrencies
            )
          );
        }
      );
    }
  });
}

function addStock(formData) {
  return new Promise((resolve, reject) => {
    getStock(formData)
      .then(stockData => {
        // Get exchange rate at time of purchase
        getPurchaseRate(formData, stockData.currency)
          .then(purchaseRate => {
            const newStock = {
              id: String(new Date().getTime()),
              intermediateCurrency: formData.intermediateCurrency,
              purchasePrice: parseFloat(formData.purchasePrice),
              purchaseRate: parseFloat(purchaseRate),
              qty: parseFloat(formData.qty),
              symbol: formData.symbol,
              type: formData.type.toLowerCase()
            };

            const userStocks = storage.getUserStocks();
            storage.setUserStocks(userStocks.concat(newStock));

            getData()
              .then(({ stocks, lastUpdated, sum, graphData }) => {
                resolve({
                  stocks,
                  lastUpdated,
                  sum,
                  graphData
                });
              })
              .catch(e => {
                console.log(e);
                reject("Failed to get new stock data");
              });
          })
          .catch(e => {
            console.log(e);
            reject("Failed to get exchange rate at purchase date");
          });
      })
      .catch(e => {
        console.log(e);
        reject("Stock not found");
      });
  });
}

function deleteStock(id) {
  return new Promise(resolve => {
    const userStocks = storage.getUserStocks();
    storage.setUserStocks(userStocks.filter(stock => stock.id !== id));
    const stocks = storage.getStoredData("stocks");
    storage.storeData("stocks", stocks.data.filter(stock => stock.id !== id));

    getData().then(({ stocks, sum, lastUpdated, graphData }) => {
      resolve({ stocks, sum, lastUpdated, graphData });
    });
  });
}

function realizeStock(id, sellPrice) {
  return new Promise(resolve => {
    const userStocks = storage.getUserStocks();
    const realizedStock = userStocks.find(stock => stock.id === id);
    realizedStock.isRealized = true;
    realizedStock.sellPrice = sellPrice;
    realizedStock.sellDate = new Date().getTime();
    storage.setUserStocks(userStocks);

    getData().then(({ stocks, sum, lastUpdated, graphData }) => {
      resolve({ stocks, sum, lastUpdated, graphData });
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
  getCurrencies,
  getData,
  hasStoredStocks,
  realizeStock
};
