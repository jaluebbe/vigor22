function addSwisstopoLegend(layerName, layerLabel) {
    if (layerLabel === undefined)
        layerLabel = layerName;
    let apiUrl = "https://api3.geo.admin.ch/rest/services/api/MapServer/";
    return ("<a href='" + apiUrl + layerName + "/legend?lang=en' target='_blank'>" + layerLabel + "</a>");
};

function addSwisstopoBaseLayer(layerName, layerLabel) {
    let swisstopoBaselayerOptions = {
        attribution: '&copy; <a href="https://www.swisstopo.admin.ch/">swisstopo</a>',
        minZoom: 7,
        maxZoom: 19,
        bounds: [
            [45.398181, 5.140242],
            [48.230651, 11.47757]
        ]
    };
    let myLayer = L.tileLayer('https://wmts.geo.admin.ch/1.0.0/' +
        layerName + '/default/current/3857/{z}/{x}/{y}.jpeg',
        swisstopoBaselayerOptions);;
    layerControl.addBaseLayer(myLayer, layerLabel);
    return myLayer;
};

function addSwisstopoOverlay(layerName, layerLabel, opacity = 0.5) {
    let myLayer = L.tileLayer.wms('https://wms.geo.admin.ch/', {
        layers: layerName,
        transparent: true,
        opacity: opacity,
        maxZoom: 19,
        format: 'image/png',
    });
    layerControl.addOverlay(myLayer, addSwisstopoLegend(layerName, layerLabel));
    return myLayer;
};

function addSwisstopoVectorLayer(layerName, layerLabel) {
    let myLayer = L.maplibreGL({
        style: 'https://vectortiles.geo.admin.ch/styles/' + layerName + '/style.json',
        attribution: '&copy; <a href="https://www.swisstopo.admin.ch/">swisstopo</a>',
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
addSwisstopoBaseLayer("ch.swisstopo.pixelkarte-farbe", "Map of Switzerland").addTo(map);
addSwisstopoBaseLayer("ch.swisstopo.pixelkarte-grau", "Map of Switzerland (grey)");

addSwisstopoVectorLayer("ch.swisstopo.leichte-basiskarte.vt", "swisstopo light base map");
addSwisstopoVectorLayer("ch.swisstopo.leichte-basiskarte-imagery.vt", "Aerial view of Switzerland");

addSwisstopoOverlay("ch.blw.erosion", "Erosion risk for arable land");
addSwisstopoOverlay("ch.bafu.gewaesserschutz-chemischer_zustand_nitrat", "Nitrate in waters");
addSwisstopoOverlay("ch.blw.bodeneignung-gruendigkeit", "Root penetration dept");
addSwisstopoOverlay("ch.blw.bodeneignung-naehrstoffspeichervermoegen", "Nutrient storage capacity");
