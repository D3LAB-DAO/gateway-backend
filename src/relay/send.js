const { createConnection, closeConnection } = require('./db/maria');
const { createTable, getIdsToPublish, getResultsById, setRequestTxById, setResultTxById, setSuccessTxById } = require('./db/queries');
const BN = require('bn.js');
const axios = require('axios');

const VRF_ENDPOINT = "http://localhost:30327";
const COUNTER_ENDPOINT = "http://localhost:30328";
let connection;

let processing = false;
const EPOCH = 10000; // (ms)
const TIMEOUT = 30000; // (ms)
const DIFF = new BN("8000000000000000000000000000000000000000000000000000000000000000", 'hex');
const QUORUM = 1; // TODO: more quorum

async function cron() {
    if (processing) {
        return Promise.resolve("Already processing");
    } else {
        processing = true;

        const ids = await getIdsToPublish(connection, QUORUM);
        // console.log(ids);

        for (let i = 0; i < ids.length; i++) {
            const id = ids[i].id;

            const jobs = await getResultsById(connection, id);
            // console.log(id, jobs.length);

            let agreement = 0;
            for (let j = 0; j < jobs.length; j++) {
                const job = jobs[j];
                const id = job.request_id;
                const seed = job.seed;

                const _responseEpoch = await axios.get(COUNTER_ENDPOINT + "/epoch");
                const epoch = _responseEpoch.data.epoch;
                const timestamp = job.timestamp;
                const nonce = Math.floor(timestamp / epoch);

                const msg = `${id}${seed}${nonce}`;
                const public_key = job.public_key;
                const hash = job.hash;
                const proof = job.proof;

                // 1. VRF check
                try {
                    const _responseVrf = await axios.post(VRF_ENDPOINT + "/verify", {
                        "publicKey": public_key,
                        "data": msg,
                        "hash": `[${hash}]`,
                        "proof": `[${proof}]`
                    });
                    agreement += 1;
                } catch (error) {
                    //
                }
            }

            if (agreement >= QUORUM) {
                try {
                    console.log(id, "DONE"); // TODO: send tx
                    await setResultTxById(connection, "DONE", id);
                } catch (error) {
                    console.error(error);
                } finally {
                    await setSuccessTxById(connection, true, id);
                }
            }
        }

        processing = false;
        return Promise.resolve("Completed processing");
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
}

init().then(() => {
    setInterval(cron, EPOCH);
    // cron().then(() => {
    //     process.exit(0);
    // }).catch((error) => {
    //     console.error(error);
    // });
});
