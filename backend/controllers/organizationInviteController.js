const organizationInviteService = require('../service/application/organizationInviteService')

class organizationInviteController {

    async createInvite(req, res, next) {
        try {
            const organization_id = req.params?.organization_id ?? req.body?.organization_id
            const invitedEmail = req.body?.invitedEmail ?? req.body?.invited_email
            const role = req.body?.role
            const invitedByUserId = req.user?.uid
            const tenant_id = req.user?.tenantId

            const invite = await organizationInviteService.createInvite({
                organization_id,
                invitedEmail,
                role,
                invitedByUserId,
                tenant_id,
            })

            return res.status(201).json(invite)
        } catch (error) {
            next(error)
        }
    }

    async getInviteByToken(req, res, next) {
        try {
            const token = req.params?.token ?? req.body?.token

            const invite = await organizationInviteService.getInviteByToken(token)

            return res.status(200).json(invite)
        } catch (error) {
            next(error)
        }
    }

    async acceptInvite(req, res, next) {
        try {
            const token = req.params?.token ?? req.body?.token
            const user_id = req.user?.uid
            const tenant_id = req.user?.tenantId

            const accepted = await organizationInviteService.acceptInvite({
                token,
                user_id,
                tenant_id,
            })

            return res.status(200).json(accepted)
        } catch (error) {
            next(error)
        }
    }
}

module.exports = new organizationInviteController()
