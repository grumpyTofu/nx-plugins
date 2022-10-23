import { BuildExecutorSchema } from './schema';
import executor from './executor';
import { Tree } from '@nrwl/devkit';
import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';

const options: BuildExecutorSchema = {};

describe('Build Executor', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('can run', async () => {
    const output = await executor(options, tree);
    expect(output.success).toBe(true);
  });
});
