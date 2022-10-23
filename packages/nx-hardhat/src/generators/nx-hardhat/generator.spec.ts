import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import { Tree, readProjectConfiguration } from '@nrwl/devkit';

import generator from './generator';
import { NxHardhatGeneratorSchema } from './schema';

describe('nx-hardhat generator', () => {
  let libTree: Tree;
  const options: NxHardhatGeneratorSchema = { name: 'test' };

  beforeEach(() => {
    libTree = createTreeWithEmptyWorkspace();
  });

  it('should run successfully', async () => {
    await generator(libTree, options);
    const config = readProjectConfiguration(libTree, 'test');
    expect(config).toBeDefined();
  });
});
