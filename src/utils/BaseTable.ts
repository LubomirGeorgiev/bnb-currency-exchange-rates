import {
  BeforeInsert,
  PrimaryColumn,
  CreateDateColumn,
} from 'typeorm'
import { nanoid } from 'nanoid'

const IDLength = 20

export class BaseTable {

    @PrimaryColumn('varchar', {
      length: IDLength
    })
      id: string

    @CreateDateColumn()
      created: Date

    @BeforeInsert()
    beforeInsert() {
      this.id = nanoid(IDLength)
    }

}
