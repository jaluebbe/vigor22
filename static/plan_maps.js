var map = L.map('map', {
    minZoom: 7,
    maxZoom: 19
});
map.attributionControl.addAttribution('<a href="https://github.com/jaluebbe/vigor22">Source on GitHub</a>');
// add link to an imprint and a privacy statement if the file is available.
function addPrivacyStatement() {
    var xhr = new XMLHttpRequest();
    xhr.open('HEAD', "./datenschutz.html");
    xhr.onload = function() {
        if (xhr.status === 200)
            map.attributionControl.addAttribution(
                '<a href="./datenschutz.html" target="_blank">Impressum & Datenschutzerkl&auml;rung</a>'
            );
    }
    xhr.send();
}
addPrivacyStatement();

function storeMapView() {
    let mapCenter = map.getCenter();
    let mapZoom = map.getZoom();
    sessionStorage.setItem('vigor22:mapView', JSON.stringify({
        lat: mapCenter.lat,
        lon: mapCenter.lng,
        zoom: mapZoom
    }))
}

function setDefaultPosition() {
    map.setView([47.315, 8.205], 9);
}

function restoreMapView() {
    let mapViewData = sessionStorage.getItem('vigor22:mapView');
    if (mapViewData == null) {
        setDefaultPosition();
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
                map.setView([position.coords.latitude, position.coords.longitude], 12);
            });
        }
    } else {
        let mapView = JSON.parse(mapViewData);
        map.setView([mapView.lat, mapView.lon], mapView.zoom);
    }
}

var wmsTopPlusOpen = L.tileLayer.wms('https://sgx.geodatenzentrum.de/wms_topplus_open', {
    layers: 'web_scale',
    maxZoom: 19,
    attribution: '&copy <a href="https://www.bkg.bund.de">BKG</a> 2021, ' +
        '<a href= "http://sg.geodatenzentrum.de/web_public/Datenquellen_TopPlus_Open.pdf" >data sources</a> '
}).addTo(map);

function addOSMVectorLayer(styleName, layerLabel) {
    let myLayer = L.maplibreGL({
        style: '../api/vector/style/' + styleName + '.json',
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

function addEsriBaseLayer(layerName, layerLabel) {
    myLayer = L.esri.Vector.vectorBasemapLayer(layerName, {
        apiKey: esriAccessToken,
        pane: 'tilePane'
    });
    layerControl.addBaseLayer(myLayer, layerLabel);
    // make sure to reprint the vector map after being selected.
    map.on('baselayerchange', function(eo) {
        if (eo.name === layerLabel) {
            myLayer._maplibreGL._update();
        }
    });
    return myLayer;
}


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

L.control.scale({
    'imperial': false
}).addTo(map);
var baseLayers = {
    "TopPlusOpen": wmsTopPlusOpen,
};
var layerControl = L.control.layers(baseLayers, {}, {
    collapsed: L.Browser.mobile, // hide on mobile devices
    position: 'topright'
}).addTo(map);
if (typeof esriAccessToken !== 'undefined') {
    addEsriBaseLayer("ArcGIS:Imagery", "Esri Imagery");
}

addOSMVectorLayer("osm_basic", "OSM Basic (offline)");

addSwisstopoBaseLayer("ch.swisstopo.pixelkarte-farbe", "Map of Switzerland");

addSwisstopoVectorLayer("ch.swisstopo.leichte-basiskarte-imagery.vt", "Aerial view of Switzerland");
