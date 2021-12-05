import {
  BeforeInsert,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn
} from "typeorm";
import { nanoid } from 'nanoid'

export class BaseTable {

    @PrimaryColumn("varchar", {
      length: 18
    })
    id: string;

    @CreateDateColumn()
    created: Date;

    @UpdateDateColumn()
    updated: Date;


    @BeforeInsert()
    beforeInsert() {
      // ---------------------------------------------------------------------------------
      // |  If you change this don't also forget to change the len of the PrimaryColumn  |
      // ---------------------------------------------------------------------------------
      this.id = nanoid(18)
    }

}
