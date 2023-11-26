map.createPane('boundaries');
map.createPane('plan');
map.getPane('boundaries').style.zIndex = 390;
map.getPane('plan').style.zIndex = 391;

exportName = "plan";
var selectedShape = undefined;

function getDateString() {
    let date = new Date();
    return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + "_" + date.getHours() + "-" + date.getMinutes();
}

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

function clickedShape(eo) {
    if (map.pm.globalDrawModeEnabled()) {return;}
    selectedShape = eo.target;
    rateEditInput.disabled = false;
    let rateProperty = selectedShape.feature.properties.V22RATE;
    if (typeof rateProperty === "undefined") {
        rateEditInput.value = "";
    } else {
        rateEditInput.value = (parseFloat(rateProperty) * 100).toFixed(0);
    }
    L.DomEvent.stopPropagation(eo);

};

function onEachFeature(feature, layer) {
    layer.bindTooltip(formatTooltip(feature.properties), {
        sticky: true,
        direction: "top",
        offset: [0, -5]
    });
    layer.on('click', function(eo) {
        clickedShape(eo);
    });
}

map.on('pm:create', function(eo) {
    eo.layer.bindTooltip(formatTooltip({}), {
        sticky: true,
        direction: "top",
        offset: [0, -5]
    });
    eo.layer.on({
        click: clickedShape
    });
    let feature = eo.layer.feature = eo.layer.feature || {};
    feature.type = feature.type || "Feature";
    let props = feature.properties = feature.properties || {};
});

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
    },
    pmIgnore: true
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
    }}).addTo(map);
var boundariesLayerLabel = "<span style='background-color:rgba(0, 51, 153, 0.2)'>Boundaries</span>";
var planLayerLabel = "<span style='background-color:rgba(255, 204, 0, 0.2)'>Plan</span>";
layerControl.addOverlay(boundariesLayer, boundariesLayerLabel);
layerControl.addOverlay(planLayer, planLayerLabel);

var legend = L.control({
    position: 'topright'
});
legend.onAdd = function(map) {
    this._div = L.DomUtil.create('div', 'info legend');
    let tempSource = document.getElementById('shapeInputTemplate');
    this._div.appendChild(tempSource.content.cloneNode(true));
    L.DomEvent.disableClickPropagation(this._div);
    return this._div;
}
legend.addTo(map);

function importBoundaries() {
    let storedData = sessionStorage.getItem('vigor22:boundaries');
    if (storedData != null) {
        boundariesLayer.clearLayers();
        boundariesLayer.addData(JSON.parse(storedData));
    }
};

function importShapes() {
    const files = shapeInputForm.fileInput.files;
    if (files.length == 0)
        return;
    const formData = new FormData();
    for (const file of files) {
        formData.append('files', file);
    }
    formData.append('input_crs', shapeInputForm.inputCrs.value);
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
        if (shapeInputForm.appendShapes.checked) {
            shapeInputForm.appendShapes.checked = false;
        } else {
            planLayer.clearLayers();
        }
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
        map.fitBounds(planLayer.getBounds());
        shapeInputForm.fileInput.value = "";
        updateConfigMenu();
    }
    xhr.open('POST', '/api/convert_shape_files/');
    xhr.send(formData);
}

map.pm.addControls({
    position: 'topleft',
    drawCircle: false,
    drawPolyline: false,
    drawRectangle: false,
    drawCircleMarker: false,
    drawMarker: false,
    dragMode: false,
    rotateMode: false,
    cutPolygon: false,
    oneBlock: true,
});

map.pm.setGlobalOptions({
    layerGroup: planLayer,
});

map.pm.setPathOptions({
  color: 'grey',
  weight: 1.5,
  fillColor: '#ffcc00',
  fillOpacity: 0.15
});

function exportShapes() {
    let fileName = prompt('Choose file name', exportName + '_' + getDateString() + '.json');
    if (fileName === null || fileName.length == 0) {
        return;
    }
    var pom = document.createElement('a');
    let exportData = JSON.stringify(planLayer.toGeoJSON());
    pom.setAttribute('href', 'data:application/geo+json;charset=utf-8,' + encodeURIComponent(exportData));
    pom.setAttribute('download', fileName);
    if (document.createEvent) {
        var event = document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        pom.dispatchEvent(event);
    } else {
        pom.click();
    }
}

function loadPlan() {
    let storedData = sessionStorage.getItem('vigor22:plan');
    if (storedData == null) {
        return;
    }
    planLayer.clearLayers();
    planLayer.addData(JSON.parse(storedData));
    map.fitBounds(planLayer.getBounds());
    updateConfigMenu();
};

function saveAsPlan() {
    let saveData = JSON.stringify(planLayer.toGeoJSON());
    sessionStorage.setItem('vigor22:plan', saveData);
}

function updateRateDropdown() {
    let key = rateNameSelect.value;
    let maxValue = turf.propReduce(planLayer.toGeoJSON(), function(previousValue, currentProperties, featureIndex) {
        return Math.max(previousValue, currentProperties[key])
    }, 0);
    shapeInputForm.rateMaximum.value = maxValue;
}

function updateConfigMenu() {
    convertRateButton.disabled = true;
    rateNameSelect.length = 0;
    shapeInputForm.rateMaximum.value = 0;
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
        convertRateButton.disabled = false;
    }
}

function convertRate() {
    let myGeoJSON = planLayer.toGeoJSON();
    let features = myGeoJSON.features;
    let key = rateNameSelect.value;
    turf.propEach(myGeoJSON, function(currentProperties, featureIndex) {
        currentProperties["V22RATE"] = (currentProperties[key] / shapeInputForm.rateMaximum.value).toFixed(2);
    });
    planLayer.clearLayers();
    planLayer.addData(myGeoJSON);
}

function myFunction() {
    var x = document.getElementById("myNavbar");
    if (x.className === "navbar") {
        x.className += " responsive";
    } else {
        x.className = "navbar";
    }
}

var rateEditLegend = L.control({
    position: 'topleft'
});
rateEditLegend.onAdd = function(map) {
    this._div = L.DomUtil.create('div', 'info legend');
    let tempSource = document.getElementById('rateEditTemplate');
    this._div.appendChild(tempSource.content.cloneNode(true));
    L.DomEvent.disableClickPropagation(this._div);
    return this._div;
}
rateEditLegend.addTo(map);

function rateEditChanged() {
    selectedShape.feature.properties.V22RATE = parseFloat(rateEditInput.value) / 100;
    selectedShape.setTooltipContent(formatTooltip(selectedShape.feature.properties));
};

map.on('click', function(eo) {
    selectedShape = undefined;
    rateEditInput.disabled = true;
    rateEditInput.value = "";
});

shapeInputForm.fileInput.onchange = () => {
    importShapes();
}
restoreMapView();
importBoundaries();
