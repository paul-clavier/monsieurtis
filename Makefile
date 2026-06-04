.DEFAULT_GOAL := help
.PHONY: help list-secrets sync-secrets

# Colors
CYAN   := \033[36m
YELLOW := \033[33m
GREEN  := \033[32m
DIM    := \033[2m
BOLD   := \033[1m
RESET  := \033[0m

help: ## Show this help
	@printf "\n$(BOLD)Usage:$(RESET) make $(CYAN)<target>$(RESET)\n"
	@printf "\n$(BOLD)$(YELLOW)scripts$(RESET)\n"
	@printf "  $(DIM)secrets$(RESET)\n"
	@printf "    $(CYAN)%-20s$(RESET) %s\n" "list-secrets" "List 1Password secrets in the MonsieurTis vault"
	@printf "    $(CYAN)%-20s$(RESET) %s\n" "sync-secrets" "Sync 1Password secrets with git"
	@printf "\n$(BOLD)$(YELLOW)app$(RESET)\n"
	@printf "  $(DIM)(no targets yet)$(RESET)\n"
	@printf "\n$(BOLD)$(YELLOW)infra$(RESET)\n"
	@printf "  $(DIM)cloud$(RESET)\n"
	@printf "    $(CYAN)%-20s$(RESET) %s\n" "tofu-init-cloud" "Run tofu-init in infra/cloud"
	@printf "    $(CYAN)%-20s$(RESET) %s\n" "tofu-lock-cloud" "Run tofu-lock in infra/cloud"
	@printf "\n"

# ─── scripts ──────────────────────────────────────────────────────────────────
# secrets
op-login:
	@eval $(op signin)

list-secrets: ## List 1Password secrets in the MonsieurTis vault
	@op item list --vault "MonsieurTis"

sync-secrets: ## Sync 1Password secrets with git
	@./scripts/sync-1password-with-git.sh

# network
tail-up:
	@tailscale up

# ─── app ──────────────────────────────────────────────────────────────────────
# (add app targets here)

# ─── infra ────────────────────────────────────────────────────────────────────
# cloud: delegate any `tofu-<action>-cloud` target to `infra/cloud`'s Makefile.
# Adding a new `tofu-<action>` target in infra/cloud/Makefile makes it
# automatically reachable as `make tofu-<action>-cloud` from the root.
tofu-%-cloud:
	@$(MAKE) -C infra/cloud tofu-$*

bootstrap-tofu-apply:
	@cd infra/bootstrap && ./run.sh
