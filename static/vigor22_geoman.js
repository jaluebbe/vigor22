map.createPane('other');
map.createPane('boundaries');
map.createPane('plan');
map.getPane('boundaries').style.zIndex = 390;
map.getPane('plan').style.zIndex = 391;
map.getPane('other').style.zIndex = 393;

function formatTooltip(content) {
    str = '<div class="tooltip-grid-container">';
    for (const key in content) {
        str = str + "<div>" + key + ":</div><div>" + content[key] + "</div>";
    }
    str = str + "</div>";
    return str;
}

L.Polyline.prototype.options.showMeasurements = true;
L.Polygon.prototype.options.measurementOptions = {
    ha: true
};

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
    layer.on('click', function(eo) {
        let activeLayer = layerSelectionMapping[importTypeSelect.value];
        if (activeLayer.hasLayer(eo.target))
            clickedShape(eo);
    });
}

function styleShape(feature, styleProperties) {
    return styleProperties;
}

var otherLayers = L.geoJSON([], {
    onEachFeature: onEachFeature,
    pane: 'other',
    style: function(feature) {
        return styleShape(feature, {
            fillColor: "#ff0000",
            fillOpacity: 0.1,
            weight: 1.5,
            color: "grey"
        });
    }
}).addTo(map);
var boundariesLayer = L.geoJSON([], {
    onEachFeature: onEachFeature,
    pane: 'boundaries',
    style: function(feature) {
        return styleShape(feature, {
            fillColor: "#003399",
            fillOpacity: 0.1,
            weight: 1.5,
            color: "blue"
        });
    }
}).addTo(map);
var planLayer = L.geoJSON([], {
    onEachFeature: onEachFeature,
    pane: 'plan',
    style: function(feature) {
        return styleShape(feature, {
            fillColor: "#ffcc00",
            fillOpacity: 0.15,
            weight: 1.5,
            color: "grey"
        });
    }
}).addTo(map);
var otherLayersLabel = "<span style='background-color:rgba(255, 0, 0, 0.2)'>other layers</span>";
var boundariesLayerLabel = "<span style='background-color:rgba(0, 51, 153, 0.2)'>Boundaries</span>";
var planLayerLabel = "<span style='background-color:rgba(255, 204, 0, 0.2)'>Plan</span>";
layerControl.addOverlay(otherLayers, otherLayersLabel);
layerControl.addOverlay(boundariesLayer, boundariesLayerLabel);
layerControl.addOverlay(planLayer, planLayerLabel);

map.pm.addControls({
    position: 'topleft',
    drawCircle: false,
    drawPolyline: false,
    drawRectangle: false,
    drawCircleMarker: false,
    drawMarker: false,
    oneBlock: true,
});

function clickedShape(eo) {
    if (!map.pm.globalRemovalModeEnabled())
        console.log(eo);
}

map.on('pm:create', function(e) {
    e.layer.on({
        click: clickedShape
    })
});

map.on('pm:cut', function(eo) {
    if (eo.layer.feature !== undefined) {
        if (typeof eo.originalLayer.feature !== "undefined") {
            eo.layer.feature.properties = eo.originalLayer.feature.properties;
            eo.layer.setTooltipContent(formatTooltip(eo.layer.feature.properties));
        }
    }
});

function importFileContent(fileContent, targetLayer, showMeasurements = false) {
    let geojsonInput = JSON.parse(fileContent);
    L.Polygon.prototype.options.showMeasurements = showMeasurements;
    targetLayer.addData(geojsonInput);
    map.fitBounds(targetLayer.getBounds());
    refreshImportLayerSelection();
};

function exportFromLayer(sourceLayer, exportName) {
    let fileName = prompt('Choose file name', exportName + '_' + getDateString() + '.json');
    if (fileName === null || fileName.length == 0) {
        return;
    }
    let dataExport = JSON.stringify(sourceLayer.toGeoJSON());
    let pom = document.createElement('a');
    pom.setAttribute('href', 'data:application/geo+json;charset=utf-8,' + encodeURIComponent(dataExport));
    pom.setAttribute('download', fileName);
    if (document.createEvent) {
        let event = document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        pom.dispatchEvent(event);
    } else {
        pom.click();
    }
};

function importBoundaries() {
    let fileInput = document.getElementById("fileInput");
    let storedData = sessionStorage.getItem('vigor22:boundaries');
    if (fileInput.files.length == 0 && storedData == null) {
        return;
    }
    boundariesLayer.clearLayers();
    for (var i = 0; i < fileInput.files.length; i++) {
        var fr = new FileReader();
        fr.onload = function(fileData) {
            importFileContent(fileData.target.result, boundariesLayer, true);
        };
        fr.readAsText(fileInput.files[i])
    }
    if (fileInput.files.length == 0) {
        importFileContent(storedData, boundariesLayer, true);
    }
    fileInput.value = "";
};

function exportBoundaries() {
    exportFromLayer(boundariesLayer, "boundaries");
};

