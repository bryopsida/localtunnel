/* eslint-disable no-console */
const crypto = require('crypto')
const http = require('http')
const https = require('https')
const { URL } = require('url')
const assert = require('assert')
const { after, before, describe, it } = require('node:test')

const localtunnel = require('./localtunnel')

let fakePort
let server

before((ctx, done) => {
  server = http.createServer()
  server.on('request', (req, res) => {
    res.write(req.headers.host)
    res.end()
  })
  server.listen(() => {
    const { port } = server.address()
    fakePort = port
    done()
  })
})
after(async () => {
  await server?.close()
})

it('query localtunnel server w/ ident', {
  timeout: 5000
}, (ctx, done) => {
  localtunnel({ port: fakePort }).then((tunnel) => {
    assert.ok(/^https:\/\/.*loca.lt$/.test(tunnel.url))

    const parsed = new URL(tunnel.url)
    const opt = {
      host: parsed.host,
      port: 443,
      headers: { host: parsed.hostname },
      path: '/'
    }

    const req = https.request(opt, res => {
      res.setEncoding('utf8')
      let body = ''

      res.on('data', chunk => {
        body += chunk
      })

      res.on('end', () => {
        assert(/.*[.]loca[.]lt/.test(body), body)
        tunnel.close()
        done()
      })
    })

    req.end()
  })
})

it('request specific domain', {
  timeout: 5000
}, async () => {
  const subdomain = Math.random()
    .toString(36)
    .substr(2)
  const tunnel = await localtunnel({ port: fakePort, subdomain })
  assert.ok(new RegExp(`^https://${subdomain}.loca.lt$`).test(tunnel.url))
  tunnel.close()
})

describe('--local-host localhost', () => {
  it('override Host header with local-host', {
    timeout: 5000
  }, (ctx, done) => {
    localtunnel({ port: fakePort, local_host: 'localhost' }).then((tunnel) => {
      assert.ok(/^https:\/\/.*loca.lt$/.test(tunnel.url))

      const parsed = new URL(tunnel.url)
      const opt = {
        host: parsed.host,
        port: 443,
        headers: { host: parsed.hostname },
        path: '/'
      }

      const req = https.request(opt, res => {
        res.setEncoding('utf8')
        let body = ''

        res.on('data', chunk => {
          body += chunk
        })

        res.on('end', () => {
          assert.strictEqual(body, 'localhost')
          tunnel.close()
          done()
        })
      })

      req.end()
    })
  })
})

describe('--local-host 127.0.0.1', () => {
  it('override Host header with local-host', {
    timeout: 5000
  }, (ctx, done) => {
    localtunnel({ port: fakePort, local_host: '127.0.0.1' }).then((tunnel) => {
      assert.ok(/^https:\/\/.*loca.lt$/.test(tunnel.url))

      const parsed = new URL(tunnel.url)
      const opt = {
        host: parsed.host,
        port: 443,
        headers: {
          host: parsed.hostname
        },
        path: '/'
      }

      const req = https.request(opt, res => {
        res.setEncoding('utf8')
        let body = ''

        res.on('data', chunk => {
          body += chunk
        })

        res.on('end', () => {
          assert.strictEqual(body, '127.0.0.1')
          tunnel.close()
          done()
        })
      })

      req.end()
    })
  })

  it('send chunked request', {
    timeout: 5000
  }, (ctx, done) => {
    localtunnel({ port: fakePort, local_host: '127.0.0.1' }).then((tunnel) => {
      assert.ok(/^https:\/\/.*loca.lt$/.test(tunnel.url))

      const parsed = new URL(tunnel.url)
      const opt = {
        host: parsed.host,
        port: 443,
        headers: {
          host: parsed.hostname,
          'Transfer-Encoding': 'chunked'
        },
        path: '/'
      }

      const req = https.request(opt, res => {
        res.setEncoding('utf8')
        let body = ''

        res.on('data', chunk => {
          body += chunk
        })

        res.on('end', () => {
          assert.strictEqual(body, '127.0.0.1')
          tunnel.close()
          done()
        })
      })

      req.end(crypto.randomBytes(1024 * 8).toString('base64'))
    })
  })
})
