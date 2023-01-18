exportName = "boundaries";
var removedLayers = undefined;

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
        enableButtons();
        shapeInputForm.fileInput.value = "";
    }
    xhr.open('POST', '/api/convert_shape_files/');
    xhr.send(formData);
}

shapeInputForm.fileInput.onchange = () => {
    importShapes();
}

L.Polyline.prototype.options.showMeasurements = true;
L.Polygon.prototype.options.measurementOptions = {
    ha: true
};
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
    layerGroup: importLayers,
});

function enableButtons() {
    shapeInputForm.exportButton.disabled = false;
    shapeInputForm.saveAsBoundariesButton.disabled = false;
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

function saveAsBoundaries() {
    let saveData = JSON.stringify(importLayers.toGeoJSON());
    sessionStorage.setItem('vigor22:boundaries', saveData);
}

function loadBoundaries() {
    let storedData = sessionStorage.getItem('vigor22:boundaries');
    if (storedData == null) {
        return;
    }
    importLayers.clearLayers();
    importLayers.addData(JSON.parse(storedData));
    map.fitBounds(importLayers.getBounds());
    enableButtons();
};

function myFunction() {
    var x = document.getElementById("myNavbar");
    if (x.className === "navbar") {
        x.className += " responsive";
    } else {
        x.className = "navbar";
    }
}

restoreMapView();
