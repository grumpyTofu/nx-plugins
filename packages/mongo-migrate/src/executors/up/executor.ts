import {
  ExecutorContext,
  ProjectConfiguration,
  ProjectGraphProjectNode,
} from '@nrwl/devkit';
import { Database } from '../../data/db';
import { getNxProject } from '../../utils/nx';
import { validateMigrationInitialization } from '../../utils/project';
import { UpExecutorSchema } from './schema';

import * as path from 'path';
import { readdirSync, readFileSync } from 'fs';
import mongoose from 'mongoose';
import {
  MigrationDocument,
  migrationSchema,
} from '../../data/migration.schema';
import { hashFile } from '../../utils/common';

const validateAppliedMigrations = async (
  migrationDirectory: string,
  migration: MigrationDocument,
  filename: string
) => {
  if (!filename) throw `Migration file ${migration.filename} is missing`;

  const file = readFileSync(path.join(migrationDirectory, filename));
  const fileHash = hashFile(file);

  if (migration.hash !== fileHash)
    throw `Migration ${migration.id} is out of sync`;
};

interface ApplyMigrationArgs {
  db: mongoose.Connection['db'];
  project: ProjectGraphProjectNode<ProjectConfiguration>;
  Migrations: mongoose.Model<MigrationDocument, object, object, object, never>;
  migrationDirectory: string;
  migration: string;
}

const applyMigration = async ({
  db,
  project,
  Migrations,
  migrationDirectory,
  migration,
}: ApplyMigrationArgs) => {
  const migrationPath = path.resolve(migrationDirectory, migration);
  const migrationImport = await import(migrationPath);

  if (!migrationImport.default) throw 'Malformed migration file';
  const migrationConfig = migrationImport.default;

  if (!migrationConfig.up) throw 'Malformed migration file';
  await migrationConfig.up(db);

  const file = readFileSync(`${migrationDirectory}/${migration}`);
  const hash = hashFile(file);

  return Migrations.create({
    project: project.name,
    filename: migration,
    hash,
    dateApplied: new Date(),
  });
};

export default async function runExecutor(
  options: UpExecutorSchema,
  context: ExecutorContext
) {
  const project = getNxProject(context.projectName);

  validateMigrationInitialization(project);

  const config = await import(path.join(context.root, 'migration.config'));
  const db = new Database(config.default);
  await db.connect();

  const Migrations = mongoose.model<MigrationDocument>(
    'Migration',
    migrationSchema,
    db.migrationCollection
  );

  const migrationDirectory = path.join(
    project.data.root,
    project.data['migrationDirectory']
  );

  // get migrations from migrations directory, filter .gitkeep, and sort oldest to newest
  const migrations = readdirSync(migrationDirectory)
    .filter((name) => name !== '.gitkeep')
    .sort((a, b) => {
      const [timestampA] = a.split('-');
      const [timestampB] = b.split('-');

      return parseInt(timestampA) - parseInt(timestampB);
    });

  if (migrations.length === 0) {
    console.error(
      'No migrations to apply. Try using the mongo-migrate generator first to create a new migration'
    );
    return {
      success: false,
    };
  }

  const appliedMigrations = await Migrations.find(
    { project: project.name },
    { filename: 1, hash: 1 }
  );

  // check all applied migrations and ensure hashes match db - if not throw out of sync error
  await Promise.all(
    appliedMigrations.map((m) =>
      validateAppliedMigrations(
        migrationDirectory,
        m,
        migrations.find((name) => m.filename === name)
      )
    )
  );

  // apply migrations for all new files in order
  const pendingMigrations = migrations.filter(
    (file) => !appliedMigrations.find((m) => m.filename === file)
  );

  const migrated = await Promise.all(
    pendingMigrations.map((migration) =>
      applyMigration({
        db: db.client,
        project,
        migration,
        migrationDirectory,
        Migrations,
      })
    )
  );

  if (migrated.length === 0) {
    console.log('Database is up to date');
  } else {
    console.log(
      `Successfully migrated:\n ${migrated.map((m) => m.filename).join(',\n')}`
    );
  }

  return {
    success: true,
  };
}
