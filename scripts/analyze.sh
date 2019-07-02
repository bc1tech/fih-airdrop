#!/usr/bin/env bash

surya inheritance dist/AirDrop.dist.sol | dot -Tpng > analysis/inheritance-tree/AirDrop.png

surya graph dist/AirDrop.dist.sol | dot -Tpng > analysis/control-flow/AirDrop.png

surya mdreport analysis/description-table/AirDrop.md dist/AirDrop.dist.sol
