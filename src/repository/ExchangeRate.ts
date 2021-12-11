import {
  EntityRepository,
  Repository
} from 'typeorm'
import {ExchangeRate} from '../entity/ExchangeRate'

@EntityRepository(ExchangeRate)
export class ExchangeRateRepository extends Repository<ExchangeRate> {}
