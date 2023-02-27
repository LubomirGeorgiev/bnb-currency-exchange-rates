# Official exchange rates of the Bulgarian National Bank

[![Bulgarian National Bank - Official Currency Exchange Rates](https://github.com/LubomirGeorgiev/bnb-currency-exchange-rates/actions/workflows/update-rates.yml/badge.svg?branch=main)](https://github.com/LubomirGeorgiev/bnb-currency-exchange-rates/actions/workflows/update-rates.yml)

All exchange rates in the dataset are based on **Bulgarian Lev/BGN/Български лев** and are set as official rates by the [**Bulgarian National Bank**](https://www.bnb.bg/Statistics/StExternalSector/StExchangeRates/StERForeignCurrencies/index.htm?toLang=_EN).

This repository utilizes the [**schedule**](https://docs.github.com/en/actions/reference/events-that-trigger-workflows) function of Github Actions in order to update the dataset through a continuously running cronjob.

# Available data

[**Download SQLite Database**](https://github.com/LubomirGeorgiev/bnb-currency-exchange-rates/raw/main/data/rates.db)

<!-- START LINKS (DO NOT EVER FU*ING DELETE THIS COMMENT FOR THE LOVE OF YOUR LIFE!!! IF YOU ARE CURIOS HOW IT WORKS, YOU CAN HAVE A LOOK AT ./src/updateReadme.ts) -->

Last Update: Feb 27, 2023, 4:05:55 PM GMT+0 _(2023-02-27T16:05:55.047Z)_

| Currency (ISO Code) | Number of records |
| :-----------------: | :---------------: |
|         USD         |       1151        |

<!-- END LINKS (DO NOT EVER FU*ING DELETE THIS COMMENT FOR THE LOVE OF YOUR LIFE!!! IF YOU ARE CURIOS HOW IT WORKS, YOU CAN HAVE A LOOK AT ./src/updateReadme.ts) -->

# How to configure

The default configuration is available in [.env.defaults](.env.defaults).
If you want to overwrite any of the properties in the default configuration in you create `.env` in the root directory and then follow the steps from the [How to use](#how-to-use) section

# How to use

1. `npm install`
2. `npm run start` - This will update the SQLite database file ([`data/data.db`](data/rates.db))

# How to generate DB migrations

```
npm run typeorm migration:generate -- -n migrationNameHere
```

# Generate tax return from an Etoro account statement

```
npm run start -- gen-tax -f report.xlsx
```
