# ScootersOverBneRiver
Source for the various components of http://scootersbneriver.coolshitindustries.com

# Config
To run Azure Functions locally, create `local.settings.json` in both ScootersOverBneRiver and VehicleFinder. Refer to `_SAMPLE.local.settings.json` in each directory for an example.

# Brief architectural overview
Durable azure functions are used to query scooter data from Multicycles.org and placed in an Azure storage queue for further processing.

Items in the queue are evaluated to see if it's on the river (TODO: implment bridge rejection). The result is placed in an Azure storage table, queriable by another azure function.

The site itself is a static site hosted on Azure storage (V2).