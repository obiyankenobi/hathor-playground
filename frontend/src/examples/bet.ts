export const betContractCode = `# Copyright 2023 Hathor Labs
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

from math import floor
from typing import Optional, TypeAlias

from hathor.nanocontracts.blueprint import Blueprint
from hathor.nanocontracts.context import Context
from hathor.nanocontracts.exception import NCFail
from hathor.nanocontracts.types import (
    Address,
    NCAction,
    NCActionType,
    SignedData,
    Timestamp,
    TokenUid,
    TxOutputScript,
    public,
    view,
)

Result: TypeAlias = str
Amount: TypeAlias = int


class InvalidToken(NCFail):
    pass


class ResultAlreadySet(NCFail):
    pass


class ResultNotAvailable(NCFail):
    pass


class WithdrawalNotAllowed(NCFail):
    pass


class DepositNotAllowed(NCFail):
    pass


class TooManyActions(NCFail):
    pass


class TooLate(NCFail):
    pass


class InsufficientBalance(NCFail):
    pass


class InvalidOracleSignature(NCFail):
    pass


class Bet(Blueprint):
    """Bet blueprint with final result provided by an oracle.

    The life cycle of contracts using this blueprint is the following:

    1. [Owner ] Create a contract.
    2. [User 1] \`bet(...)\` on result A.
    3. [User 2] \`bet(...)\` on result A.
    4. [User 3] \`bet(...)\` on result B.
    5. [Oracle] \`set_result(...)\` as result A.
    6. [User 1] \`withdraw(...)\`
    7. [User 2] \`withdraw(...)\`

    Notice that, in the example above, users 1 and 2 won.
    """

    # Total bets per result.
    bets_total: dict[Result, Amount]

    # Total bets per (result, address).
    bets_address: dict[tuple[Result, Address], Amount]

    # Bets grouped by address.
    address_details: dict[Address, dict[Result, Amount]]

    # Amount that has already been withdrawn per address.
    withdrawals: dict[Address, Amount]

    # Total bets.
    total: Amount

    # Final result.
    final_result: Optional[Result]

    # Oracle script to set the final result.
    oracle_script: TxOutputScript

    # Maximum timestamp to make a bet.
    date_last_bet: Timestamp

    # Token for this bet.
    token_uid: TokenUid

    @public
    def initialize(self, ctx: Context, oracle_script: TxOutputScript, token_uid: TokenUid,
                   date_last_bet: Timestamp) -> None:
        if len(ctx.actions) != 0:
            raise NCFail('must be a single call')
        self.oracle_script = oracle_script
        self.token_uid = token_uid
        self.date_last_bet = date_last_bet
        self.final_result = None
        self.total = Amount(0)

    @view
    def has_result(self) -> bool:
        """Return True if the final result has already been set."""
        return bool(self.final_result is not None)

    def fail_if_result_is_available(self) -> None:
        """Fail the execution if the final result has already been set."""
        if self.has_result():
            raise ResultAlreadySet

    def fail_if_result_is_not_available(self) -> None:
        """Fail the execution if the final result is not available yet."""
        if not self.has_result():
            raise ResultNotAvailable

    def fail_if_invalid_token(self, action: NCAction) -> None:
        """Fail the execution if the token is invalid."""
        if action.token_uid != self.token_uid:
            token1 = self.token_uid.hex() if self.token_uid else None
            token2 = action.token_uid.hex() if action.token_uid else None
            raise InvalidToken(f'invalid token ({token1} != {token2})')

    def _get_action(self, ctx: Context) -> NCAction:
        """Return the only action available; fails otherwise."""
        if len(ctx.actions) != 1:
            raise TooManyActions('only one action supported')
        if self.token_uid not in ctx.actions:
            raise InvalidToken(f'token different from {self.token_uid.hex()}')
        return ctx.actions[self.token_uid]

    @public
    def bet(self, ctx: Context, address: Address, score: str) -> None:
        """Make a bet."""
        action = self._get_action(ctx)
        if action.type != NCActionType.DEPOSIT:
            raise WithdrawalNotAllowed('must be deposit')
        self.fail_if_result_is_available()
        self.fail_if_invalid_token(action)
        if ctx.timestamp > self.date_last_bet:
            raise TooLate(f'cannot place bets after {self.date_last_bet}')
        amount = Amount(action.amount)
        self.total = Amount(self.total + amount)
        if score not in self.bets_total:
            self.bets_total[score] = amount
        else:
            self.bets_total[score] += amount
        key = (score, address)
        if key not in self.bets_address:
            self.bets_address[key] = amount
        else:
            self.bets_address[key] += amount

        # Update dict indexed by address
        partial = self.address_details.get(address, {})
        partial.update({
            score: self.bets_address[key]
        })

        self.address_details[address] = partial

    @public
    def set_result(self, ctx: Context, result: SignedData[Result]) -> None:
        """Set final result. This method is called by the oracle."""
        self.fail_if_result_is_available()
        if not result.checksig(self.oracle_script):
            raise InvalidOracleSignature
        self.final_result = result.data

    @public
    def withdraw(self, ctx: Context) -> None:
        """Withdraw tokens after the final result is set."""
        action = self._get_action(ctx)
        if action.type != NCActionType.WITHDRAWAL:
            raise DepositNotAllowed('action must be withdrawal')
        self.fail_if_result_is_not_available()
        self.fail_if_invalid_token(action)
        address = Address(ctx.address)
        allowed = self.get_max_withdrawal(address)
        if action.amount > allowed:
            raise InsufficientBalance(f'withdrawal amount is greater than available (max: {allowed})')
        if address not in self.withdrawals:
            self.withdrawals[address] = action.amount
        else:
            self.withdrawals[address] += action.amount

    @view
    def get_max_withdrawal(self, address: Address) -> Amount:
        """Return the maximum amount available for withdrawal."""
        total = self.get_winner_amount(address)
        withdrawals = self.withdrawals.get(address, Amount(0))
        return total - withdrawals

    @view
    def get_winner_amount(self, address: Address) -> Amount:
        """Return how much an address has won."""
        self.fail_if_result_is_not_available()
        if self.final_result not in self.bets_total:
            return Amount(0)
        result_total = self.bets_total[self.final_result]
        if result_total == 0:
            return Amount(0)
        address_total = self.bets_address.get((self.final_result, address), 0)
        percentage = address_total / result_total
        return Amount(floor(percentage * self.total))
`;

