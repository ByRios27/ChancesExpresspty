const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

const FIRESTORE_DATABASE_ID = process.env.FIRESTORE_DATABASE_ID;
const db = getFirestore(admin.app(), FIRESTORE_DATABASE_ID);
const FieldValue = admin.firestore.FieldValue;

const TICKETS_COLLECTION = 'tickets';
const IDEMPOTENCY_COLLECTION = 'ticketIdempotencyKeys';
const COUNTERS_COLLECTION = 'ticketCounters';
const AUDIT_LOGS_COLLECTION = 'audit_logs';
const CREATE_TICKET_REGION = 'us-central1';

const BUSINESS_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidBusinessDate(value) {
  if (typeof value !== 'string' || !BUSINESS_DATE_REGEX.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function ensureNonEmptyString(value, fieldName) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new HttpsError('invalid-argument', `${fieldName} is required`);
  }
  return value.trim();
}

function ensureNumbersArray(numbers) {
  if (!Array.isArray(numbers) || numbers.length === 0) {
    throw new HttpsError('invalid-argument', 'numbers must be a non-empty array');
  }

  numbers.forEach((value, index) => {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new HttpsError('invalid-argument', `numbers[${index}] must be a non-empty string`);
    }
  });

  return numbers.map((value) => value.trim());
}

function ensurePlaysArray(plays) {
  if (!Array.isArray(plays) || plays.length === 0) {
    throw new HttpsError('invalid-argument', 'plays must be a non-empty array');
  }

  return plays.map((play, index) => {
    if (!play || typeof play !== 'object') {
      throw new HttpsError('invalid-argument', `plays[${index}] must be an object`);
    }

    const number = ensureNonEmptyString(play.number, `plays[${index}].number`);
    const playType = ensureNonEmptyString(play.playType, `plays[${index}].playType`);
    const amount = Number(play.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new HttpsError('invalid-argument', `plays[${index}].amount must be a positive number`);
    }

    return {
      number,
      playType,
      amount,
    };
  });
}

function ensureTotalAmount(totalAmount) {
  const normalizedAmount = Number(totalAmount);
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    throw new HttpsError('invalid-argument', 'totalAmount must be a positive number');
  }
  return normalizedAmount;
}

function formatTicketCode(businessDate, sequence) {
  const compactDate = businessDate.replace(/-/g, '');
  const paddedSequence = String(sequence).padStart(6, '0');
  return `TKT-${compactDate}-${paddedSequence}`;
}

function normalizeCreateTicketInput(rawInput) {
  if (!rawInput || typeof rawInput !== 'object') {
    throw new HttpsError('invalid-argument', 'input payload is required');
  }

  const idempotencyKey = ensureNonEmptyString(rawInput.idempotencyKey, 'idempotencyKey');
  const sellerId = ensureNonEmptyString(rawInput.sellerId, 'sellerId');
  const sellerCode = ensureNonEmptyString(rawInput.sellerCode, 'sellerCode');
  const customerName = ensureNonEmptyString(rawInput.customerName, 'customerName');
  const businessDate = ensureNonEmptyString(rawInput.businessDate, 'businessDate');
  const drawId = ensureNonEmptyString(rawInput.drawId, 'drawId');

  if (!isValidBusinessDate(businessDate)) {
    throw new HttpsError('invalid-argument', 'businessDate must follow YYYY-MM-DD');
  }

  const numbers = ensureNumbersArray(rawInput.numbers);
  const plays = ensurePlaysArray(rawInput.plays);
  const totalAmount = ensureTotalAmount(rawInput.totalAmount);

  return {
    idempotencyKey,
    sellerId,
    sellerCode,
    customerName,
    businessDate,
    drawId,
    numbers,
    plays,
    totalAmount,
  };
}

exports.createTicket = onCall(
  {
    region: CREATE_TICKET_REGION,
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request) => {
    const input = normalizeCreateTicketInput(request.data);
    const idempotencyRef = db.collection(IDEMPOTENCY_COLLECTION).doc(input.idempotencyKey);
    const counterRef = db.collection(COUNTERS_COLLECTION).doc(`businessDate_${input.businessDate}`);

    const transactionResult = await db.runTransaction(async (tx) => {
      const existingIdempotencyDoc = await tx.get(idempotencyRef);

      if (existingIdempotencyDoc.exists) {
        const existingData = existingIdempotencyDoc.data() || {};
        const existingTicketId = existingData.ticketId;
        if (!existingTicketId) {
          throw new HttpsError('internal', 'Idempotency record exists without ticketId');
        }
        const existingTicketRef = db.collection(TICKETS_COLLECTION).doc(existingTicketId);
        const existingTicketDoc = await tx.get(existingTicketRef);
        if (!existingTicketDoc.exists) {
          throw new HttpsError('internal', 'Idempotency record points to missing ticket');
        }

        return {
          ticketId: existingTicketDoc.id,
          ticket: existingTicketDoc.data(),
          created: false,
        };
      }

      const counterDoc = await tx.get(counterRef);
      const currentSequence = counterDoc.exists ? Number(counterDoc.data()?.nextSequence || 1) : 1;
      const nextSequence = currentSequence + 1;
      const ticketCode = formatTicketCode(input.businessDate, currentSequence);

      const ticketRef = db.collection(TICKETS_COLLECTION).doc();
      const now = FieldValue.serverTimestamp();

      const ticketDoc = {
        id: ticketRef.id,
        ticketCode,
        idempotencyKey: input.idempotencyKey,
        sellerId: input.sellerId,
        sellerCode: input.sellerCode,
        customerName: input.customerName,
        businessDate: input.businessDate,
        drawId: input.drawId,
        numbers: input.numbers,
        plays: input.plays,
        totalAmount: input.totalAmount,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };

      tx.set(ticketRef, ticketDoc);
      tx.set(idempotencyRef, {
        ticketId: ticketRef.id,
        ticketCode,
        businessDate: input.businessDate,
        createdAt: now,
        updatedAt: now,
      });
      tx.set(
        counterRef,
        {
          businessDate: input.businessDate,
          nextSequence,
          updatedAt: now,
        },
        { merge: true }
      );
      tx.set(db.collection(AUDIT_LOGS_COLLECTION).doc(`ticket_created_${ticketRef.id}`), {
        eventType: 'ticket_created',
        entityType: 'ticket',
        entityId: ticketRef.id,
        ticketCode,
        businessDate: input.businessDate,
        sellerId: input.sellerId,
        sellerCode: input.sellerCode,
        idempotencyKey: input.idempotencyKey,
        createdAt: now,
      });

      return {
        ticketId: ticketRef.id,
        ticket: ticketDoc,
        created: true,
      };
    });

    return {
      ok: true,
      created: transactionResult.created,
      ticketId: transactionResult.ticketId,
      ticketCode: transactionResult.ticket.ticketCode,
      status: transactionResult.ticket.status,
      ticket: transactionResult.ticket,
      message: transactionResult.created
        ? 'Ticket created successfully'
        : 'Ticket already existed for this idempotencyKey',
    };
  }
);
