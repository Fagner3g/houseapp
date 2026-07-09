/**
 * Run: node chrome-extension/lib/pay-utils.test.js
 */
const assert = require('node:assert/strict')

require('./pay-utils.js')

const { formatPaidAmountReais, parseCurrency } = globalThis.HouseAppPay

assert.equal(formatPaidAmountReais(17000), '17000.00')
assert.equal(formatPaidAmountReais(129.9), '129.90')
assert.equal(parseCurrency('17.000,00'), 17000)

console.log('pay-utils.test.js: all passed')
