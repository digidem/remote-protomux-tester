import app from './index.js'

const argv = process.argv.slice(2)

const port =
  typeof argv[0] === 'string'
    ? +argv[0]
    : typeof process.env.PORT === 'string'
    ? +process.env.PORT
    : 3000

try {
  await app.listen({ port, host: '::' })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
