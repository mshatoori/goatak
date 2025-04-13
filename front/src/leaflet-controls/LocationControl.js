import L from 'leaflet';

export const LocationControl = L.Control.extend({
  options: {
    position: 'bottomleft' // Or any other position
  },

  initialize: function (options, locateFunc) {
    L.Util.setOptions(this, options);
    this._locateFunc = locateFunc; // Store the callback function
  },

  onAdd: function (map) {
    const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
    container.style.backgroundColor = 'white';
    // container.style.width = '30px';
    // container.style.height = '30px';
    container.style.fontSize = '20px';
    // container.style.cursor = 'pointer';
    container.title = 'مکان من';

    // Use Bootstrap Icons class directly if available globally or style manually
    const link = L.DomUtil.create('a', '', container);
    link.href = '#';
    const icon = L.DomUtil.create('i', 'bi bi-crosshair', link);
    // icon.style.fontSize = '1.3em';
    // icon.style.lineHeight = '30px'; // Center icon vertically
    icon.style.textAlign = 'center'; // Center icon horizontally
    icon.style.display = 'block';

    L.DomEvent.on(container, 'click', L.DomEvent.stopPropagation)
              .on(container, 'click', L.DomEvent.preventDefault)
              .on(container, 'click', this._locateFunc, this); // Call the passed function

    // Disable map click propagation when clicking the control
    L.DomEvent.disableClickPropagation(container);

    return container;
  },

  onRemove: function (map) {
    // Clean up listeners if necessary, though Leaflet might handle basic ones
    L.DomEvent.off(this._container, 'click', L.DomEvent.stopPropagation)
              .off(this._container, 'click', L.DomEvent.preventDefault)
              .off(this._container, 'click', this._locateFunc, this);
  }
}); 