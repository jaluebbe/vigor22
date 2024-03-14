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
        '</div>';
    return this._div;
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

function updateMissingArea() {
    let protocolMultiPolygon = turf.combine(protocolLayer.toGeoJSON()).features[0];
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

map.setView([47.32, 8.2], 16);
