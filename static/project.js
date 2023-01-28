map.createPane('boundaries');
map.createPane('plan');
map.createPane('protocol');
map.getPane('boundaries').style.zIndex = 390;
map.getPane('plan').style.zIndex = 391;
map.getPane('protocol').style.zIndex = 392;

function formatTooltip(content) {
    str = '<div class="tooltip-grid-container">';
    for (const key in content) {
        str = str + "<div>" + key + ":</div><div>" + content[key] + "</div>";
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
var protocolLayer = L.geoJSON([], {
    onEachFeature: onEachFeature,
    pane: 'protocol',
    style: function(feature) {
        return styleShape(feature, {
            fillColor: "#00ee00",
            fillOpacity: feature.properties.coverage / 2,
            weight: 1.5,
            color: "grey"
        });
    }
}).addTo(map);
var boundariesLayerLabel = "<span style='background-color:rgba(0, 51, 153, 0.2)'>Boundaries</span>";
var planLayerLabel = "<span style='background-color:rgba(255, 204, 0, 0.2)'>Plan</span>";
var protocolLayerLabel = "<span style='background-color:rgba(0, 238, 0, 0.2)'>Protocol</span>";
layerControl.addOverlay(boundariesLayer, boundariesLayerLabel);
layerControl.addOverlay(planLayer, planLayerLabel);
layerControl.addOverlay(protocolLayer, protocolLayerLabel);

function importFileContent(fileContent, targetLayer, showMeasurements = false) {
    let geojsonInput = JSON.parse(fileContent);
    L.Polygon.prototype.options.showMeasurements = showMeasurements;
    targetLayer.addData(geojsonInput);
    map.fitBounds(targetLayer.getBounds());
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
        };
        fr.readAsText(fileInput.files[i])
    }
    if (fileInput.files.length == 0) {
        importFileContent(storedData, planLayer);
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
    for (var i = 0; i < fileInput.files.length; i++) {
        var fr = new FileReader();
        fr.onload = function(fileData) {
            let projectInput = JSON.parse(fileData.target.result);
            boundariesLayer.addData(projectInput.boundaries);
            planLayer.addData(projectInput.plan);
            if (boundariesLayer.getBounds().isValid())
                map.fitBounds(boundariesLayer.getBounds());
            else if (planLayer.getBounds().isValid())
                map.fitBounds(planLayer.getBounds());
            if (typeof projectInput.settings !== "undefined") {
                throwingRangeInput.value = projectInput.settings.throwing_range;
                minSpeedInput.value = projectInput.settings.min_speed;
                defaultRateInput.value = projectInput.settings.default_rate * 100;
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
        settings: {
            throwing_range: parseFloat(throwingRangeInput.value),
            min_speed: parseFloat(minSpeedInput.value),
            default_rate: parseFloat(defaultRateInput.value) / 100
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

restoreMapView();
