const prompt = require('prompt-sync')({
  sigInt: true,
  autocomplete: complete(['contributions', 'airdrop']),
});

const command = prompt('enter command (tab to autocomplete): ', { value: '' });

let Executor = null;

switch (command) {
case 'contributions':
  Executor = require('./core/contributions.js');
  break;
case 'airdrop':
  Executor = require('./core/airdrop.js');
  break;
default:
  console.error(`command ${command} not found!`);
}

if (Executor) {
  new Executor(command).start()
    .then(() => {
      console.log(`\ncommand ${command} done! 💪`);
    })
    .catch(err => {
      console.error(`\ncommand ${command} fail! ❌️`);
      console.error(err);
      // process.exit(1);
    });
}

function complete (commands) {
  return function (str) {
    let i;
    const ret = [];
    for (i = 0; i < commands.length; i++) {
      if (commands[i].indexOf(str) === 0) {
        ret.push(commands[i]);
      }
    }
    return ret;
  };
}
