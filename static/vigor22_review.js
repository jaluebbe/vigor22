map.createPane('other');
map.createPane('boundaries');
map.createPane('plan');
map.createPane('protocol');
map.getPane('boundaries').style.zIndex = 390;
map.getPane('plan').style.zIndex = 391;
map.getPane('protocol').style.zIndex = 392;
map.getPane('other').style.zIndex = 393;

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
var otherLayersLabel = "<span style='background-color:rgba(255, 0, 0, 0.2)'>other layers</span>";
var boundariesLayerLabel = "<span style='background-color:rgba(0, 51, 153, 0.2)'>Boundaries</span>";
var planLayerLabel = "<span style='background-color:rgba(255, 204, 0, 0.2)'>Plan</span>";
var protocolLayerLabel = "<span style='background-color:rgba(0, 238, 0, 0.2)'>Protocol</span>";
layerControl.addOverlay(otherLayers, otherLayersLabel);
layerControl.addOverlay(boundariesLayer, boundariesLayerLabel);
layerControl.addOverlay(planLayer, planLayerLabel);
layerControl.addOverlay(protocolLayer, protocolLayerLabel);

function importProjectFileContent(fileContent) {
    let projectInput = JSON.parse(fileContent);
    boundariesLayer.addData(projectInput.boundaries);
    planLayer.addData(projectInput.plan);
    if (projectInput.protocol != null) {
        protocolLayer.addData(projectInput.protocol);
    }
    otherLayers.addData(projectInput.other);
    if (boundariesLayer.getBounds().isValid())
        map.fitBounds(boundariesLayer.getBounds());
    else if (planLayer.getBounds().isValid())
        map.fitBounds(planLayer.getBounds());
};

function importProject() {
    let fileInput = document.getElementById("fileInput");
    let storedData = sessionStorage.getItem('vigor22:project');
    if (fileInput.files.length == 0 && storedData == null) {
        return;
    }
    boundariesLayer.clearLayers();
    planLayer.clearLayers();
    otherLayers.clearLayers();
    protocolLayer.clearLayers();
    for (var i = 0; i < fileInput.files.length; i++) {
        var fr = new FileReader();
        fr.onload = function(fileData) {
            importProjectFileContent(fileData.target.result);
        };
        fr.readAsText(fileInput.files[i])
    }
    if (fileInput.files.length == 0) {
        importProjectFileContent(storedData);
    }
    fileInput.value = "";
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
restoreMapView();
