import {MigrationInterface, QueryRunner} from "typeorm";

export class dropReverseRateAndAddDate1638751540143 implements MigrationInterface {
    name = 'dropReverseRateAndAddDate1638751540143'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "temporary_exchange_rate" ("id" varchar(18) PRIMARY KEY NOT NULL, "created" datetime NOT NULL DEFAULT (datetime('now')), "updated" datetime NOT NULL DEFAULT (datetime('now')), "isoCode" varchar(3) NOT NULL, "rate" decimal NOT NULL, "date" decimal NOT NULL, "wasMissing" boolean NOT NULL DEFAULT (0))`);
        await queryRunner.query(`INSERT INTO "temporary_exchange_rate"("id", "created", "updated", "isoCode", "rate", "date", "wasMissing") SELECT "id", "created", "updated", "isoCode", "rate", "reverseRate", "wasMissing" FROM "exchange_rate"`);
        await queryRunner.query(`DROP TABLE "exchange_rate"`);
        await queryRunner.query(`ALTER TABLE "temporary_exchange_rate" RENAME TO "exchange_rate"`);
        await queryRunner.query(`CREATE TABLE "temporary_exchange_rate" ("id" varchar(18) PRIMARY KEY NOT NULL, "created" datetime NOT NULL DEFAULT (datetime('now')), "updated" datetime NOT NULL DEFAULT (datetime('now')), "isoCode" varchar(3) NOT NULL, "rate" decimal NOT NULL, "date" date NOT NULL, "wasMissing" boolean NOT NULL DEFAULT (0))`);
        await queryRunner.query(`INSERT INTO "temporary_exchange_rate"("id", "created", "updated", "isoCode", "rate", "date", "wasMissing") SELECT "id", "created", "updated", "isoCode", "rate", "date", "wasMissing" FROM "exchange_rate"`);
        await queryRunner.query(`DROP TABLE "exchange_rate"`);
        await queryRunner.query(`ALTER TABLE "temporary_exchange_rate" RENAME TO "exchange_rate"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "exchange_rate" RENAME TO "temporary_exchange_rate"`);
        await queryRunner.query(`CREATE TABLE "exchange_rate" ("id" varchar(18) PRIMARY KEY NOT NULL, "created" datetime NOT NULL DEFAULT (datetime('now')), "updated" datetime NOT NULL DEFAULT (datetime('now')), "isoCode" varchar(3) NOT NULL, "rate" decimal NOT NULL, "date" decimal NOT NULL, "wasMissing" boolean NOT NULL DEFAULT (0))`);
        await queryRunner.query(`INSERT INTO "exchange_rate"("id", "created", "updated", "isoCode", "rate", "date", "wasMissing") SELECT "id", "created", "updated", "isoCode", "rate", "date", "wasMissing" FROM "temporary_exchange_rate"`);
        await queryRunner.query(`DROP TABLE "temporary_exchange_rate"`);
        await queryRunner.query(`ALTER TABLE "exchange_rate" RENAME TO "temporary_exchange_rate"`);
        await queryRunner.query(`CREATE TABLE "exchange_rate" ("id" varchar(18) PRIMARY KEY NOT NULL, "created" datetime NOT NULL DEFAULT (datetime('now')), "updated" datetime NOT NULL DEFAULT (datetime('now')), "isoCode" varchar(3) NOT NULL, "rate" decimal NOT NULL, "reverseRate" decimal NOT NULL, "wasMissing" boolean NOT NULL DEFAULT (0))`);
        await queryRunner.query(`INSERT INTO "exchange_rate"("id", "created", "updated", "isoCode", "rate", "reverseRate", "wasMissing") SELECT "id", "created", "updated", "isoCode", "rate", "date", "wasMissing" FROM "temporary_exchange_rate"`);
        await queryRunner.query(`DROP TABLE "temporary_exchange_rate"`);
    }

}
