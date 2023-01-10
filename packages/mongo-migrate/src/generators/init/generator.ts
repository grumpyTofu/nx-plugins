import {
  formatFiles,
  generateFiles,
  names,
  offsetFromRoot,
  readCachedProjectGraph,
  Tree,
  updateProjectConfiguration,
} from '@nrwl/devkit';
import * as fs from 'fs';
import * as path from 'path';
import { MongoMigrateGeneratorSchema } from './schema';

interface NormalizedSchema extends MongoMigrateGeneratorSchema {
  projectName: string;
  projectRoot: string;
}

function addFiles(tree: Tree, options: NormalizedSchema) {
  const now = new Date();
  const templateOptions = {
    ...options,
    ...names(options.projectName),
    offsetFromRoot: offsetFromRoot(options.projectRoot),
    template: '',
    timestamp: now.getTime(),
  };
  generateFiles(
    tree,
    path.join(__dirname, 'files'),
    options.projectRoot,
    templateOptions
  );
}

export default async function (
  tree: Tree,
  { targetProject, migrationDirectory = 'migrate' }: MongoMigrateGeneratorSchema
) {
  const graph = readCachedProjectGraph();
  const project = graph.nodes[targetProject];

  if (!project) throw 'Project not found.';

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
    targets: {
      ...projectConfig.targets,
      'mongo-migrate:create': {
        executor: '@spyre-dev/mongo-migrate:create',
        options: migrationOptions,
      },
      'mongo-migrate:up': {
        executor: '@spyre-dev/mongo-migrate:up',
        options: migrationOptions,
      },
      'mongo-migrate:down': {
        executor: '@spyre-dev/mongo-migrate:down',
        options: migrationOptions,
      },
      'mongo-migrate:status': {
        executor: '@spyre-dev/mongo-migrate:status',
        options: migrationOptions,
      },
    },
  });

  addFiles(tree, {
    projectName: project.name,
    projectRoot: root,
    targetProject,
    migrationDirectory,
  });

  tree.write(`${path.join(root, migrationDirectory)}/.gitkeep`, '')

  await formatFiles(tree);
}
