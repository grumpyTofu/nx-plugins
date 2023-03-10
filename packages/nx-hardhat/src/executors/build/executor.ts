import { ExecutorContext } from '@nrwl/devkit';
import { BuildExecutorSchema } from './schema';
import { getProjectRoot, getWorkspaceRoot } from '@nx-plugins/common';
import { runHardhatCommand } from '../../utils';

export default async function runExecutor(
  options: BuildExecutorSchema,
  context: ExecutorContext
) {
  console.log('Executor ran for Build', options);

  const workspaceRoot = getWorkspaceRoot(context);
  const projectRoot = getProjectRoot(context);

  try {
    runHardhatCommand(workspaceRoot, projectRoot, 'compile');
    return { success: true };
  } catch (e) {
    return { success: false };
  }
}
