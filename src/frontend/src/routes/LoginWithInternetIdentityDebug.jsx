// eslint-disable-next-line no-use-before-define
import { DelegationIdentity } from '@dfinity/identity'

export function writeAuthClientDetailsToConsole(authClient) {
  // Write debug logs to console
  const identity = authClient.getIdentity()
  const principal = identity.getPrincipal()

  let delegation = 'Current identity is not a DelegationIdentity'
  let expiration = 'N/A'
  if (identity instanceof DelegationIdentity) {
    delegation = JSON.stringify(identity.getDelegation().toJSON(), undefined, 2)

    // cannot use Math.min, as we deal with bigint here
    const nextExpiration = identity
      .getDelegation()
      .delegations.map((d) => d.delegation.expiration)
      .reduce((current, next) => (next < current ? next : current))
    expiration = nextExpiration - BigInt(Date.now()) * BigInt(1000_000)
  }
  console.log('authClient : ' + authClient)
  console.log('principal  : ' + principal)
  console.log('delegation : ' + delegation)
  console.log('expiration : ' + expiration)
}
