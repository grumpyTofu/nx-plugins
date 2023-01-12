import {
  formatFiles,
  generateFiles,
  names,
  Tree,
  updateProjectConfiguration,
} from '@nrwl/devkit';
import * as fs from 'fs';
import * as path from 'path';
import { getNxProject } from '../../utils/nx';
import { InitGeneratorSchema } from './schema';

interface NormalizedSchema extends InitGeneratorSchema {
  projectName: string;
}

const addFiles = (tree: Tree, options: NormalizedSchema) => {
  const now = new Date();
  const templateOptions = {
    ...options,
    ...names(options.projectName),
    offsetFromRoot: '',
    template: '',
    timestamp: now.getTime(),
  };
  generateFiles(tree, path.join(__dirname, 'files'), '', templateOptions);
};

export default async function (
  tree: Tree,
  { targetProject, migrationDirectory = 'migrations' }: InitGeneratorSchema
) {
  const project = getNxProject(targetProject);

  const root = project.data.root;

  const projectConfigFile = fs.readFileSync(path.join(root, 'project.json'), {
    encoding: 'utf-8',
  });
  const projectConfig = JSON.parse(projectConfigFile);

  const migrationOptions = {
    migrationDirectory,
  };

  updateProjectConfiguration(tree, project.name, {
    ...projectConfig,
    root,
    migrationDirectory,
    targets: {
      ...projectConfig.targets,
      'migrate-up': {
        executor: '@spyre-dev/mongo-migrate:up',
        options: migrationOptions,
      },
      'migrate-down': {
        executor: '@spyre-dev/mongo-migrate:down',
        options: migrationOptions,
      },
      'migrate-status': {
        executor: '@spyre-dev/mongo-migrate:status',
        options: migrationOptions,
      },
    },
  });

  addFiles(tree, {
    projectName: project.name,
    targetProject,
    migrationDirectory,
  });

  tree.write(`${path.join(root, migrationDirectory)}/.gitkeep`, '');

  await formatFiles(tree);
}
