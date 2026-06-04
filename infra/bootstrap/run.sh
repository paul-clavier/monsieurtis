export CIVO_TOKEN=$(op read "op://MonsieurTis/civo.CIVO_TOKEN/password")
export TAILSCALE_OAUTH_CLIENT_ID=$(op read "op://MonsieurTis/tailscale.TAILSCALE_OAUTH_CLIENT_ID/password")
export TAILSCALE_OAUTH_CLIENT_SECRET=$(op read "op://MonsieurTis/tailscale.TAILSCALE_OAUTH_CLIENT_SECRET/password")
export TAILSCALE_TAILNET=plclavier@gmail.com
export AWS_ACCESS_KEY_ID=$(op read "op://MonsieurTis/civo.object-store.tofu.AWS_ACCESS_KEY_ID/password")
export AWS_SECRET_ACCESS_KEY=$(op read "op://MonsieurTis/civo.object-store.tofu.AWS_SECRET_ACCESS_KEY/password")

tofu init
tofu apply