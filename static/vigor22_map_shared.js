map.createPane('boundaries');
map.createPane('plan');
map.createPane('protocol');
map.getPane('boundaries').style.zIndex = 390;
map.getPane('plan').style.zIndex = 391;
map.getPane('protocol').style.zIndex = 392;

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
var boundariesMultiPolygon = undefined;
var boundariesArea = 0;

function setBoundaries(feature_collection) {
    boundariesLayer.clearLayers();
    boundariesLayer.addData(feature_collection);
    boundariesMultiPolygon = turf.combine(boundariesLayer.toGeoJSON()).features[0];
    boundariesArea = turf.area(boundariesMultiPolygon);
    setTotalArea(boundariesArea);
    updateMissingArea();
    if (boundariesLayer.getBounds().isValid())
        map.fitBounds(boundariesLayer.getBounds());
}

function setPlan(feature_collection) {
    planLayer.clearLayers();
    planLayer.addData(feature_collection);
    updateMissingArea();
    if (planLayer.getBounds().isValid())
        map.fitBounds(planLayer.getBounds());
}

function setProtocol(feature_collection) {
    protocolLayer.clearLayers();
    protocolLayer.addData(feature_collection);
    updateMissingArea();
}
