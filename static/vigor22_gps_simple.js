map.createPane('boundaries');
map.createPane('plan');
map.createPane('protocol');
map.createPane('active');
map.createPane('vehicle');
map.getPane('boundaries').style.zIndex = 390;
map.getPane('plan').style.zIndex = 391;
map.getPane('protocol').style.zIndex = 392;
map.getPane('active').style.zIndex = 394;
map.getPane('vehicle').style.zIndex = 395;

function formatTooltip(content) {
    str = '<div class="tooltip-grid-container">';
    for (const key in content) {
        if (key == "V22RATE") {
            str = str + "<div>" + key + ":</div><div>" + (100 * content[key]).toFixed(0) + "&percnt;</div>";
        } else {
            str = str + "<div>" + key + ":</div><div>" + content[key] + "</div>";
        }
    }
    str = str + "</div>";
    return str;
}

function getDateString() {
    let date = new Date();
    return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + "_" + date.getHours() + "-" + date.getMinutes();
}

function onEachFeature(feature, layer) {
    layer.bindTooltip(formatTooltip(feature.properties), {
        sticky: true,
        direction: "top",
        offset: [0, -5]
    });
}

function styleShape(feature, styleProperties) {
    return styleProperties;
}

var boundariesLayer = L.geoJSON([], {
    pane: 'boundaries',
    style: function(feature) {
        return styleShape(feature, {
            fillColor: "#003399",
            fillOpacity: 0.1,
            weight: 1.5,
            color: "blue"
        });
    }
});
function colourisePlan(rate) {
    if (rate == 1)
        return "#997a00";
    else if (rate >= 0.8)
        return "#ffcc00";
    else if (rate >= 0.6)
        return "#ffe066";
    else
        return "#fff5cc";
}
var planLayer = L.geoJSON([], {
    onEachFeature: onEachFeature,
    pane: 'plan',
    style: function(feature) {
        return styleShape(feature, {
            fillColor: colourisePlan(feature.properties.V22RATE),
            fillOpacity: 0.3,
            weight: 1.5,
            color: "grey"
        });
    }
}).addTo(map);
var protocolLayer = L.geoJSON([], {
    pane: 'protocol',
    style: function(feature) {
        return styleShape(feature, {
            fillColor: "#00ee00",
            fillOpacity: 0.3,
            weight: 1.5,
            color: "grey"
        });
    }
}).addTo(map);
var settings = {};
var noSleep = new NoSleep();
var boundariesMultiPolygon = undefined;
var boundariesArea = 0;

function importProjectFileContent(fileContent) {
    let projectInput = JSON.parse(fileContent);
    boundariesLayer.addData(projectInput.boundaries);
    boundariesMultiPolygon = turf.combine(boundariesLayer.toGeoJSON()).features[0];
    boundariesArea = turf.area(boundariesMultiPolygon);
    setTotalArea(boundariesArea);
    planLayer.addData(projectInput.plan);
    if (projectInput.protocol != null) {
        protocolLayer.addData(projectInput.protocol);
    }
    updateMissingArea();
    Object.assign(settings, projectInput.settings);
    if (boundariesLayer.getBounds().isValid())
        map.fitBounds(boundariesLayer.getBounds());
    else if (planLayer.getBounds().isValid())
        map.fitBounds(planLayer.getBounds());
};

function importShapes(files) {
    const formData = new FormData();
    for (const file of files) {
        formData.append('files', file);
    }
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
        if (xhr.status != 200) {
            if (xhr.responseText == 'Internal Server Error') {
                alert(xhr.responseText);
            } else {
                alert(JSON.parse(xhr.responseText).detail);
            }
            return;
        }
        jsonResponse = JSON.parse(xhr.responseText);
        exportName = jsonResponse.file_name;
        planLayer.addData(jsonResponse.geojson);
        let generatedBoundaries = turf.dissolve(turf.flatten(turf.buffer(planLayer.toGeoJSON(), 0.0001)));
        boundariesLayer.addData(generatedBoundaries);
        map.fitBounds(boundariesLayer.getBounds());
        boundariesMultiPolygon = turf.combine(boundariesLayer.toGeoJSON()).features[0];
        boundariesArea = turf.area(boundariesMultiPolygon);
        setTotalArea(boundariesArea);
        settings.throwing_range = 15;
        settings.min_speed = 1;
        settings.default_speed = 2.22;
    }
    xhr.open('POST', '/api/convert_plan_shape_files/');
    xhr.send(formData);
}

