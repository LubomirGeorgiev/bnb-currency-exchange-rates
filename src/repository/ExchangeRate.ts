import {
  EntityRepository,
  Repository
} from 'typeorm'
import { ExchangeRate } from '../entity/ExchangeRate'

@EntityRepository(ExchangeRate)
export class ExchangeRateRepository extends Repository<ExchangeRate> {
  ALIAS = 'r'

  createQuery() {
    return this.createQueryBuilder(this.ALIAS)
  }

  async getUniqueIsoCodes() {
    return this.createQuery()
      .select('DISTINCT ("isoCode")')
      .getRawMany()
  }

  async getCountByIsoCode(isoCode: string) {
    return this.createQuery()
      .where(`${this.ALIAS}.isoCode = :isoCode`, {
        isoCode: isoCode
      })
      .orderBy(`${this.ALIAS}.date`, 'ASC')
      .getCount()
  }

  async getByDate() {
    return this.createQuery()
      .orderBy(`${this.ALIAS}.date`, 'ASC')
      .getMany()
  }
}
