map.createPane('other');
map.createPane('boundaries');
map.createPane('plan');
map.createPane('protocol');
map.getPane('boundaries').style.zIndex = 390;
map.getPane('plan').style.zIndex = 391;
map.getPane('protocol').style.zIndex = 392;
map.getPane('other').style.zIndex = 393;

function onEachFeature(feature, layer) {
    layer.on('click', function(eo) {
        clickedShape(eo);
    });
    var tooltipContent =
        "<pre>" + JSON.stringify(feature.properties, undefined, 2) + "</pre>";
    layer.bindTooltip(tooltipContent, {
        sticky: true,
        direction: "top",
        offset: [0, -5]
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
            color: "grey"
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
            fillOpacity: 0.1,
            weight: 1.5,
            color: "grey"
        });
    }
}).addTo(map);
layerControl.addOverlay(otherLayers, "other layers");
var boundariesLayerLabel = "<span style='background-color:rgba(0, 51, 153, 0.2)'>Boundaries</span>";
var planLayerLabel = "<span style='background-color:rgba(255, 204, 0, 0.2)'>Plan</span>";
var protocolLayerLabel = "<span style='background-color:rgba(0, 238, 0, 0.2)'>Protocol</span>";
layerControl.addOverlay(boundariesLayer, boundariesLayerLabel);
layerControl.addOverlay(planLayer, planLayerLabel);
layerControl.addOverlay(protocolLayer, protocolLayerLabel);

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


function importShapes() {
    var selectedLayer = layerSelectionMapping[importTypeSelect.value];
    if (document.getElementById("checkReplaceShapes").checked) {
        selectedLayer.clearLayers();
    }
    let fileInput = document.getElementById("fileInput");
    for (var i = 0; i < fileInput.files.length; i++) {
        var fr = new FileReader();
        fr.onload = function(fileData) {
            let geojsonInput = JSON.parse(fileData.target.result);
            selectedLayer.addData(geojsonInput);
            map.fitBounds(selectedLayer.getBounds());
        };
        fr.readAsText(fileInput.files[i])
    }
};

function exportShapes() {
    let fileName = prompt('Choose file name', 'download.geojson');
    if (fileName === null || fileName.length == 0) {
        return;
    }

    if (document.getElementById("checkDrawnOnly").checked) {
        var dataExport = JSON.stringify(layerSelectionMapping[importTypeSelect.value].toGeoJSON());
    } else {
        var dataExport = JSON.stringify(map.pm.getGeomanLayers(true).toGeoJSON());
    }

    var pom = document.createElement('a');
    pom.setAttribute('href', 'data:application/geo+json;charset=utf-8,' + encodeURIComponent(dataExport));
    pom.setAttribute('download', fileName);
    if (document.createEvent) {
        var event = document.createEvent('MouseEvents');
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
    this._div.innerHTML =
        '<h4>Data transfer and drawing</h4><table>' +
        '<tr><td><select id="importTypeSelect">' +
        '<option selected value="other">other</option>' +
        '<option value="boundaries">boundaries</option>' +
        '<option value="plan">plan</option>' +
        '<option value="protocol">protocol</option>' +
        '</select></td><td>layer type</td></tr>' +
        '<tr><td colspan="2"><input style="font-size: 9px;" type="file" id="fileInput" ' +
        'accept=".geojson,application/json,application/geo+json" multiple></td></tr>' +
        '<tr><td><button onclick="importShapes();">import</button></td><td>' +
        '<input type="checkbox" id="checkReplaceShapes">&nbsp;and replace</td></tr>' +
        '<tr><td><button onclick="exportShapes();">export</button></td>' +
        '<td><input type="checkbox" id="checkDrawnOnly">&nbsp;selected only</td></tr>'
    '</table>';
    L.DomEvent.disableClickPropagation(this._div);
    return this._div;
};

legend.addTo(map);
const importTypeSelect = document.getElementById("importTypeSelect");
const layerSelectionMapping = {
    "other": otherLayers,
    "boundaries": boundariesLayer,
    "plan": planLayer,
    "protocol": protocolLayer
};

function refreshImportLayerSelection() {
    map.pm.setGlobalOptions({
        layerGroup: layerSelectionMapping[importTypeSelect.value],
    });
}
importTypeSelect.onchange = refreshImportLayerSelection;
refreshImportLayerSelection();
