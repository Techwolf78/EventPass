const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
admin.initializeApp();

const { Expo } = require("expo-server-sdk");
const expo = new Expo();

/**
 * Cloud Function: sendCheckInNotification
 *
 * Triggers on every new document in the `attendance` collection.
 * Reads ALL Expo Push Tokens from `pushTokens` and sends a real
 * push notification to every registered device.
 *
 * This is what delivers notifications when the app is:
 * - In the background
 * - Killed / force-closed
 * - Device is locked (lock screen notification)
 *
 * Works for ALL users — admin, attendee, guest — everyone gets notified.
 */
exports.sendCheckInNotification = onDocumentCreated(
  "attendance/{attendanceId}",
  async (event) => {
    const snap = event.data;
    if (!snap) {
      console.log("No data associated with the event");
      return;
    }

    const attendanceData = snap.data();
    const candidateName = attendanceData.candidateName || "A guest";

    // 1. Read all registered push tokens from Firestore
    const tokensSnapshot = await admin
      .firestore()
      .collection("pushTokens")
      .get();

    if (tokensSnapshot.empty) {
      console.log("No push tokens registered — no notifications to send.");
      return;
    }

    // 2. Build Expo push messages
    const messages = [];
    const invalidTokenDocs = [];

    for (const doc of tokensSnapshot.docs) {
      const { token } = doc.data();

      if (!Expo.isExpoPushToken(token)) {
        console.warn(`Invalid Expo push token, will remove: ${token}`);
        invalidTokenDocs.push(doc.id);
        continue;
      }

      messages.push({
        to: token,
        sound: "default",
        title: "Guest Arrived! 🎉",
        body: `${candidateName} has arrived at the event.`,
        priority: "high",
        channelId: "checkins",
      });
    }

    // 3. Clean up invalid tokens
    const batch = admin.firestore().batch();
    for (const docId of invalidTokenDocs) {
      batch.delete(admin.firestore().collection("pushTokens").doc(docId));
    }
    if (invalidTokenDocs.length > 0) {
      await batch.commit();
      console.log(`Removed ${invalidTokenDocs.length} invalid push tokens.`);
    }

    if (messages.length === 0) {
      console.log("No valid push tokens — no notifications sent.");
      return;
    }

    // 4. Send notifications in chunks (Expo recommends max ~100 per request)
    const chunks = expo.chunkPushNotifications(messages);
    let successCount = 0;
    let failCount = 0;

    for (const chunk of chunks) {
      try {
        const tickets = await expo.sendPushNotificationsAsync(chunk);

        // 5. Handle ticket-level errors (e.g., unregistered devices)
        const cleanupBatch = admin.firestore().batch();
        let needsCleanup = false;

        for (let i = 0; i < tickets.length; i++) {
          if (tickets[i].status === "ok") {
            successCount++;
          } else {
            failCount++;
            console.error(
              `Push failed for token ${chunk[i].to}:`,
              tickets[i].message,
            );

            // Remove tokens that are no longer valid
            if (
              tickets[i].details &&
              tickets[i].details.error === "DeviceNotRegistered"
            ) {
              const tokenToRemove = chunk[i].to;
              cleanupBatch.delete(
                admin.firestore().collection("pushTokens").doc(tokenToRemove),
              );
              needsCleanup = true;
              console.log(
                `Queued removal of unregistered token: ${tokenToRemove}`,
              );
            }
          }
        }

        if (needsCleanup) {
          await cleanupBatch.commit();
        }
      } catch (error) {
        console.error("Error sending push notification chunk:", error);
        failCount += chunk.length;
      }
    }

    console.log(
      `Push notifications sent: ${successCount} success, ${failCount} failed, ${messages.length} total.`,
    );
  },
);
