# remote-protomux-tester

A server for testing connections from @hyperswarm/secret-stream, hypercore, and protomux

This server is for testing remote connections to a socket listening for [noise handshakes](https://github.com/holepunchto/hyperswarm-secret-stream), [hypercore](https://github.com/holepunchto/hypercore) replication, and [protomux](https://github.com/mafintosh/protomux) channels. We use it for testing Mapeo code for filtering remote connections (vs. local LAN connections).

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [Maintainers](#maintainers)
- [Contributing](#contributing)
- [License](#license)

## Install

```
git clone https://github.com/digidem/remote-protomux-tester
npm install
```

## Usage

```
npm start
```

Server will start on port 3000 by default. To start on a custom port either:

```
npm start -- 4000
```

or

```
PORT=4000 npm start
```

## API

### `POST /connect`

**Request Body**

```json
{
  "host": "www.example.com:1234"
}
```

The server will make a TCP connection to the specified host, and attempt a Noise handshake (via [`@hyperswarm/secret-stream`](https://github.com/holepunchto/hyperswarm-secret-stream)), and will listen for any [`hypercore`](https://github.com/holepunchto/hypercore) replication streams [muxed](https://github.com/mafintosh/protomux) into the stream, and also listen for a `mapeo/rpc` channel if created.

**Response Body**

```json
{
  // Whether the socket connected
  "socketConnected": false,
  // Any error reported on the server socket
  "socketError": null,
  // Whether the Noise handshake completed and successfully connected
  "noiseConnected": false,
  // An array of hex-encoded discovery keys of hypercores which were
  // replicated into the connection
  "discoveryIds": [],
  // Hex-encoded raw data received by the server on the socket
  "rawSocketData": "",
  // Whether a protomux channel with protocol 'mapeo/rpc' was opened
  "mapeoRpcConnected": false
}
```

## Maintainers

[@@digidem](https://github.com/@digidem)

## Contributing

PRs accepted.

Small note: If editing the README, please conform to the [standard-readme](https://github.com/RichardLitt/standard-readme) specification.

## License

ISC © 2023 Digital Democracy
