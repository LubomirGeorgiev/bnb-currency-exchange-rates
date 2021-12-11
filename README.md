# Official exchange rates of the Bulgarian National Bank

[![Bulgarian National Bank - Official Currency Exchange Rates](https://github.com/LubomirGeorgiev/bnb-currency-exchange-rates/actions/workflows/update-rates.yml/badge.svg?branch=main)](https://github.com/LubomirGeorgiev/bnb-currency-exchange-rates/actions/workflows/update-rates.yml)

All exchange rates in the dataset are based on **Bulgarian Lev/BGN/Български лев** and are set as official rates by the [**Bulgarian National Bank**](https://www.bnb.bg/Statistics/StExternalSector/StExchangeRates/StERForeignCurrencies/index.htm?toLang=_EN).

This repository utilizes the [**schedule**](https://docs.github.com/en/actions/reference/events-that-trigger-workflows) function of Github Actions in order to update the dataset through a continuously running cronjob.

# Available data

[**SQLite Database**](https://github.com/LubomirGeorgiev/bnb-currency-exchange-rates/blob/main/data/data.db)

<!-- START LINKS (DO NOT EVER FU*ING DELETE THIS COMMENT FOR THE LOVE OF YOUR LIFE!!! IF YOU ARE CURIOS HOW IT WORKS, YOU CAN HAVE A LOOK AT ./src/updateReadme.ts) -->

Last Update: Dec 11, 2021, 4:48:01 AM GMT+2 _(2021-12-11T02:48:01.314Z)_

| Currency (ISO Code) | Number of records |
| :-----------------: | :---------------: |

<!-- END LINKS (DO NOT EVER FU*ING DELETE THIS COMMENT FOR THE LOVE OF YOUR LIFE!!! IF YOU ARE CURIOS HOW IT WORKS, YOU CAN HAVE A LOOK AT ./src/updateReadme.ts) -->

# How to configure

The default configuration is available in [.env.defaults](.env.defaults).
If you want to overwrite any of the properties in the default configuration in you create `.env` in the root directory.

# How to use

1. `npm install`
2. `npm run start` - This will update the SQLite database file ([`data/data.db`](data/rates.db))

# How to generate DB migrations

```
npm run typeorm migration:generate -- -n migrationNameHere
```
