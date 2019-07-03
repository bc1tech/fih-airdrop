const Dapp = require('../lib/dapp.js');

class Airdrop {
  constructor (command) {
    this.dapp = new Dapp(command);
  }

  async start () {
    global.logger.info('TODO');
  }
}

module.exports = Airdrop;
