export class PermissionConfigurationError extends Error {
  constructor(issues: readonly string[]) {
    super(
      'Application could not start: invalid permission configuration.\n\n' +
        issues.map((issue, index) => `${index + 1}. ${issue}`).join('\n\n') +
        '\n\nFix the routes listed above and restart the application.',
    );
    this.name = 'PermissionConfigurationError';
  }
}
