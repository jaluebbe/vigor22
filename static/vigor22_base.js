var map = L.map('map');
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
var swisstopo_NationalMapColor = L.tileLayer('https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg', {
    attribution: '&copy; <a href="https://www.swisstopo.admin.ch/">swisstopo</a>',
    minZoom: 7,
    maxZoom: 19,
    bounds: [
        [45.398181, 5.140242],
        [48.230651, 11.47757]
    ]
});
var swisstopo_SWISSIMAGE = L.tileLayer('https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg', {
    attribution: '&copy; <a href="https://www.swisstopo.admin.ch/">swisstopo</a>',
    minZoom: 7,
    maxZoom: 19,
    bounds: [
        [45.398181, 5.140242],
        [48.230651, 11.47757]
    ]
});

L.control.scale({
    'imperial': false
}).addTo(map);
var baseLayers = {
    "TopPlusOpen": wmsTopPlusOpen,
    "TopPlusOpen (grey)": wmsTopPlusOpenGrey,
    "Map of Switzerland": swisstopo_NationalMapColor,
    "Aerial view of Switzerland": swisstopo_SWISSIMAGE
};
var otherLayers = {};
var layerControl = L.control.layers(baseLayers, otherLayers, {
    collapsed: L.Browser.mobile, // hide on mobile devices
    position: 'topright'
}).addTo(map);

//map.setView([52.5, 7.29], 12);
map.setView([47.315, 8.205], 9);
