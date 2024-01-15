const { run } = require('../src/node/app');

describe('Test run function with different scenarios', () => {

    test('Simple Addition Test', async () => {
        const scenario = {
            uri: 'https://raw.githubusercontent.com/D3LAB-DAO/gateway-backend/main/examples/simple_addition.js',
            params: { a: 5, b: 3 },
            description: 'Simple Addition Test'
        };

        try {
            const result = await run(scenario.uri, scenario.params);
            expect(result).toBe(8); // Assuming 8 is the expected result
        } catch (error) {
            throw new Error(error);
        }
    });

    test('Circle Area Calculation Test', async () => {
        const scenario = {
            uri: 'https://raw.githubusercontent.com/D3LAB-DAO/gateway-backend/main/examples/circle_area.js',
            params: { radius: 5 },
            description: 'Circle Area Calculation Test'
        };

        try {
            const result = await run(scenario.uri, scenario.params);
            expect(result).toBeCloseTo(78.54); // Assuming this is the expected result
        } catch (error) {
            throw new Error(error);
        }
    });
});
