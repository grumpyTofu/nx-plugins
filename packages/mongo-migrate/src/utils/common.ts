import { createHash } from 'crypto';

export const hashFile = (file: Buffer) => {
  const hash = createHash('sha256');
  hash.update(file);
  return hash.digest('hex');
};
