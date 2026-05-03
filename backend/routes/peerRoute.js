const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authenticate");
const { apiLimiter } = require("../middleware/rateLimiter");
const peerController = require("../controllers/peerController");

router.post(
  "/peer/start",
  authenticate.decodeToken,
  apiLimiter,
  peerController.startPeer,
);

router.post(
  "/org/provision",
  authenticate.decodeToken,
  apiLimiter,
  peerController.provisionOrg,
);

router.post(
  "/container/exec",
  authenticate.decodeToken,
  apiLimiter,
  peerController.execContainer,
);

module.exports = { router };