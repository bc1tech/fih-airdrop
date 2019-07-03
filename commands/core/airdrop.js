const fs = require('fs');
const path = require('path');
const { web3, getContract, promisify } = require('../lib/web3Helper');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const fileExists = (...args) => promisify(fs.stat)(...args).then(() => true).catch(() => false);

const Dapp = require('../lib/dapp.js');

const TokenArtifact = require('../abi/FidelityHouseToken');

class Airdrop {
  constructor (command) {
    this.dapp = new Dapp(command);
  }

  async init () {
    await this.dapp.init();

    const TokenContract = getContract(TokenArtifact, this.dapp.eth.netId);
    this.instance = TokenContract.at(this.dapp.eth.contractAddress);

    global.logger.info(`Set instance to ${this.instance.address}`);
  }

  async start () {
    await this.init();

    const icoLatestBlock = 7560016;
    const toBlock = this.dapp.eth.blockNumber;

    const inputFile = path.resolve(this.dapp.input);
    const minValueFile = path.resolve(this.dapp.output, `minvalue_${icoLatestBlock}_${toBlock}_.json`);
    const transactionsFile = path.resolve(this.dapp.output, `transactions_${icoLatestBlock}_${toBlock}_.json`);
    const contributions = (await fileExists(inputFile)) ? JSON.parse(await readFile(inputFile)) : [];

    const totalAddresses = contributions.length;

    const usersMap = [];
    const addressesMap = {};

    let doneAddresses = 1;

    for (const user of contributions) {
      const address = user.address;
      const amount = new web3.BigNumber(user.amount);

      global.logger.info(`${doneAddresses}/${totalAddresses} Address: ${address}`);

      global.logger.debug(`${doneAddresses}/${totalAddresses} Address: ${address}, initial amount: ${amount}`);

      const trxList = {};

      await new Promise((resolve) => {
        const filterFrom = this.instance.Transfer({
          from: address,
        }, {
          to: this.instance.address,
          fromBlock: icoLatestBlock,
          toBlock: toBlock,
        });

        filterFrom.get((error, result) => {
          if (!error) {
            result.forEach((txLog) => {
              trxList[txLog.blockNumber] = {
                type: 'out',
                value: web3.fromWei(txLog.args.value.valueOf()),
                trx: txLog,
              };
            });
            resolve();
          } else {
            global.logger.error(error);
          }
        });
      });

      await new Promise((resolve) => {
        const filterFrom = this.instance.Transfer({
          to: address,
        }, {
          to: this.instance.address,
          fromBlock: icoLatestBlock,
          toBlock: toBlock,
        });

        filterFrom.get((error, result) => {
          if (!error) {
            result.forEach((txLog) => {
              trxList[txLog.blockNumber] = {
                type: 'in',
                value: web3.fromWei(txLog.args.value.valueOf()),
                trx: txLog,
              };
            });
            resolve();
          } else {
            global.logger.error(error);
          }
        });
      });

      let minValue = amount;
      let result = minValue;

      if (Object.getOwnPropertyNames(trxList).length > 0) {
        for (const block of Object.keys(trxList)) {
          if (trxList.hasOwnProperty(block)) {
            const txLog = trxList[block];

            if (txLog.type === 'in') {
              result = result.add(txLog.value);
              global.logger.debug(`${doneAddresses}/${totalAddresses} Address: ${address}, in ${txLog.value}`);
            } else {
              result = result.sub(txLog.value);
              global.logger.debug(`${doneAddresses}/${totalAddresses} Address: ${address}, out ${txLog.value}`);
            }

            minValue = result.lt(minValue) ? result : minValue;
          }
        }
      }

      if (minValue > 0) {
        addressesMap[address] = minValue;
        await writeFile(minValueFile, JSON.stringify(addressesMap, null, 2), 'utf8');
      }

      usersMap.push({
        address: user.address,
        initialAmount: user.amount,
        minimumValue: minValue,
        transactions: trxList,
      });

      await writeFile(transactionsFile, JSON.stringify(usersMap, null, 2), 'utf8');

      global.logger.debug(`${doneAddresses}/${totalAddresses} Address: ${address}, minimum amount: ${minValue}`);

      doneAddresses++;
    }
  }
}

module.exports = Airdrop;