function updateRateDropdown() {
    let key = rateNameSelect.value;
    let maxValue = turf.propReduce(planLayer.toGeoJSON(), function(previousValue, currentProperties, featureIndex) {
        return Math.max(previousValue, currentProperties[key])
    }, 0);
    rateMaximum.value = maxValue;
};

function updateConfigMenu() {
    rateNameSelect.length = 0;
    rateMaximum.value = 0;
    let features = planLayer.toGeoJSON().features;
    if (features.length > 0) {
        let properties = features[0].properties;
        Object.keys(properties).forEach(key => {
            if (typeof properties[key] === 'number') {
                let opt = document.createElement('option');
                opt.value = key;
                opt.text = key;
                rateNameSelect.appendChild(opt);
            }
        })
        updateRateDropdown();
    }
};

function importPlan() {
    let fileInput = document.getElementById("fileInput");
    let storedData = sessionStorage.getItem('vigor22:plan');
    if (fileInput.files.length == 0 && storedData == null) {
        return;
    }
    planLayer.clearLayers();
    for (var i = 0; i < fileInput.files.length; i++) {
        var fr = new FileReader();
        fr.onload = function(fileData) {
            importFileContent(fileData.target.result, planLayer);
            updateConfigMenu();
        };
        fr.readAsText(fileInput.files[i])
    }
    if (fileInput.files.length == 0) {
        importFileContent(storedData, planLayer);
        updateConfigMenu();
    }
    fileInput.value = "";
};

function exportPlan() {
    exportFromLayer(planLayer, "plan");
};

function importProject() {
    let fileInput = document.getElementById("fileInput");
    if (fileInput.files.length == 0) {
        return;
    }
    boundariesLayer.clearLayers();
    planLayer.clearLayers();
    otherLayers.clearLayers();
    for (var i = 0; i < fileInput.files.length; i++) {
        var fr = new FileReader();
        fr.onload = function(fileData) {
            let projectInput = JSON.parse(fileData.target.result);
            L.Polygon.prototype.options.showMeasurements = true;
            boundariesLayer.addData(projectInput.boundaries);
            L.Polygon.prototype.options.showMeasurements = false;
            planLayer.addData(projectInput.plan);
            otherLayers.addData(projectInput.other);
            if (boundariesLayer.getBounds().isValid())
                map.fitBounds(boundariesLayer.getBounds());
            else if (planLayer.getBounds().isValid())
                map.fitBounds(planLayer.getBounds());
            refreshImportLayerSelection();
            updateConfigMenu();
            if (typeof projectInput.settings !== "undefined") {
                rateMaximum.value = projectInput.settings.rate_maximum;
                rateNameSelect.value = projectInput.settings.rate_key;
                throwingRangeInput.value = projectInput.settings.throwing_range;
                minSpeedInput.value = projectInput.settings.min_speed;
            }
        };
        fr.readAsText(fileInput.files[i])
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
        other: otherLayers.toGeoJSON(),
        settings: {
            rate_maximum: parseFloat(rateMaximum.value),
            rate_key: rateNameSelect.value,
            throwing_range: parseFloat(throwingRangeInput.value),
            min_speed: parseFloat(minSpeedInput.value)
        }
    });
    sessionStorage.setItem('vigor22:project', dataExport);
    let pom = document.createElement('a');
    pom.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(dataExport));
    pom.setAttribute('download', fileName);
    if (document.createEvent) {
        let event = document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
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

var drawingLegend = L.control({
    position: 'topleft'
});
drawingLegend.onAdd = function(map) {
    this._div = L.DomUtil.create('div', 'info legend');
    let tempSource = document.getElementById('drawingInputTemplate');
    this._div.appendChild(tempSource.content.cloneNode(true));
    L.DomEvent.disableClickPropagation(this._div);
    return this._div;
}
drawingLegend.addTo(map);

const importTypeSelect = document.getElementById("importTypeSelect");
const layerSelectionMapping = {
    "other": otherLayers,
    "boundaries": boundariesLayer,
    "plan": planLayer,
};

function refreshImportLayerSelection() {
    map.pm.disableGlobalCutMode();
    let activeLayer = layerSelectionMapping[importTypeSelect.value];
    if (importTypeSelect.value == 'boundaries') {
        L.Polygon.prototype.options.showMeasurements = true;
    } else {
        L.Polygon.prototype.options.showMeasurements = false;
    }
    Object.values(layerSelectionMapping).forEach(layer => {
        if (layer == activeLayer) {
            layer.pm.setOptions({
                allowCutting: true,
                allowRemoval: true,
                allowEditing: true,
                allowRotation: true
            });
        } else {
            layer.pm.setOptions({
                allowCutting: false,
                allowRemoval: false,
                allowEditing: false,
                allowRotation: false
            });
        }
    });
    map.pm.setGlobalOptions({
        layerGroup: activeLayer,
    });
}
refreshImportLayerSelection();
restoreMapView();
