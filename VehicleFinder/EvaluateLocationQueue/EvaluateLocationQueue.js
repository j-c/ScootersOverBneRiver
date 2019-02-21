// TODO: Implemnt a way to allow an ID seen on the water to remain there and not move elsewhere.

const CURRENT_VISIBLE_PARTITIONKEY = "cv";
const HISTORIC_DROWNED_PARTITIONKEY = "hd";

const config = require("../common/config.js");
const azure = require("azure-storage");
const isInRiver = require("../common/is-in-river.js");
const uuidv1 = require("uuid/v1");

module.exports = async function (context, message) {
    context.log("JavaScript queue trigger function processed work item", message);

    const tableName = config.VehiclesInRiverTable;

    const retryOperations = new azure.ExponentialRetryPolicyFilter();
    const tableService = azure.createTableService().withFilter(retryOperations);
    tableService.createTableIfNotExists(tableName, function(error) {
        if (error) {
            context.log.error(`Error creating table: ${error}`);
        }
    });

    /*
    {
	"id": "ODCP5JQYB36DP",
	"lat": -27.466737,
	"lng": 153.024991,
	"limeFields": {
        "status": "locked"
    }
	"provider": {
		"slug": "lime"
	},
	"queriedOn": 1542451516069
    }
    */
    const vehicle = message;
    let vehicleIsInRiver = isInRiver(vehicle.lat, vehicle.lng);

    // TODO: see if scooter currently exists

    /*
     If vehicle is not downed, check to see if it was last seen as drowned.
     If so, move it to historic drowned, otherwise insert into "current" partition
     */
    if (vehicleIsInRiver) {
        insertVehicleIntoCurrentVisiblePartition(vehicle);
        return; // Done
    } else {
        tableService.retrieveEntity(tableName, CURRENT_VISIBLE_PARTITIONKEY, vehicle.id, (error, resultEntity) => {
            if (!error) {
                if (resultEntity.isDrowned._) {
                    moveVehicleIntoHistoricDrownedPartition(resultEntity, (error) => {
                        if (error) {
                            context.log.error(error);
                        }
                        insertVehicleIntoCurrentVisiblePartition(vehicle);
                    });
                } else {
                    insertVehicleIntoCurrentVisiblePartition(vehicle);
                }
            } else {
                // Not found.
                insertVehicleIntoCurrentVisiblePartition(vehicle);
            }
        });
    }

    function insertVehicleIntoCurrentVisiblePartition(vehicle) {
        const entGen = azure.TableUtilities.entityGenerator;
        var entity = {
            PartitionKey: CURRENT_VISIBLE_PARTITIONKEY,
            RowKey: entGen.String(vehicle.id),
            vehicleId: entGen.String(vehicle.id),
            lat: entGen.Double(vehicle.lat),
            lng: entGen.Double(vehicle.lng),
            status: entGen.String(vehicle.limeFields.status),
            providerSlug: entGen.String(vehicle.provider.slug),
            queriedOn: entGen.DateTime(new Date(vehicle.queriedOn)),
            isDrowned: entGen.Boolean(vehicleIsInRiver)
        };
        tableService.insertOrReplaceEntity(tableName, entity, function(error) {
            if (!error) {
                // result contains the ETag for the new entity
            }
        });
    }

    function moveVehicleIntoHistoricDrownedPartition(vehicleEntity, postOldDeleteCallback) {
        const entGen = azure.TableUtilities.entityGenerator;
        const rowKey = uuidv1();
        var newEntity = {
            PartitionKey: HISTORIC_DROWNED_PARTITIONKEY,
            RowKey: entGen.String(rowKey),
            vehicleId: entGen.String(vehicleEntity.vehicleId._),
            lat: entGen.Double(vehicleEntity.lat._),
            lng: entGen.Double(vehicleEntity.lng._),
            status: entGen.String(vehicleEntity.status._),
            providerSlug: entGen.String(vehicleEntity.providerSlug._),
            queriedOn: entGen.DateTime(vehicleEntity.queriedOn._),
            isDrowned: entGen.Boolean(vehicleEntity.isDrowned._)
        };

        // Add new row with historic drowned partition key
        tableService.insertOrReplaceEntity(tableName, newEntity, function(error) {
            if (!error) {
                // Delete old row
                tableService.deleteEntity(tableName, vehicleEntity, postOldDeleteCallback);
            } else {
                context.log.error(error);
            }
        });    
    }
};