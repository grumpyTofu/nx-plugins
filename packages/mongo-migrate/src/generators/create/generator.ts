import {
  formatFiles,
  generateFiles,
  names,
  offsetFromRoot,
  Tree,
} from '@nrwl/devkit';
import * as path from 'path';
import { getNxProject } from '../../utils/nx';
import { validateMigrationInitialization } from '../../utils/project';
import { CreateMigrationGeneratorSchema } from './schema';

interface NormalizedSchema extends CreateMigrationGeneratorSchema {
  projectName: string;
  projectRoot: string;
  migrationDirectory: string;
}

function addFiles(tree: Tree, options: NormalizedSchema) {
  const now = new Date();
  const templateOptions = {
    ...options,
    ...names(options.projectName),
    offsetFromRoot: offsetFromRoot(options.projectRoot),
    schemaless: options.schemaless,
    template: '',
    timestamp: now.getTime(),
  };
  generateFiles(
    tree,
    path.join(__dirname, 'files'),
    path.join(options.projectRoot, options.migrationDirectory),
    templateOptions
  );
}

export default async function (
  tree: Tree,
  { targetProject, schemaless }: CreateMigrationGeneratorSchema
) {
  const project = getNxProject(targetProject);

  const root = project.data.root;

  validateMigrationInitialization(project);

  const migrationDirectory = project.data['migrationDirectory'];

  addFiles(tree, {
    projectName: targetProject,
    projectRoot: root,
    targetProject,
    migrationDirectory,
    schemaless,
  });

  await formatFiles(tree);
}
