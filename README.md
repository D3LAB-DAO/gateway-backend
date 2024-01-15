# Counter Service

```bash
$ node src/global/counter.js
```

```bash
$ curl http://localhost:30328/epoch
{"epoch":10000}

$ curl http://localhost:30328/round
{"round":4}

$ curl http://localhost:30328/seed
{"seed":"1bd4c2ec750458404795bc011361551f35c3ab7c1b924f3a23ceb853269cdcd8"}%   
```


# APP Service

### VRF

```bash
$ export PK=[YOUR_PRIVATE_KEY_HERE]

$ node src/node/vrf.js
```

```bash
$ curl -X POST -H "Content-Type: application/json" -d '{"data":"[DATA]"}' http://localhost:30327/evaluate

{"hash":[12,144,213,205,213,202,202,139,198,46,234,157,134,224,50,238,40,184,250,76,59,118,184,35,169,109,115,141,221,42,143,99],"proof":[73,103,77,19,206,194,140,121,180,136,15,203,222,184,104,134,131,52,177,140,221,81,171,15,73,231,41,240,250,88,179,249,31,21,71,105,211,219,5,198,245,210,169,209,183,49,112,199,184,15,149,5,50,51,177,174,197,50,249,192,74,159,6,148,4,88,151,116,205,4,119,193,115,177,119,194,200,51,229,209,111,178,209,3,153,213,203,64,51,125,123,228,209,36,46,124,35,179,80,28,146,109,24,56,39,101,243,186,38,131,254,80,197,192,18,152,156,106,114,193,38,215,96,132,22,195,123,110,230]}
```

```bash
$ curl -X POST -H "Content-Type: application/json" -d '{"publicKey":"042fbe3319c2ab9334d7b30f4bbc82fff84bc93647080e0b6c3a961ed4e1297bc27e4f54e27a2293d1d09ee840bef0173f5cb05f52e093d16d9e07349bb3a86275", "data":"[DATA]", "hash":"[12,144,213,205,213,202,202,139,198,46,234,157,134,224,50,238,40,184,250,76,59,118,184,35,169,109,115,141,221,42,143,99]", "proof":"[73,103,77,19,206,194,140,121,180,136,15,203,222,184,104,134,131,52,177,140,221,81,171,15,73,231,41,240,250,88,179,249,31,21,71,105,211,219,5,198,245,210,169,209,183,49,112,199,184,15,149,5,50,51,177,174,197,50,249,192,74,159,6,148,4,88,151,116,205,4,119,193,115,177,119,194,200,51,229,209,111,178,209,3,153,213,203,64,51,125,123,228,209,36,46,124,35,179,80,28,146,109,24,56,39,101,243,186,38,131,254,80,197,192,18,152,156,106,114,193,38,215,96,132,22,195,123,110,230]"}' http://localhost:30327/verify

{"result":true}
```

### APP

```bash
$ export PK=[YOUR_PRIVATE_KEY_HERE]

$ node src/node/app.js
```


# Relay Service

### DB

```bash
$ docker-compose up -d --build
```

### Receive (From user)

```bash
$ node src/relay/receive.js
```

```bash
$ curl -X POST -H "Content-Type: application/json" -d '{"uri":"https://raw.githubusercontent.com/D3LAB-DAO/gateway-backend/main/examples/simple_addition.js", "params": {"a": 5, "b": 3}, "deadline": 2000000000000}' http://localhost:30329/request

{"result":8}
```

### Send (From Provider)

```bash
$ node src/relay/send.js
```

---

# Gateway Backend

This project is a simple backend service that allows you to download and execute JavaScript files with a single exposed function. The service is built using Node.js.

# Running the Secvice

```bash
$ npm start
```

The server will start running on the default port (3000) or the port specified in the `PORT` environment variable.

# Usage

To execute a JavaScript function from a remote file, send a POST request to the `/run` endpoint with the URL of the JavaScript file and the input parameters as a JSON object in the request body.

For example, use the following `curl` command to test the "circle_area.js" example:

```bash
$ curl -X POST -H "Content-Type: application/json" -d '{"url":"https://raw.githubusercontent.com/D3LAB-DAO/gateway-backend/main/examples/simple_addition.js", "inputParameters": {"a": 5, "b": 3}}' http://localhost:3000/run

{"result":8}
```

```bash
$ curl -X POST -H "Content-Type: application/json" -d '{"url":"https://raw.githubusercontent.com/D3LAB-DAO/gateway-backend/main/examples/circle_area.js", "inputParameters": {"radius": 5}}' http://localhost:3000/run

{"result":78.53981633974483}
```

```bash
$ curl -X POST -H "Content-Type: application/json" -d '{"url":"https://raw.githubusercontent.com/D3LAB-DAO/gateway-backend/main/examples/chat.js", "inputParameters": {"prompt": "Hello", "key": "<YOUR_API_KEY>"}}' http://localhost:3000/run

{"result":"! How can I assist you today?"}
```
