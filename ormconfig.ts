import { DataSource } from 'typeorm';
import { config } from './src/config/index';

export default new DataSource({
  type: 'postgres',
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.database,
  entities: ['src/database/entities/*.entity{.ts,.js}'],
  migrations: ['src/database/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: config.environment === 'development',
  ssl: config.environment === 'production' ? { rejectUnauthorized: false } : false,
});
