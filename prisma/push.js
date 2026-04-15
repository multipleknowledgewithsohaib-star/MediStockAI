const { execSync } = require('child_process');
const path = require('path');

const prismaPath = path.join(__dirname, '..', 'node_modules', 'prisma', 'build', 'index.js');
try {
  const result = execSync(`node "${prismaPath}" db push --accept-data-loss`, {
    encoding: 'utf-8',
    cwd: path.join(__dirname, '..'),
    stdio: 'pipe'
  });
  console.log('SUCCESS:', result);
} catch (e) {
  console.log('STDOUT:', e.stdout);
  console.log('STDERR:', e.stderr);
  console.log('EXIT CODE:', e.status);
}
