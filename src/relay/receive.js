const { createConnection, closeConnection } = require('./db/maria');
const { createTable, saveRequest } = require('./db/queries');
const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');

const COUNTER_ENDPOINT = "http://localhost:30328";
let connection;

const app = express();
app.use(bodyParser.json());

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

        const result = await saveRequest(connection, {
            "uri": uri,
            "params": JSON.stringify(params),
            "timestamp": timestamp,
            "deadline": deadline,
            "seed": seed,
            "tx": null
        });

        res.status(200).send({ "id": result.insertId });
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
