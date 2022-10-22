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
var openStreetMapOffline = L.maplibreGL({
    style: 'osm_basic_style.json',
    attribution: '&copy; <a href="https://openmaptiles.org/">OpenMapTiles</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
});
// make sure to reprint the vector map after being selected.
map.on('baselayerchange', function(eo) {
    if (eo.name === 'OpenStreetMap (offline)') {
        openStreetMapOffline._update();
    }
});
L.control.scale({
    'imperial': false
}).addTo(map);
var baseLayers = {
    "TopPlusOpen": wmsTopPlusOpen,
    "<span style='color: gray'>TopPlusOpen (grey)</span>": wmsTopPlusOpenGrey,
    "TopPlusOpen (offline)": topPlusOpenOffline,
    "OpenStreetMap (offline)": openStreetMapOffline,
};
var otherLayers = {};
var layerControl = L.control.layers(baseLayers, otherLayers, {
    collapsed: L.Browser.mobile, // hide on mobile devices
    position: 'topright'
}).addTo(map);

map.setView([47.315, 8.205], 9);
