const db = require("../../db/db");

class OrganizationDao {
	async findById({ organization_id, tenant_id }) {
		const organization = await db("organizations")
			.where({ organization_id, tenant_id })
			.first();

		return organization || null;
	}
}

module.exports = new OrganizationDao();

