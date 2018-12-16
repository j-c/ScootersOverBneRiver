const azure = require("azure-storage");

const tableName = "DrownedVehicles";

module.exports = function (context /*, req */) {
    const storageHost = process.env["DrownedVehiclesStorageHost"];
    const sasToken = process.env["DrownedVehiclesStorageSas"];
    const retryOperations = new azure.ExponentialRetryPolicyFilter();
    const tableService = azure.createTableServiceWithSas(storageHost, sasToken).withFilter(retryOperations);

    let query = new azure.TableQuery().select(["queriedOn"]).where("isDrowned == ?", true);
    let latestStats = null;

    const responseHeaders = {
        "Content-Type": "application/json"
    };

    tableService.queryEntities(tableName, query, null, queryCallback);
    
    function queryCallback (error, result /*, response */) {
        if (error) {
            context.log.error(error);
            context.res = {
                status: 500,
                headers: responseHeaders,
                body: { "message": "bad" }
            };
            context.done();
        } else {
            latestStats = tallyStats(result.entries, latestStats);
            if (result.continuationToken) {
                tableService.queryEntities(tableName, result.continuationToken, null, queryCallback);
            } else {
                context.res = {
                    headers: responseHeaders,
                    body: latestStats
                };
                context.done(); 
            }
        }
    }
};

function tallyStats (vehicles, runningStats) {
    if (!vehicles || vehicles.length == 0) {
        return {
            count: 0,
            latest: null
        };
    }

    let latest = (runningStats && runningStats.latest) || vehicles[0].queriedOn._;
    let earliest = (runningStats && runningStats.earliest) || vehicles[0].queriedOn._;
    vehicles.map(e => e.queriedOn._).forEach(e => {
        if (e > latest) {
            latest = e;
        } else if (e < earliest) {
            earliest = e;
        }
    });
    let count = vehicles.length;
    if (runningStats && runningStats.count) {
        count += runningStats.count;
    }
    return {
        count: count,
        latest: latest,
        earliest: earliest
    };
}
