import type { AuthContext } from './auth'

export function assertRole(currentRoles: string[], allowedRoles: string[]) {
  const allowed = currentRoles.some((role) => allowedRoles.includes(role))

  if (!allowed) {
    throw new Error('Forbidden')
  }
}

export function assertMachineScope(context: AuthContext, scope: string) {
  if (context.actorType !== 'machine' || !context.scopes.includes(scope)) {
    throw new Error('Forbidden')
  }
}
