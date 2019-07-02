const { BN, expectRevert } = require('openzeppelin-test-helpers');

const { shouldBehaveLikeTokenRecover } = require('eth-token-recover/test/TokenRecover.behaviour');

function shouldBehaveLikeAirDrop (accounts, cap) {
  const [
    tokenOwner,
    airdropOwner,
    anotherAccount,
    thirdParty,
    ...receivers
  ] = accounts;

  const addresses = receivers;
  const amounts = [];
  for (const arrayIndex in addresses) {
    amounts.push(new BN(100 * arrayIndex));
  }

  describe('check properties', function () {
    it('has a valid token', async function () {
      assert.equal(await this.airdrop.token(), this.token.address);
    });

    it('has a valid cap', async function () {
      (await this.airdrop.cap()).should.be.bignumber.equal(cap);
    });

    it('has a valid wallet', async function () {
      (await this.airdrop.wallet()).should.be.equal(tokenOwner);
    });
  });

  context('sending tokens', function () {
    describe('if spender has not allowance', function () {
      it('reverts', async function () {
        await expectRevert.unspecified(
          this.airdrop.multiSend([addresses[1]], [100], { from: airdropOwner })
        );
      });
    });

    describe('if spender has allowance', function () {
      beforeEach(async function () {
        await this.token.approve(this.airdrop.address, cap, { from: tokenOwner });
      });

      describe('if owner is calling', function () {
        it('should transfer tokens for given addresses', async function () {
          for (const arrayIndex in addresses) {
            const receiverBalance = await this.token.balanceOf(addresses[arrayIndex]);
            receiverBalance.should.be.bignumber.equal(new BN(0));
          }

          await this.airdrop.multiSend(addresses, amounts, { from: airdropOwner });

          for (const arrayIndex in addresses) {
            const receiverBalance = await this.token.balanceOf(addresses[arrayIndex]);

            const expectedTokens = amounts[arrayIndex];
            receiverBalance.should.be.bignumber.equal(expectedTokens);
          }
        });

        it('should increase receivedTokens', async function () {
          for (const arrayIndex in addresses) {
            const receiverBalance = await this.token.balanceOf(addresses[arrayIndex]);
            receiverBalance.should.be.bignumber.equal(new BN(0));
          }

          await this.airdrop.multiSend(addresses, amounts, { from: airdropOwner });

          for (const arrayIndex in addresses) {
            const receivedTokens = await this.airdrop.receivedTokens(addresses[arrayIndex]);

            const expectedTokens = amounts[arrayIndex];
            receivedTokens.should.be.bignumber.equal(expectedTokens);
          }
        });

        it('should increase distributedTokens', async function () {
          let totalGivenTokens = new BN(0);

          await this.airdrop.multiSend(addresses, amounts, { from: airdropOwner });

          for (const arrayIndex in amounts) {
            totalGivenTokens = totalGivenTokens.add(amounts[arrayIndex]);
          }
          const distributedTokens = await this.airdrop.distributedTokens();
          distributedTokens.should.be.bignumber.equal(totalGivenTokens);
        });

        it('should decrease remainingTokens', async function () {
          let totalGivenTokens = new BN(0);

          await this.airdrop.multiSend(addresses, amounts, { from: airdropOwner });

          for (const arrayIndex in amounts) {
            totalGivenTokens = totalGivenTokens.add(amounts[arrayIndex]);
          }
          const remainingTokens = await this.airdrop.remainingTokens();
          remainingTokens.should.be.bignumber.equal(
            cap.sub(totalGivenTokens)
          );
        });

        describe('calling twice', function () {
          it('should not transfer tokens for given addresses', async function () {
            for (const arrayIndex in addresses) {
              const receiverBalance = await this.token.balanceOf(addresses[arrayIndex]);
              receiverBalance.should.be.bignumber.equal(new BN(0));
            }

            await this.airdrop.multiSend(addresses, amounts, { from: airdropOwner });
            await this.airdrop.multiSend(addresses, amounts, { from: airdropOwner });

            for (const arrayIndex in addresses) {
              const receiverBalance = await this.token.balanceOf(addresses[arrayIndex]);

              const expectedTokens = amounts[arrayIndex];
              receiverBalance.should.be.bignumber.equal(expectedTokens);
            }
          });

          it('should not increase receivedTokens', async function () {
            for (const arrayIndex in addresses) {
              const receiverBalance = await this.token.balanceOf(addresses[arrayIndex]);
              receiverBalance.should.be.bignumber.equal(new BN(0));
            }

            await this.airdrop.multiSend(addresses, amounts, { from: airdropOwner });
            await this.airdrop.multiSend(addresses, amounts, { from: airdropOwner });

            for (const arrayIndex in addresses) {
              const receivedTokens = await this.airdrop.receivedTokens(addresses[arrayIndex]);

              const expectedTokens = amounts[arrayIndex];
              receivedTokens.should.be.bignumber.equal(expectedTokens);
            }
          });

          it('should not increase distributedTokens', async function () {
            let totalGivenTokens = new BN(0);

            await this.airdrop.multiSend(addresses, amounts, { from: airdropOwner });
            await this.airdrop.multiSend(addresses, amounts, { from: airdropOwner });

            for (const arrayIndex in amounts) {
              totalGivenTokens = totalGivenTokens.add(amounts[arrayIndex]);
            }
            const distributedTokens = await this.airdrop.distributedTokens();
            distributedTokens.should.be.bignumber.equal(totalGivenTokens);
          });

          it('should not decrease remainingTokens', async function () {
            await this.airdrop.multiSend(addresses, amounts, { from: airdropOwner });
            const remainingTokens = await this.airdrop.remainingTokens();

            await this.airdrop.multiSend(addresses, amounts, { from: airdropOwner });
            (await this.airdrop.remainingTokens()).should.be.bignumber.equal(remainingTokens);
          });
        });

        describe('if sending more than the cap', function () {
          it('reverts', async function () {
            const moreThanTheCap = cap.addn(1);
            await expectRevert.unspecified(
              this.airdrop.multiSend([addresses[1]], [moreThanTheCap], { from: airdropOwner })
            );
          });
        });

        describe('if addresses are empty', function () {
          it('reverts', async function () {
            await expectRevert.unspecified(
              this.airdrop.multiSend([], amounts, { from: airdropOwner })
            );
          });
        });

        describe('if amounts are empty', function () {
          it('reverts', async function () {
            await expectRevert.unspecified(
              this.airdrop.multiSend(addresses, [], { from: airdropOwner })
            );
          });
        });

        describe('if amounts length is not equal to addresses length', function () {
          it('reverts', async function () {
            await expectRevert.unspecified(
              this.airdrop.multiSend([addresses[0]], [amounts[0], amounts[1]], { from: airdropOwner })
            );
          });
        });
      });

      describe('if token owner is calling', function () {
        it('reverts', async function () {
          await expectRevert.unspecified(
            this.airdrop.multiSend(addresses, amounts, { from: tokenOwner })
          );
        });
      });

      describe('if another account is calling', function () {
        it('reverts', async function () {
          await expectRevert.unspecified(
            this.airdrop.multiSend(addresses, amounts, { from: anotherAccount })
          );
        });
      });
    });
  });

  context('like a TokenRecover', function () {
    beforeEach(async function () {
      this.instance = this.airdrop;
    });

    shouldBehaveLikeTokenRecover([airdropOwner, thirdParty]);
  });
}

module.exports = {
  shouldBehaveLikeAirDrop,
};
