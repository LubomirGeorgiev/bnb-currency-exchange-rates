import {
  EntityRepository,
  Repository
} from 'typeorm'
import { ExchangeRate } from '../entity/ExchangeRate'

@EntityRepository(ExchangeRate)
export class ExchangeRateRepository extends Repository<ExchangeRate> {
  ALIAS = 'r'

  async getUniqueIsoCodes() {
    return this.createQueryBuilder(this.ALIAS)
      .select('DISTINCT ("isoCode")')
      .getRawMany()
  }

  async getCountByIsoCode(isoCode: string) {
    return this.createQueryBuilder(this.ALIAS)
      .where(`${this.ALIAS}.isoCode = :isoCode`, {
        isoCode: isoCode
      })
      .orderBy(`${this.ALIAS}.date`, 'ASC')
      .getCount()
  }

  async getByDate() {
    return this.createQueryBuilder(this.ALIAS)
      .orderBy(`${this.ALIAS}.date`, 'ASC')
      .getMany()
  }
}
