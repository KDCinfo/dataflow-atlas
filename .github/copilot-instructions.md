# DFD Assistant: Data Flow Atlas

## Project Overview
This is a new project for creating a "Data Flow Atlas" - a web-based tool for manually cataloging and organizing application data flows across multiple layers (Pinia stores, browser storage, backend APIs, databases). The goal is to provide a "forest-level perspective" for understanding complex data relationships.

## Core Concept: DFDC (DFD Collaboration) Cards
- **Multi-layer data tracking**: stores, localStorage/sessionStorage, API endpoints, database tables
- **Three-axis categorization**: What (content type), Where (layer), Who (scope)
- **JSON-based data storage** with browser localStorage for persistence
- **Vanilla JavaScript** web app (no frameworks beyond basic HTML/CSS/JS)
  - Can use TypeScript if able

### Syntax
- **Comments** should be ended with periods (excepting label-like comments at the end of lines).
  - **Perspective** should be geared for any random JavaScript developer working on the project.
- **Semi-colons** should **not** be considered optional (i.e., should **always** used).
- Except for one-liners, **ending commas** should be added for the last item in lists and maps.
- CSS class properties should be ordered alphabetically, unless an inline dependency takes precedence.
  > border-radius: var(--radiusAll1); /* Must come first. */
  > border-bottom-right-radius: 0; /* This is an inline override. */

## (Historical) File Structure Context
- `docs/dfd-assistant-instructions-intro.md`: Project overview and goals
- `docs/dfd-assistant-instructions.md`: Detailed technical specification and schema
- `docs/dfd-assistant-original-convo.md`: Original conversation re: project genesis
- App should reside in 'app/' folder (at root).

## Sample Data Schema Pattern
Each data element should follow a structure similar to the following (understanding this is the beginning of this project; see related 'dfd-asstant-readme.md' and 'dfd-assistant-instructions.md' for additional details):

```json
{
  "field": "nightmode",
  "layer": "store",
  "location": "appStateStore.nightmode",
  "type": "number (0|1)",
  "scope": "app|user|session",
  "purpose": "UI theme preference",
  "persists_in": ["backend.db.users.nightmode", "backend.api.userSettings.nightmode"],
  "notes": "Conflicts with userDataModel.globalDarkmode (deprecated)"
}
```
