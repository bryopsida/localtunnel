#!/usr/bin/env node

const openurl = require('openurl')

const localtunnel = require('../localtunnel')
const { version } = require('../package')
const { program } = require('commander')
const { createLogger } = require('../lib/Logger')
const log = createLogger({
  name: 'bin/l2.js'
})

const prg = program
  .usage('Usage: lt --port [num] <options>')
  .option('-h, --host <host>', 'Upstream server providing forwarding', 'https://localtunnel.me')
  .option('-s, --subdomain <subdomain>', 'Request this subdomain')
  .option('-l, --local-host <localHost>', 'Tunnel traffic to this host instead of localhost, override Host header to this host')
  .option('--local-https', 'Tunnel traffic to a local HTTPS server')
  .option('--local-cert <localCert>', 'Path to certificate PEM file for local HTTPS server')
  .option('--local-key <localKey>', 'Path to certificate key file for local HTTPS server')
  .option('--local-ca <localCA>', 'Path to certificate authority file for self-signed certificates')
  .option('--allow-invalid-cert', 'Disable certificate checks for your local HTTPS server (ignore cert/key/ca options)')
  .option('-o, --open', 'Opens the tunnel URL in your browser')
  .option('--print-requests', 'Print basic request info')
  .requiredOption('-p, --port <port>', 'Internal HTTP server port')
  .option('--version', 'output the version number', version)
const argv = prg
  .parse(process.argv).opts()

argv.port = parseInt(argv.port)

if (typeof argv.port !== 'number' || isNaN(argv.port)) {
  log.warn('Invalid port provided')
  prg.help()
  process.exit(1)
}

(async () => {
  const tunnel = await localtunnel({
    port: argv.port,
    host: argv.host,
    subdomain: argv.subdomain,
    local_host: argv.localHost,
    local_https: argv.localHttps,
    local_cert: argv.localCert,
    local_key: argv.localKey,
    local_ca: argv.localCa,
    allow_invalid_cert: argv.allowInvalidCert
  }).catch(err => {
    throw err
  })

  tunnel.on('error', err => {
    throw err
  })

  log.info('your url is: %s', tunnel.url)

  /**
   * `cachedUrl` is set when using a proxy server that support resource caching.
   * This URL generally remains available after the tunnel itself has closed.
   * @see https://github.com/localtunnel/localtunnel/pull/319#discussion_r319846289
   */
  if (tunnel.cachedUrl) {
    log.info('your cachedUrl is: %s', tunnel.cachedUrl)
  }

  if (argv.open) {
    openurl.open(tunnel.url)
  }

  if (argv['print-requests']) {
    tunnel.on('request', info => {
      log.info(new Date().toString(), info.method, info.path)
    })
  }
})()
