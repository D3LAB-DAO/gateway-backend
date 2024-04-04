const crypto = require('crypto');
const express = require('express');
const bodyParser = require('body-parser');

// State
const EPOCH = 30000; // (ms)
let round = 0;
const INIT = "Hello, World!";
let seed = sha256(`${INIT}${round}`);

const app = express();
app.use(bodyParser.json());

app.get('/epoch', async (req, res) => {
    try {
        res.status(200).send({ "epoch": EPOCH });
    } catch (error) {
        res.status(500).send({ "error": error.message });
    }
});

app.get('/round', async (req, res) => {
    try {
        res.status(200).send({ "round": round });
    } catch (error) {
        res.status(500).send({ "error": error.message });
    }
});

// TODO: {seed}_{r-f}
app.get('/seed', async (req, res) => {
    try {
        res.status(200).send({ "seed": seed });
    } catch (error) {
        res.status(500).send({ "error": error.message });
    }
});

function sha256(message) {
    return crypto.createHash('sha256').update(message).digest('hex');
}

function repeatFunction() {
    seed = sha256(`${seed}${round}`);
    round++;
    console.log(`Round: ${round}, Seed: ${seed}`);
}

setInterval(repeatFunction, EPOCH);

const port = process.env.PORT || 30328;
app.listen(port, () => {
    console.log(`Counter service is running on port ${port}`);
    console.log(`Round: ${round}, Seed: ${seed}`);
});
