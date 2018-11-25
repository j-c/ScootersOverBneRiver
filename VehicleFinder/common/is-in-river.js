const riverAreaFeature = require("../common/riverarea-feature.json");
const booleanPointInPolygon = require("@turf/boolean-point-in-polygon").default;
const turf =  require("@turf/helpers");

module.exports = function isInRiver (lat, lng) {
    // TODO: Implment bridge filtering
    var point = turf.point([lng, lat]);
    return booleanPointInPolygon(point, riverAreaFeature.geometry);
};
