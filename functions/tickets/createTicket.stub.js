/**
 * Future backend contract for createTicket.
 * This is a non-active stub for BLOCK 3 preparation only.
 * It is not exported from functions/index.js and does not write to Firestore.
 */

/**
 * @typedef {Object} CreateTicketPlayInput
 * @property {string} number
 * @property {number} amount
 * @property {string} playType
 */

/**
 * @typedef {Object} CreateTicketInput
 * @property {string} idempotencyKey Required. Must be unique per logical create operation.
 * @property {string} sellerId Required.
 * @property {string} sellerCode Required.
 * @property {string} customerName Required.
 * @property {string} businessDate Required. Format YYYY-MM-DD.
 * @property {string} drawId Required.
 * @property {string[]} numbers Required.
 * @property {CreateTicketPlayInput[]} plays Required.
 * @property {number} totalAmount Required.
 */

/**
 * @typedef {Object} CreateTicketOutput
 * @property {boolean} ok
 * @property {string} ticketId
 * @property {string} ticketCode
 * @property {string} status
 * @property {string} message
 */

/**
 * Future callable/HTTP handler signature for createTicket.
 * - Must enforce idempotency with idempotencyKey before any write.
 * - Must validate required fields and numeric constraints.
 * - Must validate seller/draw references and businessDate format.
 * - Must create ticket atomically and return deterministic response for duplicates.
 *
 * @param {CreateTicketInput} _input
 * @returns {Promise<CreateTicketOutput>}
 */
async function createTicketStub(_input) {
  throw new Error('createTicket is not implemented yet. BLOCK 3 stub only.');
}

module.exports = {
  createTicketStub,
};
