var exportName = "from_shapefile";

function getDateString() {
    let date = new Date();
    return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + "_" + date.getHours() + "-" + date.getMinutes();
}

function formatTooltip(content) {
    str = '<div class="tooltip-grid-container">';
    for (const key in content) {
        str = str + "<div>" + key + ":</div><div>" + content[key] + "</div>";
    }
    str = str + "</div>";
    return str;
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

var importLayers = L.geoJSON([], {
    onEachFeature: onEachFeature,
    pointToLayer: function(geoJsonPoint, latlng) {
        return L.circleMarker(latlng, {
            radius: 5
        });
    },
    style: function(feature) {
        return styleShape(feature, {
            fillColor: "#0000ff",
            fillOpacity: 0.1,
            weight: 1.0,
            color: "blue"
        });
    }
}).addTo(map);
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
        importLayers.clearLayers();
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
        importLayers.addData(jsonResponse.geojson);
        map.fitBounds(importLayers.getBounds());
        shapeInputForm.exportButton.disabled = false;
        shapeInputForm.saveAsBoundariesButton.disabled = false;
        shapeInputForm.saveAsPlanButton.disabled = false;
        shapeInputForm.fileInput.value = "";
        updateConfigMenu();
    }
    xhr.open('POST', '/api/convert_shape_files/');
    xhr.send(formData);
}

function exportShapes() {
    let fileName = prompt('Choose file name', exportName + '_' + getDateString() + '.json');
    if (fileName === null || fileName.length == 0) {
        return;
    }
    var pom = document.createElement('a');
    let exportData = JSON.stringify(importLayers.toGeoJSON());
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

function resetImportLayers() {
    shapeInputForm.exportButton.disabled = true;
    shapeInputForm.saveAsBoundariesButton.disabled = true;
    shapeInputForm.saveAsPlanButton.disabled = true;
    importLayers.clearLayers();
}

function saveAsBoundaries() {
    let saveData = JSON.stringify(importLayers.toGeoJSON());
    sessionStorage.setItem('vigor22:boundaries', saveData);
    shapeInputForm.saveAsBoundariesButton.style.backgroundColor = '#00339944';
    resetImportLayers();
}

function saveAsPlan() {
    let saveData = JSON.stringify(importLayers.toGeoJSON());
    sessionStorage.setItem('vigor22:plan', saveData);
    shapeInputForm.saveAsPlanButton.style.backgroundColor = '#ffcc0044';
    resetImportLayers();
}

function updateRateDropdown() {
    let key = rateNameSelect.value;
    let maxValue = turf.propReduce(importLayers.toGeoJSON(), function(previousValue, currentProperties, featureIndex) {
        return Math.max(previousValue, currentProperties[key])
    }, 0);
    shapeInputForm.rateMaximum.value = maxValue;
};

function updateConfigMenu() {
    convertRateButton.disabled = true;
    rateNameSelect.length = 0;
    shapeInputForm.rateMaximum.value = 0;
    let features = importLayers.toGeoJSON().features;
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
};

function convertRate() {
    let myGeoJSON = importLayers.toGeoJSON();
    let features = myGeoJSON.features;
    let key = rateNameSelect.value;
    turf.propEach(myGeoJSON, function(currentProperties, featureIndex) {
        currentProperties["V22RATE"] = (currentProperties[key] / shapeInputForm.rateMaximum.value).toFixed(2);
    });
    importLayers.clearLayers();
    importLayers.addData(myGeoJSON);
};

shapeInputForm.fileInput.onchange = () => {
    importShapes();
}
restoreMapView();
