const { createConnection, closeConnection } = require('../relay/db/maria');
const { createTable, saveNodes, saveResults, getRequestsToRun } = require('../relay/db/queries');
const BN = require('bn.js');
const axios = require('axios');
const elliptic = require('elliptic');
const { Script, createContext } = require('vm');

const VRF_ENDPOINT = "http://localhost:30327";
const COUNTER_ENDPOINT = "http://localhost:30328";
let connection;

const EC = new elliptic.ec('secp256k1');
const env = process.env;
const key = EC.keyFromPrivate(env.PK);
let node_id;

let processing = false;
const EPOCH = 10000; // (ms)
const TIMEOUT = 30000; // (ms)
const DIFF = new BN("8000000000000000000000000000000000000000000000000000000000000000", 'hex');

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
    } else {
        processing = true;

        const jobs = await getRequestsToRun(connection, node_id);
        for (let i = 0; i < jobs.length; i++) {
            const job = jobs[i];
            const id = job.id;
            const seed = job.seed;
            const uri = job.uri;
            const params = JSON.parse(job.params);

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
            const hashHex = (new BN(hash)).toString(16);
            const proof = _responseVrf.data.proof;

            // 2. run
            if (hashHex < DIFF) {
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
                    "sig": tmpSig
                });
                // console.log(savedResult.insertId);
            } else {
                console.log(`${id} PASS`)
            }
        }

        processing = false;
    }
}

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

module.exports = {
    run
};
