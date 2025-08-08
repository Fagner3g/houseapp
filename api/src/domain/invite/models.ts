export interface CreateInviteRequest {
  email: string
  orgId: string
  userId: string
}

export interface GetInviteRequest {
  email: string
}
