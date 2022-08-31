var map = L.map('map');
map.attributionControl.addAttribution(
    '<a href="https://github.com/jaluebbe/vigor22">Source on GitHub</a>');
// add link to privacy statement
//map.attributionControl.addAttribution(
//    '<a href="static/datenschutz.html" target="_blank">Datenschutzerkl&auml;rung</a>');
var wmsLayer = L.tileLayer.wms('https://sgx.geodatenzentrum.de/wms_topplus_open', {
    layers: 'web',
    format: 'image/png',
    transparent: true,
    minZoom: 1,
    maxZoom: 19,
    attribution: '&copy <a href="https://www.bkg.bund.de">BKG</a> 2019, ' +
        '<a href= "http://sg.geodatenzentrum.de/web_public/Datenquellen_TopPlus_Open.pdf" >data sources</a> '
});
var osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);
var swisstopo_NationalMapColor = L.tileLayer('https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg', {
    attribution: '&copy; <a href="https://www.swisstopo.admin.ch/">swisstopo</a>',
    minZoom: 7,
    maxZoom: 19,
    bounds: [[45.398181, 5.140242], [48.230651, 11.47757]]
});
var swisstopo_SWISSIMAGE = L.tileLayer('https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg', {
    attribution: '&copy; <a href="https://www.swisstopo.admin.ch/">swisstopo</a>',
    minZoom: 7,
    maxZoom: 19,
    bounds: [[45.398181, 5.140242], [48.230651, 11.47757]]
});

L.control.scale({
    'imperial': false
}).addTo(map);
var baseLayers = {
    "TopPlusOpen": wmsLayer,
    "OpenStreetMap": osmLayer,
    "Map of Switzerland": swisstopo_NationalMapColor,
    "Aerial view of Switzerland": swisstopo_SWISSIMAGE
};
var otherLayers = {};
var layerControl = L.control.layers(baseLayers, otherLayers, {
    collapsed: L.Browser.mobile, // hide on mobile devices
    position: 'topright'
}).addTo(map);
var swissBounds = L.latLngBounds(L.latLng(45.6755, 5.7349), L.latLng(47.9163, 10.6677));
map.on('baselayerchange', function(eo) {
    if (eo.name === "Map of Switzerland" || eo.name === "Aerial view of Switzerland") {
        if (!swissBounds.overlaps(map.getBounds())) {
            map.fitBounds(swissBounds);
        }
    }
});
//map.setView([52.5, 7.29], 12);
map.setView([47.315, 8.205], 9);
