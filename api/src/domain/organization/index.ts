import { createOrganization } from './create-organization'
import { deleteOrg } from './delete-org'
import { getOrganizationById } from './get-organization-by-slug'
import { listOrganizations } from './list-organizations'
import { renameOrg } from './rename-org'
import { verifyUserBelongsToOrg } from './verify-user-belongs-to-org'

export const organizationService = {
  getOrganizationById,
  createOrganization,
  listOrganizations,
  verifyUserBelongsToOrg,
  renameOrg,
  deleteOrg,
}