function importProjectOrShapes() {
    let fileInput = dataTransferInputForm.fileInput;
    if (fileInput.files.length == 0) {
        return;
    }
    noSleep.enable();
    boundariesLayer.clearLayers();
    planLayer.clearLayers();
    protocolLayer.clearLayers();
    for (const key in settings) {
        delete settings[key];
    }
    if (fileInput.files[0].type == "application/json") {
        let fr = new FileReader();
        fr.onload = function(fileData) {
            importProjectFileContent(fileData.target.result);
        };
        fr.readAsText(fileInput.files[0])
    } else if (fileInput.files[0].type == "application/zip") {
        importShapes(fileInput.files);
    }
    fileInput.value = "";
};

function exportProject() {
    exportName = "project";
    let fileName = prompt('Choose file name', exportName + '_' + getDateString() + '.json');
    if (fileName === null || fileName.length == 0) {
        return;
    }
    let dataExport = JSON.stringify({
        boundaries: boundariesLayer.toGeoJSON(),
        plan: planLayer.toGeoJSON(),
        protocol: protocolLayer.toGeoJSON(),
        settings: settings
    });
    sessionStorage.setItem('vigor22:project', dataExport);
    let pom = document.createElement('a');
    pom.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(dataExport));
    pom.setAttribute('download', fileName);
    if (document.createEvent) {
        let event = new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
        });
        pom.dispatchEvent(event);
    } else {
        pom.click();
    }
};


var legend = L.control({
    position: 'topright'
});
legend.onAdd = function(map) {
    this._div = L.DomUtil.create('div', 'info legend');
    let tempSource = document.getElementById('dataTransferInputTemplate');
    this._div.appendChild(tempSource.content.cloneNode(true));
    L.DomEvent.disableClickPropagation(this._div);
    return this._div;
}
legend.addTo(map);

var info = L.control({
    position: 'bottomright'
});
info.onAdd = function(map) {
    this._div = L.DomUtil.create('div', 'info');
    this._div.innerHTML =
        '<div class="grid-container">' +
        '<div><span id="infoText">no GPS data</span></div>' +
        '<div class="two-columns">' +
        '<div>Actual</div><div><span id="infoSpeedKm">0</span>&nbsp;km/h</div>' +
        '<div>Target</div><div><span id="infoSpeedKmTarget"></span></div></div>' +
        '<div><img src="agricultural-fertilizer-icon.svg" height="12px">&nbsp;<span id="infoRate">0</span>%</div>'
    '</div>';
    return this._div;
};

function updateSpeed(speed) {
    infoSpeedKm.innerHTML = (speed * 3.6).toFixed(1);
};

function updateText(text) {
    infoText.innerHTML = text;
};

function setRightRate(rate) {
    infoRate.innerHTML = (rate * 1e2).toFixed(0);
    if (rate >= 0.4) {
        let targetSpeed = settings.default_speed / rate;
        infoSpeedKmTarget.innerHTML = (targetSpeed * 3.6).toFixed(1) + "&nbsp;km/h";
    } else {
        infoSpeedKmTarget.innerHTML = "CLOSE";
    }
};

info.addTo(map);
var leftInfo = L.control({
    position: 'bottomleft'
});

