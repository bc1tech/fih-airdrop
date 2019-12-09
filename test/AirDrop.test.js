const { BN, constants, expectRevert } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;

const { shouldBehaveLikeAirDrop } = require('./AirDrop.behaviour');

const AirDrop = artifacts.require('AirDrop');
const ERC20Mock = artifacts.require('ERC20Mock');

contract('AirDrop', function (accounts) {
  const [
    tokenOwner,
    airdropOwner,
  ] = accounts;

  const tokenCap = new BN(100000);

  const cap = new BN(20000);

  beforeEach(async function () {
    this.token = await ERC20Mock.new(tokenOwner, tokenCap, { from: tokenOwner });
  });

  context('creating a valid airdrop', function () {
    describe('if token address is the zero address', function () {
      it('reverts', async function () {
        await expectRevert.unspecified(
          AirDrop.new(ZERO_ADDRESS, cap, tokenOwner, { from: airdropOwner }),
        );
      });
    });

    describe('if cap is zero', function () {
      it('reverts', async function () {
        await expectRevert.unspecified(
          AirDrop.new(this.token.address, 0, tokenOwner, { from: airdropOwner }),
        );
      });
    });

    describe('if wallet address is the zero address', function () {
      it('reverts', async function () {
        await expectRevert.unspecified(
          AirDrop.new(this.token.address, cap, ZERO_ADDRESS, { from: airdropOwner }),
        );
      });
    });

    context('testing behaviours', function () {
      beforeEach(async function () {
        this.airdrop = await AirDrop.new(
          this.token.address,
          cap,
          tokenOwner,
          { from: airdropOwner },
        );
      });

      context('once deployed', function () {
        shouldBehaveLikeAirDrop(accounts, cap);
      });
    });
  });
});
