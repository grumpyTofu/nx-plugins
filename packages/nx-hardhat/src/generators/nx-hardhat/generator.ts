import {
  addProjectConfiguration,
  formatFiles,
  generateFiles,
  getWorkspaceLayout,
  names,
  offsetFromRoot,
  Tree,
  updateJson,
} from '@nrwl/devkit';

import { addPackageWithInit } from '@nrwl/workspace';
import { runTasksInSerial } from '@nrwl/workspace/src/utilities/run-tasks-in-serial';

import {
  VSCodeExtensionsFilePath,
  recommendedExtensions,
  ProjectDependencies,
  ProjectDevDependencies,
} from '../../defaults';

import { updateDependencies } from '@nx-plugins/common';

import * as path from 'path';
import { NxHardhatGeneratorSchema } from './schema';

interface NormalizedSchema extends NxHardhatGeneratorSchema {
  projectName: string;
  projectRoot: string;
  projectDirectory: string;
  parsedTags: string[];
}

function normalizeOptions(
  tree: Tree,
  options: NxHardhatGeneratorSchema
): NormalizedSchema {
  const name = names(options.name).fileName;
  const projectDirectory = options.directory
    ? `${names(options.directory).fileName}/${name}`
    : name;
  const projectName = projectDirectory.replace(new RegExp('/', 'g'), '-');
  const projectRoot = `${getWorkspaceLayout(tree).libsDir}/${projectDirectory}`;
  const parsedTags = options.tags
    ? options.tags.split(',').map((s) => s.trim())
    : [];

  return {
    ...options,
    projectName,
    projectRoot,
    projectDirectory,
    parsedTags,
  };
}

function addFiles(tree: Tree, options: NormalizedSchema) {
  const templateOptions = {
    ...options,
    ...names(options.name),
    offsetFromRoot: offsetFromRoot(options.projectRoot),
    dot: '.',
    template: '',
  };
  generateFiles(
    tree,
    path.join(__dirname, 'files'),
    options.projectRoot,
    templateOptions
  );
}

function updateExtensionRecommendations(host: Tree) {
  if (!host.exists(VSCodeExtensionsFilePath)) {
    host.write(VSCodeExtensionsFilePath, '{ "recommendations": [] }');
  }

  updateJson(host, VSCodeExtensionsFilePath, (json) => {
    json.recommendations ??= [];
    for (const extension of recommendedExtensions) {
      if (
        Array.isArray(json.recommendations) &&
        !json.recommendations.includes(extension)
      )
        json.recommendations.push(extension);
    }
    return json;
  });
}

export default async function (tree: Tree, options: NxHardhatGeneratorSchema) {
  const normalizedOptions = normalizeOptions(tree, options);
  addProjectConfiguration(tree, normalizedOptions.projectName, {
    root: normalizedOptions.projectRoot,
    projectType: 'library',
    sourceRoot: `${normalizedOptions.projectRoot}/src`,
    targets: {
      build: {
        executor: '@spyre-dev/nx-hardhat:build',
      },
    },
    tags: normalizedOptions.parsedTags,
  });
  const depsTask = updateDependencies(
    tree,
    ProjectDependencies,
    ProjectDevDependencies
  );
  addFiles(tree, normalizedOptions);
  updateExtensionRecommendations(tree);
  addPackageWithInit('@nrwl/jest');

  await formatFiles(tree);
  return runTasksInSerial(depsTask);
}
