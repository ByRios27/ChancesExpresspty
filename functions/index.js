const { onSchedule } = require('firebase-functions/v2/scheduler');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

admin.initializeApp();

const FIRESTORE_DATABASE_ID =
  process.env.FIRESTORE_DATABASE_ID;
const db = getFirestore(admin.app(), FIRESTORE_DATABASE_ID);
const FieldValue = admin.firestore.FieldValue;
const Timestamp = admin.firestore.Timestamp;

const PANAMA_TIMEZONE = 'America/Panama';
const SYSTEM_JOBS_COLLECTION = 'systemJobs';

function toPanamaDateString(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: PANAMA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function getPreviousBusinessDate() {
  const now = new Date();
  const previousDay = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return toPanamaDateString(previousDay);
}

function getPanamaDayRangeMs(dateString) {
  // Panama is fixed UTC-05:00.
  const startMs = new Date(`${dateString}T00:00:00-05:00`).getTime();
  const endMs = new Date(`${dateString}T24:00:00-05:00`).getTime();
  return { startMs, endMs };
}

function safeNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function toMapById(snapshot) {
  const map = new Map();
  snapshot.forEach((docSnap) => {
    map.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
  });
  return map;
}

function getDrawStatsFromTicket(ticket, drawId) {
  const drawCount = Array.isArray(ticket.drawIds) && ticket.drawIds.length > 0 ? ticket.drawIds.length : 1;

  let sold = safeNumber(ticket.total) / drawCount;
  let prize = safeNumber(ticket.totalPrize) / drawCount;
  let plays = 0;

  if (Array.isArray(ticket.drawEntries)) {
    const group = ticket.drawEntries.find((item) => item && item.drawId === drawId);
    if (group) {
      sold = safeNumber(group.subtotal);
      if (Array.isArray(group.entries)) {
        prize = group.entries.reduce((sum, entry) => sum + safeNumber(entry?.prize), 0);
        plays = group.entries.reduce((sum, entry) => sum + safeNumber(entry?.pieces), 0);
      }
    }
  }

  return {
    sold,
    prize,
    plays,
  };
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function writeBatches(docs) {
  const chunks = chunkArray(docs, 450);
  for (const chunk of chunks) {
    const batch = db.batch();
    chunk.forEach(({ ref, data, merge }) => {
      batch.set(ref, data, merge ? { merge: true } : undefined);
    });
    await batch.commit();
  }
}

exports.dailyArchiveAndReset = onSchedule(
  {
    schedule: '0 4 * * *',
    timeZone: PANAMA_TIMEZONE,
    region: 'us-central1',
    memory: '512MiB',
    timeoutSeconds: 540,
  },
  async () => {
    const businessDate = getPreviousBusinessDate();
    const { startMs, endMs } = getPanamaDayRangeMs(businessDate);
    const jobId = `dailyReset_${businessDate}`;
    const jobRef = db.collection(SYSTEM_JOBS_COLLECTION).doc(jobId);
    const startedAt = Timestamp.now();

    let shouldRun = true;

    await db.runTransaction(async (tx) => {
      const existing = await tx.get(jobRef);
      if (existing.exists) {
        const data = existing.data() || {};
        if (data.status === 'success') {
          shouldRun = false;
          return;
        }
      }

      tx.set(
        jobRef,
        {
          jobType: 'dailyArchiveAndReset',
          businessDate,
          timezone: PANAMA_TIMEZONE,
          status: 'running',
          startedAt,
          updatedAt: startedAt,
        },
        { merge: true }
      );
    });

    if (!shouldRun) {
      logger.info('Daily job already completed for this business date.', { businessDate });
      return;
    }

    try {
      const [ticketsSnap, usersSnap, drawsSnap, betsControlSnap] = await Promise.all([
        db
          .collection('tickets')
          .where('timestamp', '>=', startMs)
          .where('timestamp', '<', endMs)
          .get(),
        db.collection('users').get(),
        db.collection('draws').get(),
        db.collection('betsControl').get(),
      ]);

      const usersMap = toMapById(usersSnap);
      const drawsMap = toMapById(drawsSnap);

      const userAgg = new Map();
      const drawAgg = new Map();

      let totalSales = 0;
      let totalCommission = 0;
      let totalPrizes = 0;
      let totalTickets = 0;
      let totalWinningTickets = 0;
      let totalPlays = 0;

      ticketsSnap.forEach((docSnap) => {
        const ticket = { id: docSnap.id, ...docSnap.data() };

        const ticketSales = safeNumber(ticket.total);
        const ticketCommission = safeNumber(ticket.commission);
        const ticketPrizes = safeNumber(ticket.totalPrize);
        const ticketIsWinner = ticketPrizes > 0;

        totalSales += ticketSales;
        totalCommission += ticketCommission;
        totalPrizes += ticketPrizes;
        totalTickets += 1;
        if (ticketIsWinner) totalWinningTickets += 1;

        const userId = ticket.userId || 'unknown';
        const userData = usersMap.get(userId);

        if (!userAgg.has(userId)) {
          userAgg.set(userId, {
            userId,
            sellerId: userData?.sellerId || ticket.sellerId || null,
            sellerName: userData?.name || ticket.sellerName || 'Desconocido',
            totalSales: 0,
            commission: 0,
            prizes: 0,
            ticketCount: 0,
            winningTicketCount: 0,
            capitalInjection: safeNumber(userData?.capitalInjection),
          });
        }

        const userItem = userAgg.get(userId);
        userItem.totalSales += ticketSales;
        userItem.commission += ticketCommission;
        userItem.prizes += ticketPrizes;
        userItem.ticketCount += 1;
        if (ticketIsWinner) userItem.winningTicketCount += 1;

        const drawIds = Array.isArray(ticket.drawIds) ? ticket.drawIds : [];
        drawIds.forEach((drawId) => {
          if (!drawAgg.has(drawId)) {
            const drawData = drawsMap.get(drawId);
            drawAgg.set(drawId, {
              drawId,
              drawName: drawData?.name || drawId,
              totalSold: 0,
              totalPrizes: 0,
              utility: 0,
              ticketCount: 0,
              playsCount: 0,
            });
          }

          const stats = getDrawStatsFromTicket(ticket, drawId);
          const drawItem = drawAgg.get(drawId);
          drawItem.totalSold += stats.sold;
          drawItem.totalPrizes += stats.prize;
          drawItem.ticketCount += 1;
          drawItem.playsCount += stats.plays;

          totalPlays += stats.plays;
        });
      });

      const archivedUserLiquidations = Array.from(userAgg.values()).map((item) => {
        const utility = item.totalSales - item.commission - item.prizes;
        const balanceFinal = utility + item.capitalInjection;

        return {
          ...item,
          businessDate,
          utility,
          balanceFinal,
          createdAt: FieldValue.serverTimestamp(),
          sourceVersion: 'v1',
        };
      });

      const archivedDrawSummaries = Array.from(drawAgg.values()).map((item) => {
        const utility = item.totalSold - item.totalPrizes;
        return {
          ...item,
          businessDate,
          utility,
          createdAt: FieldValue.serverTimestamp(),
          sourceVersion: 'v1',
        };
      });

      const totalCapitalInjection = archivedUserLiquidations.reduce(
        (sum, item) => sum + safeNumber(item.capitalInjection),
        0
      );
      const totalUtility = totalSales - totalCommission - totalPrizes + totalCapitalInjection;

      const summaryDoc = {
        businessDate,
        createdAt: FieldValue.serverTimestamp(),
        sourceVersion: 'v1',
        timezone: PANAMA_TIMEZONE,
        totals: {
          totalSales,
          totalCommission,
          totalPrizes,
          totalUtility,
          totalCapitalInjection,
          totalTickets,
          totalWinningTickets,
          totalPlays,
          totalUsersActive: archivedUserLiquidations.length,
          totalDrawsWorked: archivedDrawSummaries.length,
        },
      };

      const archiveWrites = [];

      archiveWrites.push({
        ref: db.collection('archivesDaily').doc(businessDate),
        data: summaryDoc,
      });

      archivedUserLiquidations.forEach((item) => {
        archiveWrites.push({
          ref: db.collection('archivedUserLiquidations').doc(`${businessDate}_${item.userId}`),
          data: item,
        });
      });

      archivedDrawSummaries.forEach((item) => {
        archiveWrites.push({
          ref: db.collection('archivedDrawSummaries').doc(`${businessDate}_${item.drawId}`),
          data: item,
        });
      });

      // Archive first. If this fails, cleanup is not executed.
      await writeBatches(archiveWrites);

      const writer = db.bulkWriter();

      ticketsSnap.forEach((docSnap) => {
        writer.delete(docSnap.ref);
      });

      drawsSnap.forEach((docSnap) => {
        const drawData = docSnap.data() || {};
        if (drawData.results) {
          writer.update(docSnap.ref, { results: FieldValue.delete() });
        }
      });

      usersSnap.forEach((docSnap) => {
        const userData = docSnap.data() || {};
        if (safeNumber(userData.capitalInjection) !== 0) {
          writer.update(docSnap.ref, { capitalInjection: 0 });
        }
      });

      betsControlSnap.forEach((docSnap) => {
        writer.delete(docSnap.ref);
      });

      await writer.close();

      const finishedAt = Timestamp.now();
      await jobRef.set(
        {
          status: 'success',
          finishedAt,
          updatedAt: finishedAt,
          stats: {
            archivedTickets: totalTickets,
            archivedUserLiquidations: archivedUserLiquidations.length,
            archivedDrawSummaries: archivedDrawSummaries.length,
            deletedTickets: ticketsSnap.size,
            clearedDrawResults: drawsSnap.size,
            resetUserInjections: usersSnap.size,
            deletedBetsControlDocs: betsControlSnap.size,
          },
        },
        { merge: true }
      );

      logger.info('Daily archive and reset completed.', {
        businessDate,
        archivedTickets: totalTickets,
        firestoreDatabaseId: FIRESTORE_DATABASE_ID,
      });
    } catch (error) {
      const finishedAt = Timestamp.now();
      await jobRef.set(
        {
          status: 'failed',
          finishedAt,
          updatedAt: finishedAt,
          errorMessage: error instanceof Error ? error.message : String(error),
        },
        { merge: true }
      );

      logger.error('Daily archive and reset failed.', {
        businessDate,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }
);
