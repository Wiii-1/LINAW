const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authenticate");
const { apiLimiter } = require("../middleware/rateLimiter");
const peerController = require("../controllers/peerController");
const authorization = require("../middleware/authorize");
const permission = require("../config/authorization/permission");

router.post(
  "/peer/start",
  authenticate.decodeToken,
  authorization.can(permission.MANAGE_NODE),
  apiLimiter,
  peerController.startPeer,
);

router.post(
  "/org/provision",
  authenticate.decodeToken,
  authorization.can(permission.CREATE_ORGANIZATION),
  apiLimiter,
  peerController.provisionOrg,
);

router.post(
  "/container/exec",
  authenticate.decodeToken,
  authorization.can(permission.MANAGE_NODE),
  apiLimiter,
  peerController.execContainer,
);

module.exports = { router };