Add a new side bar panel for a new feature called Resending. Only implement it in the front-end as a non-functional prototype. Use mock data if needed. Try to isolate changes to only the new side bar panel component file you implement, and only change other files if absolutely necessary (for example `sidebar.js` to include the new component you added to the UI). Be simple. Don't include changes outside the things requested. The front-end implementation of the project is in the `staticfiles/static/`. Also create a markdown document and put it in that directory. Read any files necessary to understand the task and its context.

In the panel it should show a list of resending configurations each one showing as a card.
There should also be an ability to create a new config.

Resending Config Form Fields:

1. Destination (selected from the list of outgoing flows)
2. Filters

## Filters

Each filter is a list of predicates that get ANDed with each other. There should be a list of filters, ability to add, and delete them.

### Predicates

When viewing a filter, there should be the list of predicates, ability to add new predicates and delete them.
When adding a predicate, user can use between between 4 different type of predicates:

- Item Type (Unit, Drawings, Contacts(?), Alerts)
- Side (friendly, hostile, etc.)
- Unit Type (Air, Ground, etc.)
- Location Boundary (implement with Polygons, i.e. select from the list of polygons)
