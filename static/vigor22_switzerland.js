var map = L.map('map', {
    crs: L.CRS.EPSG2056
});
map.attributionControl.addAttribution(
    '<a href="https://github.com/jaluebbe/vigor22">Source on GitHub</a>');
// add link to privacy statement
//map.attributionControl.addAttribution(
//    '<a href="static/datenschutz.html" target="_blank">Datenschutzerkl&auml;rung</a>');
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
baseLayers = {
    "ch.swisstopo.pixelkarte-farbe": swisstopo_NationalMapColor,
    "ch.swisstopo.swissimage": swisstopo_SWISSIMAGE
};
otherLayers = {
    "ch.blw.bodeneignung-naehrstoffspeichervermoegen": swisstopo_bodeneignung_naehrstoffspeichervermoegen,
    "ch.blw.erosion": swisstopo_erosion,
    "ch.bafu.naqua-grundwasser_nitrat": swisstopo_grundwasser_nitrat,
    "ch.blw.bodeneignung-gruendigkeit": swisstopo_bodenneigung_gruendigkeit
};
var layerControl = L.control.layers(baseLayers, otherLayers, {
    collapsed: L.Browser.mobile, // hide on mobile devices
    position: 'topright'
}).addTo(map);
map.setView([47.315, 8.205], 20)
