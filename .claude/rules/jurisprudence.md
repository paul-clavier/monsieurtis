# Jurisprudence

This file states all technical decisions that have been made inside the repo. They should be followed strictly (unless told) for future developments. Any conflict should lead to ask for user feedback for clarification. They are known as "jurisprudence", the french name for "case law".

# Infra

1. `kubernetes_manifest` v `kubectl_manifest`
   Uses kubectl_manifest (not kubernetes_manifest) so the provider tolerates the cluster being unknown at plan time on a fresh apply.
   Example: `infra/cloud/platform.tf`
