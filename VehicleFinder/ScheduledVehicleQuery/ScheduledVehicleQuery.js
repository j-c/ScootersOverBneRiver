const uuidv1 = require("uuid/v1");

module.exports = async function (context, myTimer) {
    var timeStamp = new Date().toISOString();
    if(myTimer.isPastDue)
    {
        context.log("JavaScript is running late!");
    }

    const id = uuidv1();
    const orchestrationName = "BatchQueryForVehicles";
    let startArgs = [{
        FunctionName: orchestrationName,
        //Input: req.body,
        InstanceId: id
    }];

    context.bindings.starter = startArgs;
    context.log(`Instance of ${orchestrationName} (${id}) has been queued.`, timeStamp);
    context.done(null);
}; 
