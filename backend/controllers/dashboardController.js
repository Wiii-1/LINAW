const userDao = require('../dao/userDao')
const { knex } = require('../db/knex')
const AppError = require('../utils/AppError')

/**
 * Dashboard Controller
 * Provides aggregated metrics for dashboard visualization
 */
class DashboardController {
  /**
   * Get organization metrics for the current tenant
   */
  async getOrganizationMetrics(req, res, next) {
    try {
      const user = req.user
      if (!user || !user.tenantId) {
        return next(new AppError('Tenant ID required', 401, 'TENANT_REQUIRED'))
      }

      // Get total organization count and details
      const organizations = await knex('organizations')
        .where('tenant_id', user.tenantId)
        .select('id', 'organization_name as name', 'msp_id', 'created_at', 'updated_at')

      // Count users per organization
      const orgUserCounts = await knex('organization_users')
        .whereIn('organization_id', organizations.map(o => o.id))
        .groupBy('organization_id')
        .select('organization_id', knex.raw('count(*) as user_count'))

      // Enrich organizations with user counts
      const enrichedOrgs = organizations.map(org => {
        const userCount = orgUserCounts.find(u => u.organization_id === org.id)?.user_count || 0
        return { ...org, user_count: userCount }
      })

      // Calculate trend (organizations created over time - last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const trend = await knex('organizations')
        .where('tenant_id', user.tenantId)
        .where('created_at', '>=', thirtyDaysAgo)
        .groupBy(knex.raw('DATE(created_at)'))
        .select(
          knex.raw('DATE(created_at) as date'),
          knex.raw('count(*) as count')
        )
        .orderBy('date')

      return res.status(200).json({
        total: enrichedOrgs.length,
        organizations: enrichedOrgs,
        trend: trend.map(t => ({ date: t.date, count: t.count })),
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get blockchain network and channel metrics
   */
  async getBlockchainMetrics(req, res, next) {
    try {
      const user = req.user
      if (!user || !user.tenantId) {
        return next(new AppError('Tenant ID required', 401, 'TENANT_REQUIRED'))
      }

      // Get networks
      const networks = await knex('blockchain_network')
        .where('tenant_id', user.tenantId)
        .select('id', 'network_name as name', 'created_at')

      // Get channels per network
      const channels = await knex('channel')
        .whereIn('network_id', networks.map(n => n.id))
        .select('id', 'channel_name as name', 'network_id', 'created_at')

      // Count contracts per channel
      const contractCounts = await knex('smart_contract')
        .whereIn('channel_id', channels.map(c => c.id))
        .groupBy('channel_id')
        .select('channel_id', knex.raw('count(*) as contract_count'))

      // Enrich channels with contract counts
      const enrichedChannels = channels.map(ch => {
        const contractCount = contractCounts.find(c => c.channel_id === ch.id)?.contract_count || 0
        return { ...ch, contract_count: contractCount }
      })

      // Enrich networks with channel counts
      const enrichedNetworks = networks.map(net => {
        const netChannels = enrichedChannels.filter(ch => ch.network_id === net.id)
        const totalContracts = netChannels.reduce((sum, ch) => sum + ch.contract_count, 0)
        return {
          ...net,
          channel_count: netChannels.length,
          contract_count: totalContracts,
        }
      })

      // Calculate trend
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const trend = await knex('blockchain_network')
        .where('tenant_id', user.tenantId)
        .where('created_at', '>=', thirtyDaysAgo)
        .groupBy(knex.raw('DATE(created_at)'))
        .select(
          knex.raw('DATE(created_at) as date'),
          knex.raw('count(*) as networks'),
          knex.raw('(SELECT count(*) FROM channel WHERE network_id IN (SELECT id FROM blockchain_network WHERE DATE(created_at) = DATE(blockchain_network.created_at))) as channels')
        )
        .orderBy('date')

      const totalContracts = enrichedChannels.reduce((sum, ch) => sum + ch.contract_count, 0)

      return res.status(200).json({
        total_networks: enrichedNetworks.length,
        total_channels: enrichedChannels.length,
        total_contracts: totalContracts,
        networks: enrichedNetworks,
        channels: enrichedChannels,
        trend: trend.map(t => ({ 
          date: t.date, 
          networks: t.networks, 
          channels: t.channels || 0 
        })),
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get asset registry metrics
   */
  async getAssetMetrics(req, res, next) {
    try {
      const user = req.user
      if (!user || !user.tenantId) {
        return next(new AppError('Tenant ID required', 401, 'TENANT_REQUIRED'))
      }

      // Get all assets
      const assets = await knex('asset_registry')
        .where('tenant_id', user.tenantId)
        .select('id', 'color', 'size', 'owner', 'appraised_value', 'created_at', 'created_by')

      // Calculate metrics
      const totalAssets = assets.length
      const totalValuation = assets.reduce((sum, a) => sum + (a.appraised_value || 0), 0)
      const averageValuation = totalAssets > 0 ? totalValuation / totalAssets : 0

      // Group by owner
      const byOwner = Object.entries(
        assets.reduce((acc, asset) => {
          if (!acc[asset.owner]) {
            acc[asset.owner] = { count: 0, total_value: 0 }
          }
          acc[asset.owner].count += 1
          acc[asset.owner].total_value += asset.appraised_value || 0
          return acc
        }, {})
      ).map(([owner, data]) => ({
        owner,
        count: data.count,
        total_value: data.total_value,
      }))

      // Calculate trend
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const trend = await knex('asset_registry')
        .where('tenant_id', user.tenantId)
        .where('created_at', '>=', thirtyDaysAgo)
        .groupBy(knex.raw('DATE(created_at)'))
        .select(
          knex.raw('DATE(created_at) as date'),
          knex.raw('count(*) as count'),
          knex.raw('SUM(appraised_value) as total_value')
        )
        .orderBy('date')

      return res.status(200).json({
        total_assets: totalAssets,
        total_valuation: totalValuation,
        average_valuation: averageValuation,
        assets: assets.slice(0, 10), // Return first 10 for dashboard
        by_owner: byOwner,
        trend: trend.map(t => ({
          date: t.date,
          count: t.count,
          total_value: t.total_value || 0,
        })),
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get submission and approval workflow metrics
   */
  async getSubmissionMetrics(req, res, next) {
    try {
      const user = req.user
      if (!user || !user.tenantId) {
        return next(new AppError('Tenant ID required', 401, 'TENANT_REQUIRED'))
      }

      // Get all submissions for this tenant
      const submissions = await knex('submissions')
        .where('tenant_id', user.tenantId)
        .select('id', 'owner', 'original_file_name as file_name', 'status', 'mime_type', 'size', 'created_at', 'updated_at')

      const totalSubmissions = submissions.length

      // Group by status
      const submissionsByStatus = {
        DRAFT: 0,
        SUBMITTED: 0,
        APPROVED: 0,
        REJECTED: 0,
        CHANGES_REQUESTED: 0,
      }

      submissions.forEach(sub => {
        const status = (sub.status || 'DRAFT').toUpperCase()
        if (status in submissionsByStatus) {
          submissionsByStatus[status] += 1
        }
      })

      // Calculate approval rate
      const approvedCount = submissionsByStatus.APPROVED || 0
      const approvalRate = totalSubmissions > 0 ? (approvedCount / totalSubmissions) * 100 : 0

      // Get pending approvals
      const pendingApprovals = submissionsByStatus.SUBMITTED || 0

      // Calculate trend
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const trend = await knex('submissions')
        .where('tenant_id', user.tenantId)
        .where('created_at', '>=', thirtyDaysAgo)
        .groupBy(knex.raw('DATE(created_at)'))
        .select(
          knex.raw('DATE(created_at) as date'),
          knex.raw('count(*) as total'),
          knex.raw("count(CASE WHEN status = 'APPROVED' THEN 1 END) as approved"),
          knex.raw("count(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected")
        )
        .orderBy('date')

      // Get recent submissions
      const recentSubmissions = submissions
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10)

      return res.status(200).json({
        total_submissions: totalSubmissions,
        pending_approvals: pendingApprovals,
        approval_rate: Math.round(approvalRate),
        submissions_by_status: submissionsByStatus,
        recent_submissions: recentSubmissions,
        trend: trend.map(t => ({
          date: t.date,
          total: t.total,
          approved: t.approved || 0,
          rejected: t.rejected || 0,
        })),
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get organization invitation metrics
   */
  async getInvitationMetrics(req, res, next) {
    try {
      const user = req.user
      if (!user || !user.tenantId) {
        return next(new AppError('Tenant ID required', 401, 'TENANT_REQUIRED'))
      }

      // Get all invitations for organizations in this tenant
      const invitations = await knex('organization_invites')
        .join('organizations', 'organization_invites.organization_id', 'organizations.id')
        .where('organizations.tenant_id', user.tenantId)
        .select(
          'organization_invites.id',
          'organization_invites.organization_id',
          'organization_invites.invited_email',
          'organization_invites.role',
          'organization_invites.status',
          'organization_invites.expires_at',
          'organization_invites.accepted_at',
          'organization_invites.created_at'
        )

      const totalInvitations = invitations.length
      const pendingCount = invitations.filter(i => i.status === 'PENDING').length
      const acceptedCount = invitations.filter(i => i.status === 'ACCEPTED').length
      const expiredCount = invitations.filter(i => i.status === 'EXPIRED').length

      // Calculate acceptance rate
      const acceptanceRate = totalInvitations > 0 ? (acceptedCount / totalInvitations) * 100 : 0

      // Find expiring soon (within 7 days)
      const sevenDaysFromNow = new Date()
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
      const expiringSoon = invitations.filter(
        i => i.status === 'PENDING' && new Date(i.expires_at) <= sevenDaysFromNow
      )

      // Get recent invitations
      const recentInvitations = invitations
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10)

      // Calculate trend
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const trend = await knex('organization_invites')
        .join('organizations', 'organization_invites.organization_id', 'organizations.id')
        .where('organizations.tenant_id', user.tenantId)
        .where('organization_invites.created_at', '>=', thirtyDaysAgo)
        .groupBy(knex.raw('DATE(organization_invites.created_at)'))
        .select(
          knex.raw('DATE(organization_invites.created_at) as date'),
          knex.raw('count(*) as sent'),
          knex.raw("count(CASE WHEN organization_invites.status = 'ACCEPTED' THEN 1 END) as accepted"),
          knex.raw("count(CASE WHEN organization_invites.status = 'EXPIRED' THEN 1 END) as expired")
        )
        .orderBy('date')

      return res.status(200).json({
        total_invitations: totalInvitations,
        pending_count: pendingCount,
        accepted_count: acceptedCount,
        expired_count: expiredCount,
        acceptance_rate: Math.round(acceptanceRate),
        recent_invitations: recentInvitations,
        expiring_soon: expiringSoon,
        trend: trend.map(t => ({
          date: t.date,
          sent: t.sent,
          accepted: t.accepted || 0,
          expired: t.expired || 0,
        })),
      })
    } catch (error) {
      next(error)
    }
  }
}

module.exports = new DashboardController()
