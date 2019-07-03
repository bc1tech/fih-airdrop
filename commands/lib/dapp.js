const fs = require('fs');
const Web3 = require('web3');
const { web3 } = require('./web3Helper');
const prompt = require('prompt-sync')({ sigInt: true });

const Logger = require('./logger.js');

const argv = require('yargs')
  .option('endpoint', {
    alias: 'e',
    default: 'http://127.0.0.1:8545', // ganache
    type: 'string',
    describe: 'ethereum rpc endpoint',
  })
  .option('input', {
    alias: 'i',
    describe: 'path of json file containing the list of data',
    type: 'string',
    default: './commands/sample-data/contributions.json',
  })
  .option('out', {
    alias: 'o',
    describe: 'directory for json files where to store results',
    type: 'string',
    default: './commands/output',
  })
  .option('net-id', {
    alias: 'n',
    describe: 'network id',
    type: 'number',
    default: 5777, // ganache
  })
  .option('block', {
    alias: 'b',
    describe: 'block number',
    type: 'string',
    default: 'latest',
  })
  .option('from', {
    alias: 'f',
    describe: 'sending address',
    type: 'string',
  })
  .option('contract', {
    alias: 'c',
    describe: 'contract address',
    type: 'string',
  })
  .option('init-wallet', {
    describe: 'provided gas limit',
    type: 'boolean',
    default: false,
  })
  .option('airdrop-percent', {
    describe: 'percent of token to airdrop',
    type: 'number',
    default: 1.5,
  })
  .option('gas-limit', {
    describe: 'provided gas limit',
    type: 'number',
    default: 6721975,
  })
  .option('gas-price', {
    describe: 'provided gas price in gwei',
    type: 'number',
    default: 5,
  })
  .option('nonce', {
    describe: 'progressive nonce id',
    type: 'number',
    default: 0,
  })
  .option('log-level', {
    describe: 'log level used for logging',
    type: 'string',
    default: 'debug',
  })
  .option('pause-every', {
    describe: 'pause every the specified number of transactions',
    type: 'number',
    default: 1,
  })
  .option('timeout', {
    describe: 'number of seconds to wait',
    type: 'number',
    default: 10,
  })
  .option('bulk', {
    describe: 'number of addresses to use',
    type: 'number',
    default: 1,
  })
  .option('dryrun', {
    describe: 'simulate sends',
    type: 'boolean',
  })
  .help('help')
  .argv;

class Dapp {
  constructor (command) {
    this.input = argv.input;
    this.output = argv.out;
    this.gasUsed = 0;
    this.bulk = argv.bulk;
    this.limit = argv['pause-every'];
    this.airdropPercent = argv['airdrop-percent'];
    this.dryrun = argv.dryrun;
    this.timeout = argv.timeout;
    this.eth = {
      endpoint: argv.endpoint,
      netId: argv['net-id'],
      blockNumber: argv.block,
      gasLimit: argv['gas-limit'],
      gasPrice: web3.toWei(argv['gas-price'], 'gwei'),
      contractAddress: argv.contract,
      from: argv.from,
      nonce: argv.nonce,
      initWallet: argv['init-wallet'],
    };

    global.logger = new Logger(argv['log-level'], command);
  }

  async init () {
    if (!(this.eth.gasLimit >= 21000)) {
      throw new Error(`Invalid gas limit ${this.eth.gasLimit}`);
    }
    if (!web3.toBigNumber(this.eth.gasPrice).gte(100000000)) {
      throw new Error(`Invalid gas price ${this.eth.gasPrice}`);
    }

    global.logger.info('Web3 provider: ' + this.eth.endpoint);

    if (this.eth.initWallet) {
      if (!web3.isAddress(this.eth.from)) {
        throw new Error(`Invalid from address ${this.eth.from}`);
      }

      const WalletProvider = require('truffle-wallet-provider');

      const pass = prompt('enter keystore password: ', { echo: '*' });

      // Read and unlock keystore
      const keystore = fs.readFileSync(require.resolve('../keystore/keystore.json')).toString();

      const wallet = require('ethereumjs-wallet').fromV3(keystore, pass);

      web3.setProvider(new WalletProvider(wallet, this.eth.endpoint));
    } else { // development
      web3.setProvider(new Web3.providers.HttpProvider(this.eth.endpoint));
    }

    this.web3 = web3;
  }

  trxParams () {
    if (this.eth.initWallet) {
      this.eth.nonce = this.eth.nonce + 1;
    } else {
      this.eth.nonce = web3.eth.getTransactionCount(this.eth.from, 'pending');
    }

    const txParams = {
      from: this.eth.from,
      gas: this.eth.gasLimit,
      gasPrice: this.eth.gasPrice,
      nonce: this.eth.nonce,
    };

    global.logger.debug('trx params = ' + JSON.stringify(txParams));

    return txParams;
  }
}

module.exports = Dapp;
