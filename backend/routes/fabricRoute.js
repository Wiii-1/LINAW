const express = require("express");
const router = express.Router();
const fabricController = require("../controllers/blockchainController.js");
const assetRegistryController = require("../controllers/assetRegistryController.js");
const approvalWorkflowController = require("../controllers/approvalWorkflowController.js");
const organizationInviteController = require("../controllers/organizationInviteController")
const dashboardController = require("../controllers/dashboardController.js");
const authenticate = require("../middleware/authenticate");
const { apiLimiter } = require("../middleware/rateLimiter");
const uploadSubmissionFile = require("../middleware/uploadSubmissionFile.js");

router.use(apiLimiter, authenticate.decodeToken);

// blockchain related routes


router.post("/networks", fabricController.networkCreate);
router.get("/networks/:network_id", fabricController.networkRead);

router.post("/networks/:id/channels", fabricController.channelCreate);

router.post("/channel/:channel_id/contracts", fabricController.smartContract);
router.get("/channel/:channel_id/contracts", fabricController.contractReadAll);

// member addition

router.post("/organizations/:organization_id/invitations", organizationInviteController.createInvite)
router.get("/organizations-invitations/:token",organizationInviteController.getInviteByToken)
router.post("/organizations-invitations/:token/accept", organizationInviteController.acceptInvite)

// asset registry
router.post("/assets", assetRegistryController.createAsset);
router.post("/assets/:id/transfer", assetRegistryController.assetTransfer);
router.put("/assets/:id", assetRegistryController.assetUpdate);
router.delete("/assets/:id", assetRegistryController.assetDelete);
router.get("/assets/:id", assetRegistryController.assetRead);
router.get("/assets", assetRegistryController.assetReadAll);

// approval workflow

router.post(
  "/submissions",
  uploadSubmissionFile.single("file"),
  approvalWorkflowController.createSubmission,
);
router.post(
  "/submissions/:submissionId/submit",
  approvalWorkflowController.submitForApproval,
);
router.patch(
  "/submissions/:submissionId/approve",
  approvalWorkflowController.approveSubmission,
);
router.patch(
  "/submissions/:submissionId/reject",
  approvalWorkflowController.rejectSubmission,
);
router.patch(
  "/submissions/:submissionId/request-changes",
  approvalWorkflowController.requestChanges,
);
router.patch(
  "/submissions/:submissionId/resubmit",
  uploadSubmissionFile.single("file"),
  approvalWorkflowController.resubmitSubmission,
);
router.get("/submissions/:submissionId", approvalWorkflowController.getSubmissionById);
router.get(
  "/submissions/:submissionId/history",
  approvalWorkflowController.getSubmissionHistory,
);
router.delete("/submissions/:submissionId", approvalWorkflowController.deleteSubmission);

// accounting contract

// dashboard metrics routes
router.get("/organizations/metrics", dashboardController.getOrganizationMetrics);
router.get("/networks/metrics", dashboardController.getBlockchainMetrics);
router.get("/assets/metrics", dashboardController.getAssetMetrics);
router.get("/submissions/metrics", dashboardController.getSubmissionMetrics);
router.get("/organization-invites/metrics", dashboardController.getInvitationMetrics);

module.exports = { router };
