export type AuthContext = {
  actorId: string
  actorType: 'human' | 'machine'
  roles: string[]
  scopes: string[]
}
