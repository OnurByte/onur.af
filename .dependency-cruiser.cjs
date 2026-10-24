const { builtinModules } = require('node:module');
const core = `^(node:|bun$|bun:|${builtinModules.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$').join('|')})`;
const browser = '^src/client/';
module.exports = {
  forbidden: [
    {
      name: 'domain-no-node',
      severity: 'error',
      from: {
        path: '^src/(donations/(money|protocol)\\.ts|portfolio/(scroll|glass-optics)\\.ts)$',
      },
      to: { path: core, reachable: true },
    },
    { name: 'no-cycles', severity: 'error', from: {}, to: { circular: true } },
    {
      name: 'browser-no-server',
      severity: 'error',
      from: { path: browser },
      to: {
        path: '^src/(server/|xmr/|donations/|gateway\\.ts$)',
        reachable: true,
      },
    },
    {
      name: 'browser-no-node',
      severity: 'error',
      from: { path: browser },
      to: {
        path: core,
        reachable: true,
      },
    },
    {
      name: 'domain-no-io',
      severity: 'error',
      from: {
        path: '^src/(donations/(money|protocol)\\.ts|portfolio/(scroll|glass-optics)\\.ts)$',
      },
      to: {
        path: '^src/(server/|xmr/|client/|gateway\\.ts$|donations/(agent|store|config)\\.ts)',
        reachable: true,
      },
    },
  ],
  options: {
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    doNotFollow: { path: 'node_modules' },
    exclude: { path: 'node_modules' },
    enhancedResolveOptions: { extensions: ['.ts', '.tsx', '.js', '.json'] },
  },
};
