const Web3 = require('web3');
const contract = require('truffle-contract');

let _web3;
let web3Exists = false;
try {
  web3Exists = typeof web3 !== 'undefined';
} catch (e) {}

if (web3Exists) {
  _web3 = new Web3(web3.currentProvider);
} else {
  // set the provider you want from Web3.providers
  _web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:9545'));
}

const web3 = _web3;

const promisify = (fn, context) => (...args) => new Promise((resolve, reject) => {
  fn.apply(context, [...args, (err, res) => {
    if (err) {
      reject(err);
    } else {
      resolve(res);
    }
  }]);
});

const add0x = data => !data.startsWith || data.startsWith('0x') ? data : '0x' + data;

/**
 * Call json rpc method on current web3 provider
 * @param {string} method
 * @param {array=} args array of arguments of the rpc method
 * @returns {Promise}
 */
const rpc = (method, args) => new Promise((resolve, reject) => {
  const req = {
    jsonrpc: '2.0',
    method: method,
    id: new Date().getTime(),
  };
  req.params = args;

  web3.currentProvider.sendAsync(req, (err, result) => {
    if (err !== null) {
      return reject(err);
    } else if (result.error !== null) {
      reject(new Error('RPC Error: ' + (result.error.message || result.error)));
    } else {
      resolve(result);
    }
  });
});

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const getBlock = promisify(web3.eth.getBlock, web3.eth);
const sendTransaction = promisify(web3.eth.sendTransaction);
const getTransactionReceipt = promisify(web3.eth.getTransactionReceipt);
const getNetwork = promisify(web3.version.getNetwork);

const getLatestBlockTime = async () => {
  const block = await getBlock('latest');
  return block.timestamp;
};

function strip0x (input) {
  if (typeof input !== 'string') {
    return input;
  } else if (input.length >= 2 && input.slice(0, 2) === '0x') {
    return input.slice(2);
  } else {
    return input;
  }
}

const waitTransactionReceipt = async (txhash, maxSeconds = 600) => {
  const interval = 6; // seconds
  const steps = Math.floor(maxSeconds / interval);
  let receipt;
  for (let i = 0; i < steps; i++) {
    try {
      receipt = await getTransactionReceipt(txhash);
      if (receipt) {
        break;
      }
    } catch (e) {}
    await delay(interval * 1000);
  }
  if (!receipt) {
    throw new Error('waitTransactionReceipt timeout');
  } else {
    return receipt;
  }
};

// deploy contract function compatible with geth and parity
const deploy = async function (contract, args, options) {
  if (!Array.isArray(args)) {
    options = args;
    args = [];
  }
  const bin = contract.bin
    ? add0x(contract.bin)
    : contract.binary
      ? contract.binary
      : contract.unlinked_binary;
  const abi = contract.abi;
  const data = web3.eth.contract(abi).new.getData(...args, { data: bin });
  const params = Object.assign({ data, from: web3.eth.accounts[0] }, options);
  delete params.to;
  // console.log(params)
  const txhash = await sendTransaction(params);
  // console.log('hash', txhash)
  const receipt = await waitTransactionReceipt(txhash);

  return { address: receipt.contractAddress, transactionHash: txhash };
};

const getContract = (artifacts, netid = null) => {
  const c = contract(artifacts);
  c.setProvider(web3.currentProvider);
  if (netid) {
    c.setNetwork(netid);
  }
  return c;
};

module.exports = {
  web3,
  getNetwork,
  getAccounts: promisify(web3.eth.getAccounts),
  getBalance: promisify(web3.eth.getBalance),
  getTransaction: promisify(web3.eth.getTransaction),
  sendTransaction,
  getTransactionReceipt,
  waitTransactionReceipt,
  sendRawTransaction: promisify(web3.eth.sendRawTransaction),
  getTransactionCount: promisify(web3.eth.getTransactionCount),
  getBlockNumber: promisify(web3.eth.getBlockNumber),
  sign: promisify(web3.eth.sign),
  getBlock,
  getLatestBlockTime,
  deploy,
  getContract,
  delay,
  rpc,
  promisify,
  strip0x,
};
