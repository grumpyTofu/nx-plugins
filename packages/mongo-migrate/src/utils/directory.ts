import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
import * as crypto from 'crypto';

const DEFAULT_MIGRATIONS_DIR_NAME = 'migrations';
const DEFAULT_MIGRATION_EXT = '.js';

async function resolveMigrationsDirPath() {
  let migrationsDir;
  try {
    // const configContent = await config.read();
    const configContent = { migrationsDir: 'migrations' };
    migrationsDir = configContent.migrationsDir; // eslint-disable-line
    // if config file doesn't have migrationsDir key, assume default 'migrations' dir
    if (!migrationsDir) {
      migrationsDir = DEFAULT_MIGRATIONS_DIR_NAME;
    }
  } catch (err) {
    // config file could not be read, assume default 'migrations' dir
    migrationsDir = DEFAULT_MIGRATIONS_DIR_NAME;
  }

  if (path.isAbsolute(migrationsDir)) {
    return migrationsDir;
  }
  return path.join(process.cwd(), migrationsDir);
}

async function resolveMigrationFileExtension() {
  let migrationFileExtension;
  try {
    const configContent = { migrationFileExtension: '.ts' };
    migrationFileExtension =
      configContent.migrationFileExtension || DEFAULT_MIGRATION_EXT;
  } catch (err) {
    // config file could not be read, assume default extension
    migrationFileExtension = DEFAULT_MIGRATION_EXT;
  }

  if (migrationFileExtension && !migrationFileExtension.startsWith('.')) {
    throw new Error('migrationFileExtension must start with dot');
  }

  return migrationFileExtension;
}

async function resolveSampleMigrationFileName() {
  const migrationFileExtention = await resolveMigrationFileExtension();
  return `sample-migration${migrationFileExtention}`;
}

async function resolveSampleMigrationPath() {
  const migrationsDir = await resolveMigrationsDirPath();
  const sampleMigrationSampleFileName = await resolveSampleMigrationFileName();
  return path.join(migrationsDir, sampleMigrationSampleFileName);
}

module.exports = {
  resolve: resolveMigrationsDirPath,
  resolveSampleMigrationPath,
  resolveMigrationFileExtension,

  async shouldExist() {
    const migrationsDir = await resolveMigrationsDirPath();
    const exists = fs.existsSync(migrationsDir);
    if (!exists)
      throw new Error(`migrations directory does not exist: ${migrationsDir}`);
  },

  async shouldNotExist() {
    const migrationsDir = await resolveMigrationsDirPath();
    const error = new Error(
      `migrations directory already exists: ${migrationsDir}`
    );

    const exists = fs.existsSync(migrationsDir);
    if (exists) throw error;
  },

  async getFileNames() {
    const migrationsDir = await resolveMigrationsDirPath();
    const migrationExt = await resolveMigrationFileExtension();
    const files = fs.readdirSync(migrationsDir);
    const sampleMigrationFileName = await resolveSampleMigrationFileName();
    return files
      .filter(
        (file) =>
          path.extname(file) === migrationExt &&
          path.basename(file) !== sampleMigrationFileName
      )
      .sort();
  },

  async loadMigration(fileName) {
    const migrationsDir = await resolveMigrationsDirPath();
    const migrationPath = path.join(migrationsDir, fileName);
    try {
      return require(migrationPath);
    } catch (e) {
      if (e.code === 'ERR_REQUIRE_ESM') {
        return import(url.pathToFileURL(migrationPath).href);
      }
      throw e;
    }
  },

  async loadFileHash(fileName: string) {
    const migrationsDir = await resolveMigrationsDirPath();
    const filePath = path.join(migrationsDir, fileName);
    const hash = crypto.createHash('sha256');
    const input = fs.readFileSync(filePath);
    hash.update(input);
    return hash.digest('hex');
  },

  async doesSampleMigrationExist() {
    const samplePath = await resolveSampleMigrationPath();
    try {
      fs.statSync(samplePath);
      return true;
    } catch (err) {
      return false;
    }
  },
};
