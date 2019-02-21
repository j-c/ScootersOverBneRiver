"use strict";
const config = require("../common/config.js");
const { request } = require("graphql-request");

// access_token is passed in query string

module.exports = async function (context, location) {
    context.log(`Querying for vehicles within 400m of ${location.lat} and ${location.lng}.`);
    context.log.verbose(`DEBUG INDEX: ${location.index}`);
    const multiCycleApiKey = process.env["MulticycleApiKey"]; // TODO: Store ion Az Keyvault
    const mutlicycleApiUrl = config.MulticycleApiUrl;
    const endpoint = `${mutlicycleApiUrl}?access_token=${multiCycleApiKey}`;

    const query = `
        query ($lat: Float!, $lng: Float!) {
            vehicles(lat: $lat, lng: $lng) {
                id
                lat
                lng
                ... on Lime {
                    limeFields {
                        status
                    }
                }
                provider {
                    slug,
                }
            }
        }
    `;
    const variables = {
        lat: location.lat,
        lng: location.lng
    };

    const queryTime = Date.now();
    const data = await request(endpoint, query, variables);

    // Save query time as API doesn't tell is when the vehicle was seen.
    data.vehicles.forEach(v => {
        v.queriedOn = queryTime;
    });

    return data;
};