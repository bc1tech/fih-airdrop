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
    const airdropMapFile = path.resolve(this.dapp.output, `airdrop_map_${icoLatestBlock}_${toBlock}_.json`);
    const airdropArrayFile = path.resolve(this.dapp.output, `airdrop_array_${icoLatestBlock}_${toBlock}_.json`);
    const transactionsFile = path.resolve(this.dapp.output, `transactions_${icoLatestBlock}_${toBlock}_.json`);
    const contributions = (await fileExists(inputFile)) ? JSON.parse(await readFile(inputFile)) : [];

    const totalAddresses = contributions.length;

    const usersMap = [];
    const minValueMap = {};
    const airdropMap = {};
    const airdropArray = {
      accounts: [],
      amounts: [],
    };

    let totalTokenAmount = new web3.BigNumber(0);
    let holdTokenAmount = new web3.BigNumber(0);
    let totalAirdropAmount = new web3.BigNumber(0);

    let doneAddresses = 1;

    for (const user of contributions) {
      const address = user.address;
      const amount = new web3.BigNumber(user.amount);

      global.logger.info(`${doneAddresses}/${totalAddresses} Address: ${address}`);

      global.logger.debug(`Address: ${address}, initial amount: ${amount}`);

      // calculate total initial token amount
      totalTokenAmount = totalTokenAmount.add(amount);

      const trxList = {};

      // get outcoming transactions
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

      // get incoming transactions
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

      // calculate the minimum hold amount
      if (Object.getOwnPropertyNames(trxList).length > 0) {
        for (const block of Object.keys(trxList)) {
          if (trxList.hasOwnProperty(block)) {
            const txLog = trxList[block];

            if (txLog.type === 'in') {
              result = result.add(txLog.value);
              global.logger.debug(`Address: ${address}, in ${txLog.value}`);
            } else {
              result = result.sub(txLog.value);
              global.logger.debug(`Address: ${address}, out ${txLog.value}`);
            }

            minValue = result.lt(minValue) ? result : minValue;
          }
        }
      }

      // store minimum values
      minValueMap[address] = minValue;
      await writeFile(minValueFile, JSON.stringify(minValueMap, null, 2), 'utf8');

      global.logger.debug(`Address: ${address}, minimum amount: ${minValue}`);

      // calculate total hold token amount
      holdTokenAmount = holdTokenAmount.add(minValue);

      // calculate the airdrop amount
      const airdropAmount = minValue.mul(this.dapp.airdropPercent).div(100);

      // store airdrop values
      airdropMap[address] = airdropAmount;
      await writeFile(airdropMapFile, JSON.stringify(airdropMap, null, 2), 'utf8');

      global.logger.debug(`Address: ${address}, airdrop amount: ${airdropAmount}`);

      if (minValue.gt(0)) {
        airdropArray.accounts.push(user.address);
        airdropArray.amounts.push(web3.toWei(airdropAmount));

        // store airdrop array
        await writeFile(airdropArrayFile, JSON.stringify(airdropArray, null, 2), 'utf8');
      }

      // calculate total airdrop amount
      totalAirdropAmount = totalAirdropAmount.add(airdropAmount);

      // set user map
      usersMap.push({
        address: user.address,
        initialAmount: user.amount,
        minimumValue: minValue,
        airdropAmount: airdropAmount,
        transactions: trxList,
      });

      // store user map
      await writeFile(transactionsFile, JSON.stringify(usersMap, null, 2), 'utf8');

      doneAddresses++;
    }

    global.logger.info(`Total initial token amount: ${totalTokenAmount}`);
    global.logger.info(`Total hold token amount: ${holdTokenAmount}`);
    global.logger.info(`Total airdrop token amount: ${totalAirdropAmount}`);
  }
}

module.exports = Airdrop;
