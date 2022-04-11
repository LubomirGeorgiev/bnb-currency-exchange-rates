process.env.TZ = 'UTC'
import 'reflect-metadata'
import 'dotenv-defaults/config'
import ExchangeRateController from './controllers/ExchangeRateController'

new ExchangeRateController().init()
