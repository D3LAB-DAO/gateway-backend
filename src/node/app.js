const { createConnection, closeConnection } = require('../relay/db/maria');
const { createTable, saveNodes, saveResults, getRequestsToRun, setRequestTxById, reduceRetries, getRequestStatus } = require('../relay/db/queries');
const BN = require('bn.js');
const axios = require('axios');
const elliptic = require('elliptic');
const { Script, createContext } = require('vm');

const EPOCH = 10000; // (ms)
const TIMEOUT = 30000; // (ms)

if (!process.env.STANDALONE) {
    const VRF_PORT = 30327;
    const COUNTER_PORT = 30328;
    const VRF_ENDPOINT = `http://localhost:${VRF_PORT}`;
    const COUNTER_ENDPOINT = `http://localhost:${COUNTER_PORT}`;

    let connection;

    const EC = new elliptic.ec('secp256k1');
    const env = process.env;
    const key = EC.keyFromPrivate(env.PK);
    let node_id;

    let processing = false;

    const DIFF = new BN("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF", 'hex');

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

        const publicKey = key.getPublic().encode('hex');
        console.log(`Public Key: ${publicKey}`);

        const result = await saveNodes(connection, {
            "public_key": publicKey
        });
        node_id = result.insertId;
    }

    if (require.main === module) {
        init().then(() => {
            setInterval(cron, EPOCH);
            // cron().then(() => {
            //     process.exit(0);
            // }).catch((error) => {
            //     console.error(error);
            // });
        });
    }
}

const sandbox = {
    console: console,
    fetch: fetch
};

async function run(uri, params) {
    // 1. Download the JavaScript file
    const response = await axios.get(uri);

    // 2. Run the downloaded file's function with a timeout of 30 seconds
    const context = createContext(sandbox);
    const script = new Script(response.data, { timeout: TIMEOUT });
    script.runInContext(context);

    // Assume the function name is 'mainFunction'
    const mainFunction = context.mainFunction;
    if (typeof mainFunction === 'function') {
        // Pass input parameters to the function
        const result = await mainFunction(params);

        // 3. Send the result to the requester
        return result;
    } else {
        throw Error("Not a valid format.");
    }
}

async function cron() {
    if (processing) {
        return;
    }

    processing = true;

    let jobs;
    try {
        jobs = await getRequestsToRun(connection, node_id);
        // console.log(jobs);
        console.log(jobs.length);
    } catch (error) {
        console.error(error);
    }

    for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];
        const id = job.id;
        const seed = job.seed;
        const uri = job.uri;
        const params = JSON.parse(job.params);

        try {
            const _responseEpoch = await axios.get(COUNTER_ENDPOINT + "/epoch");
            const epoch = _responseEpoch.data.epoch;
            const _now = new Date();
            const timestamp = _now.getTime();
            const nonce = Math.floor(timestamp / epoch);

            const msg = `${id}${seed}${nonce}`;

            // 1. VRF check
            const _responseVrf = await axios.post(VRF_ENDPOINT + "/evaluate", {
                "data": msg
            });
            const hash = _responseVrf.data.hash;
            // const hashHex = (new BN(hash)).toString(16);
            const hashHex = (new BN(hash));
            const proof = _responseVrf.data.proof;

            // 2. run
            if (DIFF - hashHex >= 0) {
                const result = await run(uri, params);
                console.log(`${id} RUN: ${result}`);

                // 3. update DB
                // TODO: sig
                const tmpSig = "TMP_SIG";

                const savedResult = await saveResults(connection, {
                    "request_id": id,
                    "node_id": node_id,
                    "timestamp": timestamp,
                    "hash": hash.toString(),
                    "proof": proof.toString(),
                    "result": result,
                    "sig": tmpSig,
                    "success": false
                });
                // console.log(savedResult.insertId);
            } else {
                console.log(`${id} PASS`, hashHex, ">", DIFF);
            }
        } catch (err) {
            console.error(err);

            const reducedRetries = await reduceRetries(connection, id);
        }
    }

    processing = false;
}


if (process.env.STANDALONE) {
    const express = require('express');
    const bodyParser = require('body-parser');

    const app = express();
    app.use(bodyParser.json());

    app.post('/run', async (req, res) => {
        try {
            const { url, inputParameters } = req.body;
            console.log(url, inputParameters);
            const result = await run(url, inputParameters);
            console.log(result);
            res.status(200).send({ "result": result });
        } catch (error) {
            console.error(error);
            res.status(500).send({ "error": error.message });
        }
    });

    const port = process.env.PORT || 3000;
    const server = app.listen(port, () => {
        console.log(`Server is running on ${port}`);
    });
}


module.exports = {
    run
};
