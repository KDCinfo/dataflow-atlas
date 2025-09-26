/**
 * Application constants for Data Flow Atlas.
 * Based on the reference app's AppConstants.js with adaptations for atlas management.
 */

export default class AppConstants {
  // App Name
  static appFullName = 'Data Flow Atlas';
  static dynamicAppTitlePrefix = 'Atlas:';

  // Regex pattern for valid atlas names (matches AppConstants.keyNamePattern from reference app)
  // Either camelCase OR snake_case, but not mixed
  static keyNamePattern = /^(?:[a-z][a-zA-Z0-9]*|[a-z][a-z0-9_]*[a-z0-9])$/;

  // Atlas Storage
  static atlasPrefix = 'dfa_';
  static defaultAtlasName = 'default';
  static defaultExportAtlasName = 'default';

  // Atlas Management Error Messages
  static atlasNameErrTextNameEmpty = 'Please provide an atlas name.';
  static atlasNameErrTextNameExists = 'This atlas name already exists.';
  static atlasNameErrTextInvalid = 'For consistent atlas names: Start with a lowercase character. Use either camelCase or snake_case.';
  static atlasNameErrRestoreText = 'There was an issue with this backup. Ensure the active atlas is selected, and a backup exists.';
  static atlasNameErrBackupText = 'Only the active atlas name can be restored, and a backup needs to exist.';
  static atlasNameErrDelText = 'Cannot delete the default or currently active atlas names.';
  static atlasNameErrRenameText = 'Cannot rename the default or currently active atlas names.';
  static atlasNameErrUseText = 'Cannot load an already active atlas name.';
  static atlasNameCopyFlowNameText = 'Copy the selected atlas name into the input field.';

  // DFA Card Default Values
  static defaultCardValues = {
    id: '',
    field: '',
    layer: '',
    location: '',
    type: '',
    scope: '',
    purpose: '',
    persists_in: [],
    notes: ''
  };

  static defaultCardErrorValues = {
    id: 'error-card',
    field: 'ErrorField',
    layer: 'ErrorLayer',
    location: 'ErrorLocation',
    type: 'ErrorType',
    scope: 'ErrorScope',
    purpose: 'Error Purpose',
    persists_in: [],
    notes: 'Error Notes'
  };
}