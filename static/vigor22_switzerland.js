var map = L.map('map', {
    crs: L.CRS.EPSG2056
});
map.attributionControl.addAttribution(
    '<a href="https://github.com/jaluebbe/vigor22">Source on GitHub</a>');
// add link to privacy statement
//map.attributionControl.addAttribution(
//    '<a href="static/datenschutz.html" target="_blank">Datenschutzerkl&auml;rung</a>');
function addLegend(layerName, layerLabel) {
    if (layerLabel === undefined)
        layerLabel = layerName;
    let apiUrl = "https://api3.geo.admin.ch/rest/services/api/MapServer/";
    return ("<a href='" + apiUrl + layerName + "/legend?lang=en' target='_blank'>" + layerLabel + "</a>");
};
var swisstopo_NationalMapColor = L.tileLayer.swiss({
    "layer": "ch.swisstopo.pixelkarte-farbe"
}).addTo(map);
var swisstopo_SWISSIMAGE = L.tileLayer.swiss({
    "layer": "ch.swisstopo.swissimage"
});
var swisstopo_bodeneignung_naehrstoffspeichervermoegen = L.tileLayer.swiss({
    "format": "png",
    "layer": "ch.blw.bodeneignung-naehrstoffspeichervermoegen",
    "maxNativeZoom": "26",
    "opacity": 0.5
});
var swisstopo_erosion = L.tileLayer.swiss({
    "format": "png",
    "layer": "ch.blw.erosion",
    "maxNativeZoom": "26",
    "opacity": 0.5
});
var swisstopo_grundwasser_nitrat =  L.tileLayer.swiss({
    "format": "png",
    "layer": "ch.bafu.naqua-grundwasser_nitrat",
    "maxNativeZoom": "26",
    "opacity": 0.5
});
var swisstopo_bodenneigung_gruendigkeit = L.tileLayer.swiss({
    "format": "png",
    "layer": "ch.blw.bodeneignung-gruendigkeit",
    "maxNativeZoom": "26",
    "opacity": 0.5
});

L.control.scale({
    'imperial': false
}).addTo(map);
var baseLayers = {
    "Map of Switzerland": swisstopo_NationalMapColor,
    "Aerial view of Switzerland": swisstopo_SWISSIMAGE
};

var otherLayers = {};
otherLayers[addLegend("ch.blw.erosion", "Erosion risk for arable land")] = swisstopo_erosion;
otherLayers[addLegend("ch.bafu.naqua-grundwasser_nitrat", "Nitrates in groundwater")] = swisstopo_grundwasser_nitrat;
otherLayers[addLegend("ch.blw.bodeneignung-gruendigkeit", "Root penetration dept")] =
    swisstopo_bodenneigung_gruendigkeit;
otherLayers[addLegend("ch.blw.bodeneignung-naehrstoffspeichervermoegen", "Nutrient storage capacity")] =
    swisstopo_bodeneignung_naehrstoffspeichervermoegen;

var layerControl = L.control.layers(baseLayers, otherLayers, {
    collapsed: L.Browser.mobile, // hide on mobile devices
    position: 'topright'
}).addTo(map);
map.setView([47.315, 8.205], 20);
