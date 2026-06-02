// Maps Google ID token claims → MonsieurTis identity traits.
// Used by Kratos when a user signs in via the `google` OIDC provider.
local claims = std.extVar('claims');
{
  identity: {
    traits: {
      email: claims.email,
      name: {
        first: if 'given_name' in claims then claims.given_name else '',
        last:  if 'family_name' in claims then claims.family_name else '',
      },
    },
  },
}
