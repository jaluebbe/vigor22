map.createPane('active');
map.createPane('vehicle');
map.getPane('active').style.zIndex = 394;
map.getPane('vehicle').style.zIndex = 395;

var info = L.control({
    position: 'bottomright'
});

info.onAdd = function(map) {
    this._div = L.DomUtil.create('div', 'info');
    this._div.innerHTML =
        '<div class="grid-container">' +
        '<div><span id="infoText">no connection</span></div>' +
        '<div><span id="infoSpeedKm">0</span>&nbsp;km/h</div>' +
        '<div><span id="infoSpeed">0</span>&nbsp;m/s</div>' +
        '<div><img src="agricultural-fertilizer-icon.svg" height="12px">&nbsp;<span id="infoRate">0</span>%</div>'
    '</div>';
    return this._div;
};

function updateSpeed(speed) {
    infoSpeed.innerHTML = speed.toFixed(1);
    infoSpeedKm.innerHTML = (speed * 3.6).toFixed(1);
};

function updateText(text) {
    infoText.innerHTML = text;
};

function setRightRate(rate) {
    infoRate.innerHTML = (rate * 1e2).toFixed(0);
};

info.addTo(map);
var leftInfo = L.control({
    position: 'bottomleft'
});

leftInfo.onAdd = function(map) {
    this._div = L.DomUtil.create('div', 'info');
    this._div.innerHTML =
        '<div class="two-columns">' +
        '<div id="statusLight"></div><div id="statusLabel"></div>' +
        '&#x1F33E;<div><span id="leftInfoTotalArea">0</span>&nbsp;ha</div>' +
        '&#x2611;<div><span id="leftInfoFinishedArea">0</span>&nbsp;ha</div>' +
        '&#x2610;<div><span id="leftInfoMissingArea">0</span>&nbsp;ha</div>' +
        '<img src="agricultural-fertilizer-icon.svg" height="12px"><div><span id="leftInfoRate">0</span>%</div>'
    '</div>';
    return this._div;
};

function setLeftRate(rate) {
    leftInfoRate.innerHTML = (rate * 1e2).toFixed(0);
};

function setTotalArea(totalArea) {
    leftInfoTotalArea.innerHTML = (totalArea * 0.0001).toFixed(2);
};

function setFinishedArea(finishedArea) {
    leftInfoFinishedArea.innerHTML = (finishedArea * 0.0001).toFixed(2);
};

function setMissingArea(missingArea) {
    leftInfoMissingArea.innerHTML = (missingArea * 0.0001).toFixed(2);
};

function addFeature(features, feature) {
    if (turf.area(feature) > 0)
        features.push(feature);
};

function updateMissingArea() {
    let features = [].concat(protocolLayer.toGeoJSON().features);
    addFeature(features, innerLeftPolygon.toGeoJSON());
    addFeature(features, outerLeftPolygon.toGeoJSON());
    addFeature(features, innerRightPolygon.toGeoJSON());
    addFeature(features, outerRightPolygon.toGeoJSON());
    let protocolMultiPolygon = turf.combine(turf.featureCollection(features)).features[0];
    let missingArea = boundariesArea;
    if (typeof protocolMultiPolygon !== "undefined" && turf.area(protocolMultiPolygon) > 0) {
        missingArea = turf.area(turf.difference(boundariesMultiPolygon, protocolMultiPolygon));
    }
    setFinishedArea(boundariesArea - missingArea);
    setMissingArea(missingArea);
};

leftInfo.addTo(map);
L.control.scale({
    'imperial': false
}).addTo(map);

var myMarker = L.marker([], {
    zIndexOffset: 1000
});
var myCircle = L.circle([], {
    radius: 0
});
var myPolyline = L.polyline([], {
    pane: 'vehicle',
    color: 'red'
});
var innerLeftPolygon = L.polygon([], {
    pane: 'active',
    color: 'green',
    fillOpacity: 0.3
});
var innerRightPolygon = L.polygon([], {
    pane: 'active',
    color: 'green',
    fillOpacity: 0.3
});
var outerLeftPolygon = L.polygon([], {
    pane: 'active',
    color: 'green',
    fillOpacity: 0.1
});
var outerRightPolygon = L.polygon([], {
    pane: 'active',
    color: 'green',
    fillOpacity: 0.1
});

var leftRate = 0;
var rightRate = 0;

function onLocationFound(e) {
    myMarker.setLatLng(e.latlng);
    myCircle.setLatLng(e.latlng);
    if (isFinite(e.accuracy)) {
        myCircle.setRadius(e.accuracy);
    }
    myPolyline.setLatLngs(L.GeoJSON.coordsToLatLngs(e.indicator, 1));
    innerLeftPolygon.setLatLngs(L.GeoJSON.coordsToLatLngs(e.inner_left_polygon, 1));
    innerRightPolygon.setLatLngs(L.GeoJSON.coordsToLatLngs(e.inner_right_polygon, 1));
    outerLeftPolygon.setLatLngs(L.GeoJSON.coordsToLatLngs(e.outer_left_polygon, 1));
    outerRightPolygon.setLatLngs(L.GeoJSON.coordsToLatLngs(e.outer_right_polygon, 1));
    leftRate = e.left_rate;
    rightRate = e.right_rate;
    setLeftRate(leftRate);
    setRightRate(rightRate);
    if (!map.hasLayer(myMarker)) {
        myMarker.addTo(map);
        myCircle.addTo(map);
        myPolyline.addTo(map);
        innerLeftPolygon.addTo(map);
        innerRightPolygon.addTo(map);
        outerLeftPolygon.addTo(map);
        outerRightPolygon.addTo(map);
    }
    if (!map.getBounds().contains(e.latlng)) {
        map.setView(e.latlng);
    }
    if (typeof e.heading === "undefined") {
        updateText('Speed and heading unavailable.');
    } else if (e.speed < e.min_speed) {
        updateText('too slow');
        updateSpeed(e.speed);
        updateMissingArea();
    } else {
        updateText('');
        updateSpeed(e.speed);
        updateMissingArea();
    }
}
map.setView([47.32, 8.2], 16);
