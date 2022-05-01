import {
  EntityRepository,
  Repository,
} from 'typeorm'
import { ExchangeRate } from '../entity/ExchangeRate'
import { format } from 'date-fns'

type GetByDateParams = {
  startDate?: Date,
  endDate?: Date,
}

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

  async getByDateRange({
    startDate,
    endDate,
  }: GetByDateParams = {}) {
    const query = this.createQuery()
      .orderBy(`${this.ALIAS}.date`, 'ASC')

    if (startDate && endDate) {
      query.andWhere(`${this.ALIAS}.date BETWEEN :startDate AND :endDate`, {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      })
    }

    return query.getMany()
  }

  async getByDate(date: Date) {
    const query = this.createQuery()
      .orderBy(`${this.ALIAS}.date`, 'ASC')

    if (date) {
      query.andWhere(`date(${this.ALIAS}.date) = :date`, {
        date: format(date, 'yyyy-MM-dd')
      })
    }

    return query.getOneOrFail()
  }
}
