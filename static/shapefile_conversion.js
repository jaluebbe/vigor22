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

var map = L.map('map');
var openTopoMap = L.tileLayer.wms('https://sgx.geodatenzentrum.de/wms_topplus_open', {
    layers: 'web_scale',
    maxZoom: 19,
    attribution: '&copy <a href="https://www.bkg.bund.de">BKG</a> 2021, ' +
        '<a href= "http://sg.geodatenzentrum.de/web_public/Datenquellen_TopPlus_Open.pdf" >data sources</a> '
}).addTo(map);
map.attributionControl.addAttribution('<a href="https://github.com/jaluebbe/vigor22">Source on GitHub</a>');
// add link to an imprint and a privacy statement if the file is available.
function addPrivacyStatement() {
    var xhr = new XMLHttpRequest();
    xhr.open('HEAD', "./static/datenschutz.html");
    xhr.onload = function() {
        if (xhr.status === 200)
            map.attributionControl.addAttribution(
                '<a href="./static/datenschutz.html" target="_blank">Impressum & Datenschutzerkl&auml;rung</a>'
            );
    }
    xhr.send();
}
addPrivacyStatement();
var importLayers = L.geoJSON([], {
    onEachFeature: onEachFeature,
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
};
legend.addTo(map);
map.setView([52.52, 7.3], 13);

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
        shapeInputForm.exportButton.disabled = false;
        importLayers.clearLayers();
        jsonResponse = JSON.parse(xhr.responseText);
        exportName = jsonResponse.file_name;
        importLayers.addData(jsonResponse.geojson);
        map.fitBounds(importLayers.getBounds());
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
    pom.setAttribute('href', 'data:application/geo+json;charset=utf-8,' + encodeURIComponent(importLayers.toGeoJSON()));
    pom.setAttribute('download', fileName);
    if (document.createEvent) {
        var event = document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        pom.dispatchEvent(event);
    } else {
        pom.click();
    }
};
shapeInputForm.fileInput.onchange = () => {
    importShapes();
}
