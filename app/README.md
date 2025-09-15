# Data Flow Atlas

**An Atlas of data points, data layers, and data flows** for your web or mobile app.

> Do you know where all your data is at?

***

> NOTE: **This app is relatively new and is a WIP** as of 2025-09.

***

Includes a "DFD collaborator card assistant".

> DFD: Data Flow Diagram

This app is a vanilla JavaScript web application for manually cataloging and organizing application data flows across multiple layers.

Some examples might include:

- Nuxt web app or SPA:
  - Pinia stores, models, composables, middleware, plugins, browser local and session storage, backend APIs, databases, etc.
- Flutter mobile app:
  - Shared Preferences, Flutter Secure Storage, models, changeNotifiers, blocs, repositories, backend APIs, databases, server instances, Firebase stores, etc.

***

A **structured, manually curated system of record** for understanding your app's *data domains and flows*, without drowning in ad-hoc notes or spaghetti diagrams.

Basically an “architectural logbook” for all your app's data layers.

***

**TOC**

## Features
## Usage
## Data Schema
## Three-Axis System
## Canonical Categories
## Development Setup
## Development
## Browser Compatibility
## Contributing

***

## Features

### DFDC (DFD Collaboration) Cards
- **Three-axis categorization**: What (content type), Where (layer), Who (scope)
   - Note: This could potentially change based on the progress of the app, but could likely remain core pillars of relationships
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

Note: These are all susceptible to change based on the progress of the app.

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

### User Account Settings (Identity/Auth)              | Database
Email, password, nickname, ID, tokens - always backend-first, mirrored locally as needed.

### User Preferences (User-Scoped, Persisted Globally) | Database
Nightmode, transition styles - saved in DB, optionally mirrored in store, travel with user.

### Core/Feature Data                                  | Database
Domain-specific data like notes, tasks, projects - stored in DB, mirrored in store for active session.

### App Preferences (App-Scoped, Persisted Locally)    | localStorage
Font size, color themes, body width - saved in localStorage or appStateStore, not tied to account.

### App Usage & Runtime State                          | Pinia / sessionStorage
isLoading, currentPage, lastMsg - transient only, Pinia store or sessionStorage.

-----

## Development Setup

### Prerequisites
- Node.js (v16 or higher)
- npm

### Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/KDCinfo/dataflow-atlas.git
   cd dataflow-atlas
   ```

2. **Install dependencies:**
   ```bash
   cd app
   npm install
   ```

3. **Build the application:**
   ```bash
   npm run build
   ```

   Or for development with auto-rebuild:
   ```bash
   npm run watch
   ```

4. **Serve the application:**
   Use any web server to serve the `app/` directory:
   - **Python:** `python -m http.server 8000`
   - **Node.js:** `npx serve .`
   - **VS Code:** Use Live Server extension
   - **nginx/Apache:** Point to the `app/` directory

   Then open `http://localhost:8000` in your browser.

### Project Structure

```
dataflow-atlas/
├── src/                    # TypeScript source files
│   ├── types/
│   │   └── dfdc.ts        # DFDC card interfaces and type guards
│   ├── utils/
│   │   └── storage.ts     # localStorage utilities
│   ├── components/
│   │   ├── cardManager.ts # Card CRUD operations
│   │   └── ui.ts          # UI interactions and rendering
│   └── app.ts             # Main application logic
├── tsconfig.json          # TypeScript configuration
├── app/
│   ├── js/                # Compiled JavaScript (generated, not in git)
│   ├── css/               # Stylesheets
│   ├── index.html         # Main application
│   └── package.json       # Dependencies and build scripts
└── docs/                  # Documentation
```

**Important:** The `app/js/` directory is generated during build and not included in version control. You must run the build process to generate the JavaScript files.

## Development
This TypeScript application requires a build step. The TypeScript source files in `src/` are compiled to JavaScript in `app/js/` using the build commands above.

### Current TypeScript Structure
```
src/                        # TypeScript source files
├── types/
│   └── dfdc.ts            # DFDC card interfaces and type guards
├── utils/
│   └── storage.ts         # localStorage utilities with type safety
├── components/
│   ├── cardManager.ts     # Card CRUD operations and validation
│   └── ui.ts              # UI interactions and rendering
└── app.ts                 # Main application class

app/                        # Deployable web application
├── index.html             # Main application HTML
├── css/
│   └── styles.css         # Application styles
├── js/                    # Compiled TypeScript output (generated)
│   ├── app.js
│   ├── components/
│   ├── types/
│   └── utils/
└── package.json           # Dependencies and build scripts
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
