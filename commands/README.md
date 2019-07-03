## Commands to do stuffs with smart contracts

### Usage

```bash
node commands
```

You will be prompted with

```bash
enter command (tab to autocomplete):
```

Available tasks `contributions`, `airdrop`.

#### contributions

Analyse ICO and produce the contributions array

#### airdrop

Analyse contributions and produce the airdrop array

### Examples

#### Development

```bash
node commands --input="./commands/sample-data/contributions.json"
```

#### Main Ethereum Network

```bash
node commands --endpoint=https://mainnet.infura.io --net-id=1 --contract=0xe554EE8f6Fc36F6fDdD40028D061BB8779437620
```

```bash
node commands --endpoint=[geth ip] --net-id=1 --contract=0xdfC3e857c8cCEA7657E0ed98AB92e048e38deE0f --input=./commands/input/contributions.json --block=8077558 --airdrop-percent=1.5
```

### Options

```bash
--endpoint, -e      ethereum rpc endpoint.                              [string]    [default: "http://127.0.0.1:8545"]
--input, -i         path of json file containing the list of datas      [string]    [default: "./input/contributions.json"]
--out, -o           directory for json files where to store results     [string]    [default: "./scripts/output"]
--net-id, -n        network id                                          [number]    [default: 5777]
--block, -b         block number                                        [string]    [default: "latest"]
--from, -f          sending address                                     [string]
--contract, -c      contract address                                    [string]
--init-wallet       init wallet or not                                  [boolean]   [default: false]
--airdrop-percent   percent of token to airdrop                         [number]   [default: 1.5]
--gas-limit         provided gas limit                                  [number]    [default: 6721975]
--gas-price         provided gas price in gwei                          [number]    [default: 5]
--nonce             progressive nonce id                                [number]
--log-level         log level used for logging                          [string]    [default: "debug"]
--pause-every       pause every the specified number of transactions    [number]    [default: 1]
--timeout           number of seconds to wait                           [number]    [default: 10]
--bulk              number of addresses to use                          [number]    [default: 1]
--dryrun            simulate sends                                      [boolean]
--help              show help                                           [boolean]
```
