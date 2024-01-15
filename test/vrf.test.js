const request = require('supertest');

describe('VRF Endpoints', () => {
    let testPublicKey = '0427818123aa641dcec6a41071c3c8add2b09483df7a57b1e44ed7606996efdb6bb057e22800ddb6f17ab1806f328ec2904878d1fe8d8deb155a9eee8d2f00ceef';
    let testData = '[DATA]';
    let testHash;
    let testProof;

    const {app, server} = require('../src/node/vrf');

    afterAll((done) => {
        // Close the server after the tests
        server.close(done);
    });

    // Test the /evaluate endpoint
    it('should evaluate data correctly', async () => {
        const response = await request(app)
            .post('/evaluate')
            .send({ data: testData });

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('hash');
        expect(response.body).toHaveProperty('proof');
        testHash = `[${response.body.hash.toString()}]`;
        testProof = `[${response.body.proof.toString()}]`;
    });

    // Test the /verify endpoint
    it('should verify data correctly', async () => {
        const response = await request(app)
            .post('/verify')
            .send({
                publicKey: testPublicKey,
                data: testData,
                hash: testHash,
                proof: testProof
            });

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('result');
        expect(response.body.result).toBeTruthy();
    });
});
