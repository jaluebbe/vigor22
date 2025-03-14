var map = L.map('map', {
    minZoom: 0,
    maxZoom: 19,
    zoomSnap: 0.5,
    zoomDelta: 0.5,
    attributionControl: false
});
map.setView([49.0, 9.0], 7);

function addOSMVectorLayer(styleName, region, layerLabel) {
    let myLayer = L.maplibreGL({
        style: '../api/vector/style/' + region + '/' + styleName + '.json',
        attribution: '&copy; <a href="https://openmaptiles.org/">OpenMapTiles</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    });
    layerControl.addBaseLayer(myLayer, layerLabel);
    // make sure to reprint the vector map after being selected.
    map.on('baselayerchange', function(eo) {
        if (eo.name === layerLabel) {
            myLayer._update();
        }
    });
    return myLayer;
};

var layerControl = L.control.layers({}, {}, {
    collapsed: true,
    position: 'topright'
}).addTo(map);

fetch('/api/vector/regions')
    .then(response => response.json())
    .then(data => {
        if (data.length > 0) {
            const mapRegion = data[0];
            addOSMVectorLayer("osm_basic", mapRegion, "OSM Basic").addTo(map);
        } else {
            console.warn('No regions available.');
        }
    })
    .catch(error => {
        console.error('Error fetching regions:', error);
    });
