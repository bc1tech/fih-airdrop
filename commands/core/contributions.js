const fs = require('fs');
const path = require('path');
const { web3, getContract, promisify } = require('../lib/web3Helper');
const writeFile = promisify(fs.writeFile);

const Dapp = require('../lib/dapp.js');

const ContributionsArtifact = require('../abi/Contributions');

class Contributions {
  constructor (command) {
    this.dapp = new Dapp(command);
  }

  async init () {
    await this.dapp.init();

    const ContributionsContract = getContract(ContributionsArtifact, this.dapp.eth.netId);
    this.instance = ContributionsContract.at(this.dapp.eth.contractAddress);

    global.logger.info(`Set instance to ${this.instance.address}`);
  }

  async start () {
    await this.init();

    global.logger.info('Starting process...');

    const outputFile = path.resolve(this.dapp.output, 'contributions.json');

    const addressesMap = [];

    const contributorsLength = (await this.instance.getTokenAddressesLength().valueOf());

    for (let i = 0; i < contributorsLength; i++) {
      const contributor = {
        address: await this.instance.tokenAddresses(i),
      };

      contributor.amount = web3.fromWei((await this.instance.tokenBalances(contributor.address)).valueOf());

      addressesMap.push(contributor);

      global.logger.info(`ID: ${i}, Address: ${contributor.address}, Amount: ${contributor.amount}`);
    }

    await writeFile(outputFile, JSON.stringify(addressesMap, null, 2), 'utf8');
  }
}

module.exports = Contributions;
