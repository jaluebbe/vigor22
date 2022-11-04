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
var wmsTopPlusOpenGrey = L.tileLayer.wms('https://sgx.geodatenzentrum.de/wms_topplus_open', {
    layers: 'web_scale_grau',
    maxZoom: 19,
    attribution: '&copy <a href="https://www.bkg.bund.de">BKG</a> 2021, ' +
        '<a href= "http://sg.geodatenzentrum.de/web_public/Datenquellen_TopPlus_Open.pdf" >data sources</a> '
});
var topPlusOpenOffline = L.tileLayer('/api/mbtiles/topplus_open/{z}/{x}/{y}.png', {
    minZoom: 0,
    maxNativeZoom: 16,
    maxZoom: 19,
    attribution: '&copy <a href="https://www.bkg.bund.de">BKG</a> 2022, ' +
        '<a href= "http://sg.geodatenzentrum.de/web_public/Datenquellen_TopPlus_Open.pdf" >data sources</a> '
});
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

L.control.scale({
    'imperial': false
}).addTo(map);
var baseLayers = {
    "TopPlusOpen": wmsTopPlusOpen,
    "<span style='color: gray'>TopPlusOpen (grey)</span>": wmsTopPlusOpenGrey,
    "TopPlusOpen (offline)": topPlusOpenOffline,
};
var layerControl = L.control.layers(baseLayers, {}, {
    collapsed: L.Browser.mobile, // hide on mobile devices
    position: 'topright'
}).addTo(map);
if (typeof esriAccessToken !== 'undefined') {
    addEsriBaseLayer("ArcGIS:Imagery", "Esri Imagery");
}
addOSMVectorLayer("osm_basic", "OSM Basic (offline)");
addOSMVectorLayer("osm_bright", "OSM Bright (offline)");
