const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const authenticate = require('../middleware/authenticate');
const { apiLimiter } = require('../middleware/rateLimiter');
const {
  requireDbUser,
  requireTenantId,
  assertTenantParam,
} = require('../middleware/requireTenant');

router.use(apiLimiter, authenticate.decodeToken, requireDbUser);

router.get('/onboarding', (req, res, next) => tenantController.getOnboarding(req, res, next));
router.get('/', (req, res, next) => tenantController.listMyTenantCa(req, res, next));
router.post('/', requireTenantId, (req, res, next) =>
  tenantController.createTenantCa(req, res, next),
);
router.post('/fabric-orgs/peer', requireTenantId, (req, res, next) =>
  tenantController.provisionPeerOrg(req, res, next),
);
router.post('/fabric-orgs/orderer', requireTenantId, (req, res, next) =>
  tenantController.provisionOrdererOrg(req, res, next),
);
router.delete('/fabric-orgs/:orgType', requireTenantId, (req, res, next) =>
  tenantController.deleteFabricOrg(req, res, next),
);
router.get('/:tenantId/tls-cert', assertTenantParam, (req, res, next) =>
  tenantController.getTlsCert(req, res, next),
);
router.get('/:tenantId', assertTenantParam, (req, res, next) =>
  tenantController.getTenantCa(req, res, next),
);
router.delete('/:tenantId', assertTenantParam, (req, res, next) =>
  tenantController.deleteTenantCa(req, res, next),
);

module.exports = { router };
