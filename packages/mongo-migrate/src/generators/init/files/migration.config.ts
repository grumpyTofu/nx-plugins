import { MigrationConfig } from '@spyre-dev/mongo-migrate';

const config: MigrationConfig = {
  dbUri: 'mongodb://localhost:27017',
  migrationCollection: 'migrations', // default
};

export default config;
