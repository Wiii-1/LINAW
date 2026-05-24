const fs = require("fs");
const path = require("path");
// In test environment, avoid initializing firebase-admin or parsing service account
if (process.env.NODE_ENV === 'test') {
  const authStub = {
    verifyIdToken: async (token) => ({})
  };
  module.exports = { app: {}, auth: authStub };
} else {
  const { initializeApp, cert } = require("firebase-admin/app");
  const { getAuth } = require("firebase-admin/auth");

  function loadServiceAccount() {
  const jsonFromEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (jsonFromEnv) {
    return JSON.parse(jsonFromEnv);
  }

  const app = initializeApp({
    credential: cert(loadServiceAccount()),
  });

  const auth = getAuth(app);

  return JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
}

  const app = initializeApp({
    credential: cert(loadServiceAccount()),
  });

  const auth = getAuth(app);

  module.exports = { app, auth };
}
