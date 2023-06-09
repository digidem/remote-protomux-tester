// @ts-nocheck
import NoiseStream from '@hyperswarm/secret-stream'
import Hypercore from 'hypercore'
import Protomux from 'protomux'
import RAM from 'random-access-memory'
import test from 'tape'

import net from 'node:net'

import app from './index.js'

test('Connect with invalid host name -> error', async (t) => {
  const response = await app.inject({
    url: '/connect',
    payload: { host: 'invalid_host' },
    method: 'POST',
  })
  t.equal(response.statusCode, 500)
})

test('Timeout if no data sent', async (t) => {
  const server = await setupServer(t)

  const expected = {
    socketConnected: true,
    socketError: 'Stream timed out',
    noiseConnected: false,
    discoveryIds: [],
    rawSocketData: '',
    mapeoRpcConnected: false,
  }
  let socket

  server.on('connection', (s) => {
    socket = s
  })

  const { address, port } = server.address()
  const host = `${address}:${port}`
  const response = await app.inject({
    url: '/connect',
    payload: { host },
    method: 'POST',
  })
  // Need this because when NoiseStream is the initiator and is destroyed before
  // the handshake, the FIN packet is not sent to close the other side of the
  // connection. This is not an issue in practice because when NoiseStream is
  // not the initiator (e.g. when running in server mode), then this works fine.
  // So it would only be an issue when accidentally connecting to a non-Noise
  // peer
  socket.destroy()
  t.deepEqual(response.json(), expected)
})

test('Captures raw data on socket', async (t) => {
  const server = await setupServer(t)

  const testData = Buffer.from('hello world')

  const expected = {
    socketConnected: true,
    socketError: 'Stream timed out',
    noiseConnected: false,
    discoveryIds: [],
    mapeoRpcConnected: false,
    rawSocketData: testData.toString('hex'),
  }
  let socket

  server.on('connection', (s) => {
    s.write(testData)
    socket = s
  })

  const { address, port } = server.address()
  const host = `${address}:${port}`
  const response = await app.inject({
    url: '/connect',
    payload: { host },
    method: 'POST',
  })
  socket.destroy()
  t.deepEqual(response.json(), expected)
})

test('Will handshake Noise is available', async (t) => {
  const server = await setupServer(t)

  const expected = {
    socketConnected: true,
    socketError: null,
    noiseConnected: true,
    discoveryIds: [],
    mapeoRpcConnected: false,
  }
  let noiseConnected = false

  server.on('connection', (socket) => {
    const ns = new NoiseStream(false, socket)
    ns.on('connect', () => {
      noiseConnected = true
      socket.destroy()
    })
  })

  const { address, port } = server.address()
  const host = `${address}:${port}`
  const response = await app.inject({
    url: '/connect',
    payload: { host },
    method: 'POST',
  })
  // eslint-disable-next-line no-unused-vars
  const { rawSocketData, ...responseWithoutRawData } = response.json()
  t.deepEqual(responseWithoutRawData, expected, 'Expected response')
  t.equal(noiseConnected, true, 'Noise did connect')
})

test('Captures hypercore discovery ids replicated to connection', async (t) => {
  const server = await setupServer(t)
  const core = new Hypercore(RAM)
  await core.ready()

  const expected = {
    socketConnected: true,
    socketError: 'Stream timed out',
    noiseConnected: true,
    discoveryIds: [core.discoveryKey.toString('hex')],
    mapeoRpcConnected: false,
  }

  server.on('connection', async (socket) => {
    socket.pipe(core.replicate(false)).pipe(socket)
  })

  const { address, port } = server.address()
  const host = `${address}:${port}`
  const response = await app.inject({
    url: '/connect',
    payload: { host },
    method: 'POST',
  })
  // eslint-disable-next-line no-unused-vars
  const { rawSocketData, ...responseWithoutRawData } = response.json()
  t.deepEqual(responseWithoutRawData, expected, 'Expected response')
})

test('Captures mapeo/rpc connection', async (t) => {
  const server = await setupServer(t)

  const expected = {
    socketConnected: true,
    socketError: 'Stream timed out',
    noiseConnected: true,
    discoveryIds: [],
    mapeoRpcConnected: true,
  }

  server.on('connection', async (socket) => {
    const ns = new NoiseStream(false, socket)
    const protocol = Protomux.from(ns)
    const channel = protocol.createChannel({
      userData: null,
      protocol: 'mapeo/rpc',
    })
    channel.open()
  })

  const { address, port } = server.address()
  const host = `${address}:${port}`
  const response = await app.inject({
    url: '/connect',
    payload: { host },
    method: 'POST',
  })
  // eslint-disable-next-line no-unused-vars
  const { rawSocketData, ...responseWithoutRawData } = response.json()
  t.deepEqual(responseWithoutRawData, expected, 'Expected response')
})

async function setupServer(t) {
  const server = net.createServer()
  server.listen(0, '127.0.0.1')
  t.teardown(() => {
    server.close()
    return new Promise((res) => {
      server.on('close', () => {
        res()
      })
    })
  })
  return new Promise((res) => {
    server.on('listening', () => res(server))
  })
}
