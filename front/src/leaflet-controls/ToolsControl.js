import L from 'leaflet';

export const ToolsControl = L.Control.extend({
     options: {
        position: 'topleft'
     },

    initialize: function (options, handlers) {
        L.Util.setOptions(this, options);
        this._handlers = handlers; // Store { measure: func, addPoint: func, ... }
    },

     onAdd: function (map) {
         const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
         container.style.backgroundColor = 'white';
         container.style.borderRadius = '4px';

         this._createButton('Measure Distance', 'bi bi-rulers', container, this._handlers.measure);
         this._createButton('Add Generic Point', 'bi bi-plus-circle-dotted', container, this._handlers.addPoint);
         // Add more tool buttons as needed based on handlers passed in

         // Disable map click propagation when clicking the control
         L.DomEvent.disableClickPropagation(container);

         return container;
     },

    _createButton: function (title, iconClass, container, onClick) {
        const button = L.DomUtil.create('a', 'leaflet-control-custom', container);
        button.href = '#';
        button.title = title;
        button.style.width = '30px';
        button.style.height = '30px';
        button.style.lineHeight = '30px';
        button.style.textAlign = 'center';
        button.style.textDecoration = 'none';
        button.style.display = 'block';
        button.style.color = '#333';

        const icon = L.DomUtil.create('i', iconClass, button);
        icon.style.fontSize = '1.3em';

        L.DomEvent.on(button, 'click', L.DomEvent.stopPropagation)
                  .on(button, 'click', L.DomEvent.preventDefault)
                  .on(button, 'click', onClick, this);
        
        // Store reference for potential cleanup in onRemove
        button._onClick = onClick; 

        return button;
    },

     onRemove: function (map) {
         // Clean up listeners for all buttons created
         this._container.querySelectorAll('.leaflet-control-custom').forEach(button => {
            L.DomEvent.off(button, 'click', L.DomEvent.stopPropagation)
                      .off(button, 'click', L.DomEvent.preventDefault)
                      .off(button, 'click', button._onClick, this);
         });
     }
 }); 