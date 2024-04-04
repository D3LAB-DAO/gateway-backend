const { createConnection, closeConnection } = require('./db/maria');
const { createTable, saveRequest, getResultsById } = require('./db/queries');
const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const { assert } = require('elliptic/lib/elliptic/utils');

const TIMEOUT = 30000;
const EPOCH = 3000;

const COUNTER_ENDPOINT = "http://localhost:30328";
let connection;

const app = express();
app.use(bodyParser.json());


const pollWithTimeout = (pollingFunction, interval, timeout) => {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            clearInterval(intervalId);
            console.log('Polling timed out. Interval cleared.');
            reject('Timeout'); // Reject the promise on timeout
        }, timeout);

        const intervalId = setInterval(async () => {
            try {
                const result = await pollingFunction();
                if (result && result != {}) {
                    clearTimeout(timeoutId);
                    clearInterval(intervalId);
                    resolve(result); // Resolve the promise when the task completes
                }
            } catch (error) {
                clearTimeout(timeoutId);
                clearInterval(intervalId);
                reject(error); // Reject the promise on error
            }
        }, interval);
    });
};


app.post('/request', async (req, res) => {
    try {
        const { uri, params, deadline } = req.body;
        if (!uri) {
            return res.status(400).send({ error: 'No URI provided.' });
        }
        const _now = new Date();
        const timestamp = _now.getTime();
        if (timestamp >= deadline) {
            throw Error("Invalid deadline.");
        }
        const _response = await axios.get(COUNTER_ENDPOINT + "/seed");
        const seed = _response.data.seed;

        const savedRequest = await saveRequest(connection, {
            "uri": uri,
            "params": JSON.stringify(params),
            "timestamp": timestamp,
            "deadline": deadline,
            "seed": seed,
            "tx": null,
            "max_retries": 10,
        });

        const getResult = async () => {
            try {
                const job = (await getResultsById(connection, savedRequest.insertId))[0];
                // console.log(savedRequest.insertId, ">", job);
                if (job != undefined) {
                    return job.result;
                }
                else {
                    assert("No result");
                }
            } catch (error) {
                // console.error(error);
                return error;
            }
        }
        pollWithTimeout(getResult, EPOCH, TIMEOUT)
            .then((result) => {
                // console.log(result);
                res.status(200).send({
                    "id": savedRequest.insertId,
                    "result": result
                });
            })
            .catch((error) => {
                // console.log(error);
                res.status(200).send({
                    "id": savedRequest.insertId
                });
            });
    } catch (error) {
        console.error(error);
        res.status(500).send({ "error": error.message });
    }
});

async function init() { // DB
    try {
        connection = await createConnection();
        console.log("CREATE CONNECTION");
    } catch (error) {
        console.error(error);
    }

    await createTable(connection);

    // TODO: close
    // try {
    //     await closeConnection(connection);
    //     console.log("CLOSE CONNECTION");
    // } catch (error) {
    //     console.error(error);
    // }
}

init().then(() => {
    const port = process.env.PORT || 30329;
    app.listen(port, () => {
        console.log(`Receive service is running on port ${port}`);
    });
});
