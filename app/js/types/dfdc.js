/**
 * Type guards for runtime validation.
 */
export function isDataLayer(value) {
    return ['store', 'localStorage', 'sessionStorage', 'api', 'database'].includes(value);
}
export function isDataScope(value) {
    return ['app', 'user', 'session'].includes(value);
}
export function isContentCategory(value) {
    return ['user-preference', 'account-setting', 'runtime-state', 'feature-data', 'app-preference'].includes(value);
}
//# sourceMappingURL=dfdc.js.map