// Import all components in the correct order
// This file ensures that components are loaded in the right sequence
// to avoid dependency issues

// First load the base components
// Then load the specialized item detail components
// Finally load the item.details.js router component

// Load HierarchySelector component (needed by UnitDetails)
document.write(
  '<script src="/static/js/components/HierarchySelector.js"></script>'
);

// Load UnitDetails component
document.write('<script src="/static/js/components/UnitDetails.js"></script>');

// Load PointDetails component
document.write('<script src="/static/js/components/PointDetails.js"></script>');

// Load DrawingDetails component
document.write(
  '<script src="/static/js/components/DrawingDetails.js"></script>'
);

// Load CasevacDetails component
document.write(
  '<script src="/static/js/components/CasevacDetails.js"></script>'
);

// Load the ItemDetails router component last
document.write('<script src="/static/js/components/item.details.js"></script>');
