// Import all components in the correct order
// This file ensures that components are loaded in the right sequence
// to avoid dependency issues

// First load the base components
// Then load the specialized item detail components
// Finally load the item.details.js router component

// Load HierarchySelector component (needed by UnitDetails)
document.write(
  '<script src="/src/components/HierarchySelector.vue"></script>'
);



// Load DrawingDetails component
document.write(
);

// Load CasevacDetails component
document.write(
  '<script src="/static/js/components/CasevacDetails.js"></script>'
);

// Load PredicateComponent (needed by FilterComponent)
document.write('<script src="/static/js/components/PredicateComponent.js"></script>');

// Load FilterComponent (needed by ResendingPanel)
document.write('<script src="/src/components/FilterComponent.vue"></script>');

// Load ResendingPanel component
document.write('<script src="/static/js/components/ResendingPanel.js"></script>');

// Load the ItemDetails router component last
document.write('<script src="/src/components/ItemDetails.vue"></script>');
