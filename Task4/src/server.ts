import app from './app.js';
import { validateConfig } from './config/env.js';

const boot = (): void => {
  let env;
  try {
    env = validateConfig(process.env);
  } catch (err: unknown) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }

  app.listen(env.PORT, () => {
    console.log(`Server running on http://localhost:${env.PORT}`);
    console.log(`Academic year ${env.ACADEMIC_YEAR}, pass percentage ${env.PASS_PERCENTAGE}`);
  });
};

boot();
