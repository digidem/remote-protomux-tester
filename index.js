import NoiseStream from '@hyperswarm/secret-stream'
import { Type } from '@sinclair/typebox'
import Fastify from 'fastify'
import Protomux from 'protomux'

import net from 'node:net'

const untypedFastify = Fastify({ logger: false })
/** @type {ReturnType<typeof untypedFastify.withTypeProvider<import('@fastify/type-provider-typebox').TypeBoxTypeProvider>>} */
const fastify = untypedFastify

fastify.post(
  '/connect',
  {
    schema: {
      body: Type.Object({
        host: Type.String(),
      }),
    },
  },
  (req, reply) => {
    const { host } = req.body
    const [hostname, port] = host.split(':')
    if (!hostname || !port) throw new Error('invalid hostname')
    const data = {
      socketConnected: false,
      /** @type {null | string} */
      socketError: null,
      noiseConnected: false,
      /** @type {string[]} */
      discoveryIds: [],
      rawSocketData: '',
      mapeoRpcConnected: false,
    }
    const socket = net.connect(+port, hostname)
    /** @type {any} */
    let noiseStream
    socket.on('connect', () => {
      data.socketConnected = true
      noiseStream = new NoiseStream(true, socket)
      noiseStream.setTimeout(500)
      noiseStream.on('error', noop)
      noiseStream.on('connect', () => {
        data.noiseConnected = true
      })

      const protocol = Protomux.from(noiseStream)
      protocol.pair(
        { protocol: 'hypercore/alpha' },
        /** @param {Buffer} dk */ (dk) => {
          data.discoveryIds.push(dk.toString('hex'))
        }
      )
      protocol.pair({ protocol: 'mapeo/rpc' }, () => {
        data.mapeoRpcConnected = true
      })
    })
    socket.on('data', (chunk) => {
      data.rawSocketData += chunk.toString('hex')
    })
    socket.on('error', (error) => {
      data.socketError = error.message
    })
    socket.on('close', async () => {
      reply.header('Content-Type', 'application/json')
      reply.send(data)
    })
  }
)

export default fastify

function noop() {}
