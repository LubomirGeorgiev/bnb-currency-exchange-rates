module.exports = {
  type: "sqlite",
  name: "default",
  database: "data/rates.db",
  entities: [__dirname + "/src/entity/*{.js,.ts}"],
  migrations: [__dirname + "/src/migration/*{.js,.ts}"],
  migrationsRun: true,
  logging: true,
  cli: {
    migrationsDir: 'src/migration'
  }
}
