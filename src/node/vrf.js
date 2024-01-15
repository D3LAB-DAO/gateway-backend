const { Evaluate, ProofHoHash } = require('@idena/vrf-js');
const elliptic = require('elliptic');
const express = require('express');
const bodyParser = require('body-parser');

const EC = new elliptic.ec('secp256k1');
const env = process.env;

// PK
const key = EC.keyFromPrivate(env.PK);

const app = express();
app.use(bodyParser.json());

app.post('/evaluate', async (req, res) => {
    try {
        const { data } = req.body;
        const [hash, proof] = Evaluate(key.getPrivate().toArray(), data);
        res.status(200).send({ "hash": hash, "proof": proof });
    } catch (error) {
        console.error(error);
        res.status(500).send({ "error": error.message });
    }
});

app.post('/verify', async (req, res) => {
    try {
        const { publicKey, data, hash, proof } = req.body;
        var _key = EC.keyFromPublic(publicKey, 'hex');

        console.log(
            data
        );

        const result = ProofHoHash(_key.getPublic(), data, stringToIntArray(proof));
        res.status(200).send({ "result": `[${result.toString()}]` === hash });
    } catch (error) {
        console.error(error);
        res.status(500).send({ "error": error.message });
    }
});

function stringToIntArray(str) {
    return str.replace(/[\[\]]/g, '') // Removes the square brackets
        .split(',') // Splits the string into an array of strings
        .map(Number); // Converts each string to a number
}

const port = process.env.PORT || 30327;
const server = app.listen(port, () => {
    console.log(`VRF service is running on port ${port}`);
    console.log(`Private Key: ${key.getPrivate()}`);
    console.log(`Public Key: ${key.getPublic().encode('hex')}`);
});

module.exports = {
    app,
    server
};
