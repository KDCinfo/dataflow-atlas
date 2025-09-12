# DFD Assistant: Data Flow Atlas

A vanilla JavaScript web application for manually cataloging and organizing application data flows across multiple layers (Pinia stores, browser storage, backend APIs, databases).

## Features

### DFDC (DFD Collaboration) Cards
- **Three-axis categorization**: What (content type), Where (layer), Who (scope)
- **Multi-layer data tracking**: stores, localStorage/sessionStorage, API endpoints, database tables
- **Manual entry and curation** for forest-level perspective

### Data Organization
- **Comprehensive form-based entry** for all data flow elements
- **Filtering and searching** by layer, scope, and category
- **Visual card-based display** for easy browsing
- **Edit and delete capabilities** for maintaining accuracy

### Data Persistence
- **Browser localStorage** for automatic persistence
- **JSON import/export** for backup and sharing
- **Merge or replace** import options

## Usage

### Adding DFDC Cards

1. Navigate to the "Add DFDC Card" tab
2. Fill in the required fields:
   - **Field/Key Name**: The identifier for your data point
   - **Primary Layer**: Where the data primarily lives (store, localStorage, API, etc.)
   - **Scope**: Who owns this data (app, user, or session level)
3. Add optional details:
   - Data type, specific location, purpose, category
   - Additional persistence locations
   - Notes for conflicts or deprecation info

### Viewing Your Atlas

1. Navigate to the "View Atlas" tab
2. Use filters to narrow down cards by layer, scope, or category
3. Click edit (✏️) or delete (🗑️) buttons on cards to manage them

### Import/Export

1. Navigate to the "Import/Export" tab
2. **Export**: Download your complete atlas as a JSON file
3. **Import**: Upload a previously exported JSON file
   - Choose "Replace" to overwrite existing data
   - Choose "Merge" to combine with existing data

## Data Schema

Each DFDC card follows this structure:

```json
{
  "field": "nightmode",
  "layer": "store",
  "location": "appStateStore.nightmode",
  "type": "number (0|1)",
  "scope": "user",
  "purpose": "UI theme preference",
  "category": "user-preference",
  "persists_in": [
    "backend.db.users.nightmode",
    "backend.api.userSettings.nightmode"
  ],
  "notes": "Conflicts with userDataModel.globalDarkmode (deprecated)"
}
```

## Three-Axis System

### What (Content Type)
- **Preference**: App or user configuration
- **Account**: Identity/authentication data
- **Runtime**: Temporary application state
- **Feature**: Domain-specific data

### Where (Layer)
- **Pinia Store**: Vue.js state management
- **Local Storage**: Persistent browser storage
- **Session Storage**: Temporary browser storage
- **Backend API**: Server endpoints
- **Database**: Persistent server storage

### Who (Scope)
- **App-level**: Tied to device/browser installation
- **User-level**: Tied to user account, portable
- **Session-level**: Temporary, cleared on logout

## Canonical Categories

### App Preferences (App-Scoped, Persisted Locally)
Font size, color themes, body width - saved in localStorage or appStateStore, not tied to account.

### User Preferences (User-Scoped, Persisted Globally)
Nightmode, transition styles - saved in DB, optionally mirrored in store, travel with user.

### User Account Settings (Identity/Auth)
Email, password, nickname, ID, tokens - always backend-first, mirrored locally as needed.

### App Usage & Runtime State
isLoading, currentPage, lastMsg - transient only, Pinia store or sessionStorage.

### Core/Feature Data
Domain-specific data like notes, tasks, projects - stored in DB, mirrored in store for active session.

## Development

This is a vanilla JavaScript application with no build process required. Simply open `index.html` in a web browser or serve the `app/` directory with any web server.

### File Structure
```
app/
├── index.html          # Main application HTML
├── css/
│   └── styles.css      # Application styles
└── js/
    └── app.js          # Application logic
```

## Browser Compatibility

- Modern browsers with ES6+ support
- localStorage support required
- File API support for import/export

## Contributing

This project follows specific coding conventions:
- **Comments** end with periods
- **Semi-colons** are always used (not optional)
- **Ending commas** for last items in lists/maps (except one-liners)
- **CSS properties** ordered alphabetically unless inline dependencies exist
