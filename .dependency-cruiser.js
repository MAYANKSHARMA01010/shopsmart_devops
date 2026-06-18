module.exports = {
  forbidden: [
    {
      name: 'no-cross-feature-imports',
      severity: 'error',
      comment: 'Features should not import from internal parts of other features. Use the public index.ts instead.',
      from: {
        path: '^apps/client/src/features/([^/]+)/'
      },
      to: {
        path: '^apps/client/src/features/([^/]+)/',
        pathNot: '^apps/client/src/features/$1/',
        // Only allow importing from the root index.ts of another feature
        not: {
          path: '^apps/client/src/features/([^/]+)/index\\.ts$'
        }
      }
    },
    {
      name: 'no-backend-cross-module-imports',
      severity: 'error',
      comment: 'Backend modules should only import public exports of other modules.',
      from: {
        path: '^apps/server/src/modules/([^/]+)/'
      },
      to: {
        path: '^apps/server/src/modules/([^/]+)/',
        pathNot: '^apps/server/src/modules/$1/',
        not: {
          path: '^apps/server/src/modules/([^/]+)/index\\.ts$'
        }
      }
    }
  ],
  options: {
    doNotFollow: {
      path: 'node_modules'
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json'
    }
  }
};
