"use strict";

const config = require("../common/config.js");
const riverWaypoints = require("../common/river-waypoints.json");
const df = require("durable-functions");
const azure = require("azure-storage");
const moment = require("moment");


module.exports = df.orchestrator(function*(context){
    let waypoints = riverWaypoints.waypoints;
    if (!context.df.isReplaying) {
        context.log(`Batch querying ${waypoints.length} locations.`);
    } 

    const queryRetryOptions = new df.RetryOptions(60000, 5);
    const secondsBetweenRequests = config.MulticyclesSecondsBetweenRequests;
    let tasks = [];
    for (let i = 0; i < waypoints.length; i++) {
        // Throttling requests
        if (i !== 0) {
            const waitTill = moment.utc(context.df.currentUtcDateTime).add(secondsBetweenRequests, "s");
            yield context.df.createTimer(waitTill.toDate());
        }
        let w = waypoints[i];
        w.index = i;
        tasks.push(yield context.df.callActivityWithRetry("QueryForVehicles", queryRetryOptions, w));
        // TODO: Improve performance by writing to queue after results rather than querying and deduping data.
    }

    const totalResults = tasks.reduce((acc, curr) => acc + curr.vehicles.length, 0);
    context.log(`${context.executionContext.functionName} ${context.executionContext.invocationId} - Queried ${waypoints.length} waypoints and found ${totalResults} results.`);

    let foundVehicles = flattenTasksToVehicles(tasks);

    // Create queue if not present
    const destinationName = config.LocationEvaluationQueueName;
    var retryOperations = new azure.ExponentialRetryPolicyFilter();
    var queueService = azure.createQueueService().withFilter(retryOperations);
    queueService.messageEncoder = new azure.QueueMessageEncoder.TextBase64QueueMessageEncoder();
    queueService.createQueueIfNotExists(destinationName, function(error) {
        if (error) {
            context.log.error(`${context.executionContext.functionName} ${context.executionContext.invocationId} - Error creating queue ${error}`);
        }
    });

    // Store in queue for further processing    
    foundVehicles.forEach(v => {
        queueService.createMessage(destinationName, JSON.stringify(v), function(error) {
            if (!error) {
                context.log(`${context.executionContext.functionName} ${context.executionContext.invocationId} - Queued ${v.id} for location evaluation.`);
            } else {
                context.log.error(`${context.executionContext.functionName} ${context.executionContext.invocationId} - ${error}`);
            }
        });
    });

    // Done
    context.log(`${context.executionContext.functionName} ${context.executionContext.invocationId} - Queued ${foundVehicles.length} vehicles to be evaluated.`);
});

function getUniqueVehicles(vehicleArray) {
    return vehicleArray.filter((e, i, a) => {
        return i === a.findIndex(e2 => 0 === e.id.localeCompare(e2.id));
    });
}

function flattenTasksToVehicles (tasks) {
    let foundVehicles = [].concat.apply([], tasks.map(t => t.vehicles));
    return getUniqueVehicles(foundVehicles);
}