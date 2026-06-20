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
 * FIX: Tokens are now grouped by `experienceId` (Expo project slug)
 * before sending. Expo's API requires all tokens in a single request
 * to belong to the same Expo project — mixing them causes PUSH_TOO_MANY_EXPERIENCE_IDS.
 *
 * This delivers notifications when the app is:
 * - In the background
 * - Killed / force-closed
 * - Device is locked (lock screen notification)
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
    const candidateEnrollmentType =
      attendanceData.candidateEnrollmentType || "event";
    const eventDisplayName =
      candidateEnrollmentType === "masterclass"
        ? "Masterclass 3.0"
        : "Synergy Sphere 2.0";

    // 1. Fetch total check-in count for milestone detection
    let isMilestone = false;
    let totalCount = 0;
    try {
      const countSnapshot = await admin
        .firestore()
        .collection("attendance")
        .where("candidateEnrollmentType", "==", candidateEnrollmentType)
        .get();
      totalCount = countSnapshot.size;
      isMilestone = totalCount > 0 && totalCount % 10 === 0;
    } catch (countError) {
      console.error("Error querying attendance count:", countError);
    }

    // 2. Read all registered push tokens from Firestore
    const tokensSnapshot = await admin
      .firestore()
      .collection("pushTokens")
      .get();

    if (tokensSnapshot.empty) {
      console.log("No push tokens registered — no notifications to send.");
      return;
    }

    // 3. Group valid tokens by experienceId
    // Expo requires all tokens in one sendPushNotificationsAsync() call
    // to belong to the same Expo project (experience). Mixing them causes
    // the PUSH_TOO_MANY_EXPERIENCE_IDS error.
    //
    // Key: experienceId (e.g. "@connecthq/connect-hq")
    // Value: array of message objects for that experience
    const messagesByExperience = {}; // { [experienceId]: Message[] }
    const invalidTokenDocs = [];

    for (const doc of tokensSnapshot.docs) {
      const tokenData = doc.data();
      const token = tokenData.token;
      const tokenEnrollmentType = tokenData.enrollmentType || "event";

      // Skip tokens with invalid format
      if (!Expo.isExpoPushToken(token)) {
        console.warn(`Invalid Expo push token, will remove: ${token}`);
        invalidTokenDocs.push(doc.id);
        continue;
      }

      // Tenant separation: Only send push to devices for this event type
      if (tokenEnrollmentType !== candidateEnrollmentType) {
        continue;
      }

      // Determine experienceId — default to the current production project
      // if not stored on the token document (backwards compatibility)
      const experienceId =
        tokenData.experienceId || "@connecthq/connect-hq";

      if (!messagesByExperience[experienceId]) {
        messagesByExperience[experienceId] = [];
      }

      // Guest arrival notification
      messagesByExperience[experienceId].push({
        to: token,
        sound: "default",
        title: "Guest Checked In",
        body: `${candidateName} has arrived at ${eventDisplayName}`,
        priority: "high",
        channelId: "checkins",
      });

      // Milestone notification (every 10 check-ins)
      if (isMilestone) {
        messagesByExperience[experienceId].push({
          to: token,
          sound: "default",
          title: `${totalCount} guests have checked in for ${eventDisplayName}!`,
          priority: "high",
          channelId: "checkins",
        });
      }
    }

    // 4. Clean up invalid tokens
    const batch = admin.firestore().batch();
    for (const docId of invalidTokenDocs) {
      batch.delete(admin.firestore().collection("pushTokens").doc(docId));
    }
    if (invalidTokenDocs.length > 0) {
      await batch.commit();
      console.log(`Removed ${invalidTokenDocs.length} invalid push tokens.`);
    }

    const experienceIds = Object.keys(messagesByExperience);
    if (experienceIds.length === 0) {
      console.log(
        "No valid push tokens matching this event — no notifications sent."
      );
      return;
    }

    // 5. Send notifications PER EXPERIENCE (separate requests per Expo project)
    let totalSuccess = 0;
    let totalFail = 0;

    for (const experienceId of experienceIds) {
      const messages = messagesByExperience[experienceId];
      console.log(
        `Sending ${messages.length} notifications for experience: ${experienceId}`
      );

      const chunks = expo.chunkPushNotifications(messages);

      for (const chunk of chunks) {
        try {
          const tickets = await expo.sendPushNotificationsAsync(chunk);

          const cleanupBatch = admin.firestore().batch();
          let needsCleanup = false;

          for (let i = 0; i < tickets.length; i++) {
            if (tickets[i].status === "ok") {
              totalSuccess++;
            } else {
              totalFail++;
              console.error(
                `Push failed for token ${chunk[i].to}:`,
                tickets[i].message
              );

              // Remove tokens that are no longer valid (unregistered devices)
              if (
                tickets[i].details &&
                tickets[i].details.error === "DeviceNotRegistered"
              ) {
                const tokenToRemove = chunk[i].to;
                cleanupBatch.delete(
                  admin
                    .firestore()
                    .collection("pushTokens")
                    .doc(tokenToRemove)
                );
                needsCleanup = true;
                console.log(
                  `Queued removal of unregistered token: ${tokenToRemove}`
                );
              }
            }
          }

          if (needsCleanup) {
            await cleanupBatch.commit();
          }
        } catch (error) {
          // Log error but DO NOT re-throw to avoid infinite Cloud Function retry loops
          console.error(
            `Error sending push notification chunk for experience ${experienceId}:`,
            error
          );
          totalFail += chunk.length;
        }
      }
    }

    console.log(
      `Push notifications sent across ${experienceIds.length} experience(s): ${totalSuccess} success, ${totalFail} failed.`
    );
  }
);