leftInfo.onAdd = function(map) {
    this._div = L.DomUtil.create('div', 'info');
    this._div.innerHTML =
        '<div class="two-columns">' +
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

function addFeature(features, feature) {
    if (turf.area(feature) > 0)
        features.push(feature);
};

function updateMissingArea() {
    let features = [].concat(protocolLayer.toGeoJSON().features);
    addFeature(features, leftPolygon.toGeoJSON());
    addFeature(features, rightPolygon.toGeoJSON());
    let protocolMultiPolygon = turf.combine(turf.featureCollection(features)).features[0];
    let missingArea = boundariesArea;
    if (typeof protocolMultiPolygon !== "undefined" && turf.area(protocolMultiPolygon) > 0) {
        missingArea = turf.area(turf.difference(boundariesMultiPolygon, protocolMultiPolygon));
        let protocolShapes = protocolLayer.toGeoJSON();
        if (protocolShapes.features.length > 0) {
            let combinedProtocol = turf.dissolve(turf.flatten(protocolShapes));
            protocolLayer.clearLayers()
            protocolLayer.addData(combinedProtocol);
        }
    }
    setFinishedArea(boundariesArea - missingArea);
    setMissingArea(missingArea);
};

leftInfo.addTo(map);

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
var rightPolygon = L.polygon([], {
    pane: 'active',
    color: 'green',
    fillOpacity: 0.3
});
var leftPolygon = L.polygon([], {
    pane: 'active',
    color: 'green',
    fillOpacity: 0.3
});

var centerRate = 0;

function closeShapes(outerRightPoint, outerLeftPoint, centerPoint) {
    let timestamp = Date.now() / 1e3;
    if (!leftPolygon.isEmpty()) {
        if (![outerRightPoint, centerPoint].includes(undefined)) {
            extendShape(leftPolygon, outerLeftPoint, centerPoint);
        }
        protocolLayer.addData(Object.assign(leftPolygon.toGeoJSON(), {
            properties: {
                rate: centerRate,
                timestamp: timestamp
            }
        }));
        leftPolygon.setLatLngs([]);
    }
    if (!rightPolygon.isEmpty()) {
        if (![outerLeftPoint, centerPoint].includes(undefined)) {
            extendShape(rightPolygon, outerRightPoint, centerPoint);
        }
        protocolLayer.addData(Object.assign(rightPolygon.toGeoJSON(), {
            properties: {
                rate: centerRate,
                timestamp: timestamp
            }
        }));
        rightPolygon.setLatLngs([]);
    }
}

function extendShape(shape, firstPoint, secondPoint) {
    let points = shape.getLatLngs();
    points[0].push(firstPoint.geometry.coordinates.slice().reverse());
    points[0].unshift(secondPoint.geometry.coordinates.slice().reverse());
    shape.setLatLngs(points);
}

function onLocationFound(e) {
    myMarker.setLatLng(e.latlng);
    myCircle.setLatLng(e.latlng);
    if (isFinite(e.accuracy)) {
        myCircle.setRadius(e.accuracy);
    }
    if (!map.hasLayer(myMarker)) {
        myMarker.addTo(map);
        myCircle.addTo(map);
        myPolyline.addTo(map);
        leftPolygon.addTo(map);
        rightPolygon.addTo(map);
    }
    if (!map.getBounds().contains(e.latlng)) {
        map.setView(e.latlng);
    }
    var centerPoint = turf.point([e.longitude, e.latitude]);
    if (typeof e.heading === "undefined") {
        updateText('Speed and heading unavailable.');
        myPolyline.setLatLngs([]);
    } else if (e.speed < settings.min_speed) {
        myPolyline.setLatLngs([]);
        closeShapes();
        centerRate = 0;
        updateText('too slow');
        updateSpeed(e.speed);
        updateMissingArea();
        setRightRate(centerRate);
        sendFeedback({
            right_rate: centerRate,
            longitude: e.longitude,
            latitude: e.latitude,
            speed: e.speed,
            heading: e.heading
        });
    } else {
        updateSpeed(e.speed);
        if (Object.keys(settings).length === 0 && settings.constructor === Object) {
            updateText('no project');
            return;
        };
        updateText('');
        let frontPoint = turf.destination(centerPoint, 5e-3, e.heading);
        let outerLeftPoint = turf.destination(centerPoint, settings.throwing_range * 1e-3, e.heading - 90);
        let outerRightPoint = turf.destination(centerPoint, settings.throwing_range * 1e-3, e.heading + 90);
        myPolyline.setLatLngs([
            [centerPoint.geometry.coordinates.slice().reverse(),
                frontPoint.geometry.coordinates.slice().reverse()
            ],
            [centerPoint.geometry.coordinates.slice().reverse(),
                outerLeftPoint.geometry.coordinates.slice().reverse()
            ],
            [centerPoint.geometry.coordinates.slice().reverse(),
                outerRightPoint.geometry.coordinates.slice().reverse()
            ]
        ]);
        let newRightRate = 0;
        turf.featureEach(planLayer.toGeoJSON(), function(feature, featureIndex) {
            if (turf.booleanPointInPolygon(centerPoint, feature)) {
                if (typeof feature.properties.V22RATE !== "undefined") {
                    newRightRate = feature.properties.V22RATE;
                }
            }
        });
        let rightCoverage = 0;
        turf.featureEach(protocolLayer.toGeoJSON(), function(feature, featureIndex) {
            if (turf.booleanPointInPolygon(centerPoint, feature)) {
                rightCoverage = rightCoverage + feature.properties.coverage;
            }
        });
        if (rightCoverage > 0.3) {
            newRightRate = 0;
        }
        setRightRate(newRightRate);
        updateMissingArea();
        sendFeedback({
            right_rate: newRightRate,
            longitude: e.longitude,
            latitude: e.latitude,
            speed: e.speed,
            heading: e.heading
        });
        if (newRightRate != centerRate) {
            closeShapes(outerRightPoint, outerLeftPoint, centerPoint);
            centerRate = newRightRate;
        }
        if (newRightRate > 0) {
            extendShape(rightPolygon, outerRightPoint, centerPoint);
            extendShape(leftPolygon, outerLeftPoint, centerPoint);
        }
    }
}

function onLocationError(e) {
    updateText('No geolocation information available.');
}
