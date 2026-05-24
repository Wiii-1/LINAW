const tenantCaService = require('../service/tenantCa/tenantCaService');
const AppError = require('../utils/AppError');

class TenantController {
  async listMyTenantCa(req, res, next) {
    try {
      const result = await tenantCaService.listMyTenantCa(req.user);
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }

  async createTenantCa(req, res, next) {
    try {
      const result = await tenantCaService.createTenantCa(req.user, req.body);
      return res.status(202).json(result);
    } catch (error) {
      if (error instanceof AppError) return next(error);
      return next(new AppError(error.message || 'Invalid request', 400, 'VALIDATION_ERROR'));
    }
  }

  async getTenantCa(req, res, next) {
    try {
      const result = await tenantCaService.getTenantCa(req.params.tenantId);
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }

  async getTlsCert(req, res, next) {
    try {
      const pem = await tenantCaService.getTlsCert(req.params.tenantId);
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="tls-ca-${req.params.tenantId}.pem"`,
      );
      return res.send(pem);
    } catch (error) {
      return next(error);
    }
  }

  async deleteTenantCa(req, res, next) {
    try {
      const result = await tenantCaService.deleteTenantCa(req.params.tenantId);
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new TenantController();