export const betTestCode = `import os
from typing import NamedTuple, Optional

from hathor.conf import HathorSettings
from hathor.crypto.util import decode_address
from hathor.nanocontracts.blueprints.bet import (
    Bet,
    DepositNotAllowed,
    InsufficientBalance,
    InvalidOracleSignature,
    InvalidToken,
    Result,
    ResultAlreadySet,
    ResultNotAvailable,
    TooLate,
    WithdrawalNotAllowed,
)
from hathor.nanocontracts.context import Context
from hathor.nanocontracts.storage import NCMemoryStorageFactory
from hathor.nanocontracts.storage.backends import MemoryNodeTrieStore
from hathor.nanocontracts.storage.patricia_trie import PatriciaTrie
from hathor.nanocontracts.types import Address, Amount, ContractId, NCAction, NCActionType, SignedData
from hathor.transaction.scripts import P2PKH
from hathor.util import not_none
from hathor.wallet import KeyPair
from tests import unittest
from tests.nanocontracts.utils import TestRunner

settings = HathorSettings()


class BetInfo(NamedTuple):
    key: KeyPair
    address: Address
    amount: Amount
    score: str


class NCBetBlueprintTestCase(unittest.TestCase):
    use_memory_storage = True

    def setUp(self):
        super().setUp()
        self.manager = self.create_peer('testnet')
        self.token_uid = settings.HATHOR_TOKEN_UID
        self.nc_id = ContractId(b'1' * 32)

        nc_storage_factory = NCMemoryStorageFactory()
        store = MemoryNodeTrieStore()
        block_trie = PatriciaTrie(store)
        self.runner = TestRunner(self.manager.tx_storage, nc_storage_factory, block_trie)
        self.nc_storage = self.runner.get_storage(self.nc_id)

    def _get_any_tx(self):
        genesis = self.manager.tx_storage.get_all_genesis()
        tx = list(genesis)[0]
        return tx

    def _get_any_address(self):
        password = os.urandom(12)
        key = KeyPair.create(password)
        address_b58 = key.address
        address_bytes = decode_address(not_none(address_b58))
        return address_bytes, key

    def get_current_timestamp(self):
        return int(self.clock.seconds())

    def _make_a_bet(self, amount: int, score: str, *, timestamp: Optional[int] = None) -> BetInfo:
        (address_bytes, key) = self._get_any_address()
        tx = self._get_any_tx()
        action = NCAction(NCActionType.DEPOSIT, self.token_uid, amount)
        if timestamp is None:
            timestamp = self.get_current_timestamp()
        context = Context([action], tx, address_bytes, timestamp=timestamp)
        self.runner.call_public_method(self.nc_id, 'bet', context, address_bytes, score)
        return BetInfo(key=key, address=Address(address_bytes), amount=Amount(amount), score=score)

    def _set_result(self, result: Result, oracle_key: Optional[KeyPair] = None) -> None:
        signed_result: SignedData[Result] = SignedData(result, b'')

        if oracle_key is None:
            oracle_key = self.oracle_key

        signed_result.script_input = oracle_key.p2pkh_create_input_data(b'123', signed_result.get_data_bytes())

        tx = self._get_any_tx()
        context = Context([], tx, Address(b''), timestamp=self.get_current_timestamp())
        self.runner.call_public_method(self.nc_id, 'set_result', context, signed_result)
        self.assertEqual(self.nc_storage.get('final_result'), '2x2')

    def _withdraw(self, address: Address, amount: int) -> None:
        tx = self._get_any_tx()
        action = NCAction(NCActionType.WITHDRAWAL, self.token_uid, amount)
        context = Context([action], tx, address, timestamp=self.get_current_timestamp())
        self.runner.call_public_method(self.nc_id, 'withdraw', context)

    def initialize_contract(self):
        runner = self.runner
        storage = self.nc_storage

        self.oracle_key = KeyPair.create(b'123')
        assert self.oracle_key.address is not None
        p2pkh = P2PKH(self.oracle_key.address)
        oracle_script = p2pkh.get_script()
        self.date_last_bet = self.get_current_timestamp() + 3600 * 24

        runner.register_contract(Bet, self.nc_id)

        tx = self._get_any_tx()
        context = Context([], tx, b'', timestamp=self.get_current_timestamp())
        runner.call_public_method(self.nc_id, 'initialize', context, oracle_script, self.token_uid, self.date_last_bet)
        self.assertEqual(storage.get('oracle_script'), oracle_script)
        self.assertEqual(storage.get('token_uid'), self.token_uid)
        self.assertEqual(storage.get('date_last_bet'), self.date_last_bet)

    def test_basic_flow(self) -> None:
        runner = self.runner
        self.initialize_contract()

        tx = self._get_any_tx()

        ###
        # Make some bets.
        ###
        self._make_a_bet(100, '1x1')
        self._make_a_bet(200, '1x1')
        self._make_a_bet(300, '1x1')
        bet1 = self._make_a_bet(500, '2x2')

        ###
        # Set the final result.
        ###
        self._set_result('2x2')

        ###
        # Single winner withdraws all funds.
        ###
        self.assertEqual(1100, runner.call_view_method(self.nc_id, 'get_max_withdrawal', bet1.address))

        self._withdraw(bet1.address, 100)
        self.assertEqual(1000, runner.call_view_method(self.nc_id, 'get_max_withdrawal', bet1.address))

        self._withdraw(bet1.address, 1000)
        self.assertEqual(0, runner.call_view_method(self.nc_id, 'get_max_withdrawal', bet1.address))

        # Out of funds! Any withdrawal must fail from now on...
        amount = 1
        action = NCAction(NCActionType.WITHDRAWAL, self.token_uid, amount)
        context = Context([action], tx, bet1.address, timestamp=self.get_current_timestamp())
        with self.assertRaises(InsufficientBalance):
            runner.call_public_method(self.nc_id, 'withdraw', context)

    def test_make_a_bet_with_withdrawal(self):
        self.initialize_contract()
        self._make_a_bet(100, '1x1')

        (address_bytes, _) = self._get_any_address()
        tx = self._get_any_tx()
        action = NCAction(NCActionType.WITHDRAWAL, self.token_uid, 1)
        context = Context([action], tx, address_bytes, timestamp=self.get_current_timestamp())
        score = '1x1'
        with self.assertRaises(WithdrawalNotAllowed):
            self.runner.call_public_method(self.nc_id, 'bet', context, address_bytes, score)

    def test_make_a_bet_after_result(self):
        self.initialize_contract()
        self._make_a_bet(100, '1x1')
        self._set_result('2x2')
        with self.assertRaises(ResultAlreadySet):
            self._make_a_bet(100, '1x1')

    def test_make_a_bet_after_date_last_bet(self):
        self.initialize_contract()
        with self.assertRaises(TooLate):
            self._make_a_bet(100, '1x1', timestamp=self.date_last_bet + 1)

    def test_set_results_two_times(self):
        self.initialize_contract()
        self._set_result('2x2')
        with self.assertRaises(ResultAlreadySet):
            self._set_result('5x1')

    def test_set_results_wrong_signature(self):
        self.initialize_contract()
        wrong_oracle_key = KeyPair.create(b'123')
        with self.assertRaises(InvalidOracleSignature):
            self._set_result('3x2', oracle_key=wrong_oracle_key)

    def test_withdraw_before_result(self):
        self.initialize_contract()
        bet1 = self._make_a_bet(100, '1x1')
        with self.assertRaises(ResultNotAvailable):
            self._withdraw(bet1.address, 100)

    def test_withdraw_with_deposits(self):
        self.initialize_contract()
        (address_bytes, _) = self._get_any_address()
        tx = self._get_any_tx()
        action = NCAction(NCActionType.DEPOSIT, self.token_uid, 1)
        context = Context([action], tx, address_bytes, timestamp=self.get_current_timestamp())
        with self.assertRaises(DepositNotAllowed):
            self.runner.call_public_method(self.nc_id, 'withdraw', context)

    def test_make_a_bet_wrong_token(self):
        self.initialize_contract()

        (address_bytes, _) = self._get_any_address()
        tx = self._get_any_tx()
        token_uid = b'xxx'
        self.assertNotEqual(token_uid, self.token_uid)
        action = NCAction(NCActionType.DEPOSIT, token_uid, 1)
        context = Context([action], tx, address_bytes, timestamp=self.get_current_timestamp())
        score = '1x1'
        with self.assertRaises(InvalidToken):
            self.runner.call_public_method(self.nc_id, 'bet', context, address_bytes, score)

    def test_withdraw_wrong_token(self):
        self.initialize_contract()
        bet1 = self._make_a_bet(100, '1x1')

        tx = self._get_any_tx()
        token_uid = b'xxx'
        self.assertNotEqual(token_uid, self.token_uid)
        action = NCAction(NCActionType.WITHDRAWAL, token_uid, 1)
        context = Context([action], tx, bet1.address, timestamp=self.get_current_timestamp())
        with self.assertRaises(InvalidToken):
            self.runner.call_public_method(self.nc_id, 'withdraw', context)
`;