.DEFAULT_GOAL := help
.PHONY: help sync-secrets

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
	@printf "    $(CYAN)%-20s$(RESET) %s\n" "sync-secrets" "Sync 1Password secrets with git"
	@printf "\n$(BOLD)$(YELLOW)app$(RESET)\n"
	@printf "  $(DIM)(no targets yet)$(RESET)\n"
	@printf "\n$(BOLD)$(YELLOW)infra$(RESET)\n"
	@printf "  $(DIM)(no targets yet)$(RESET)\n"
	@printf "\n"

# ─── scripts ──────────────────────────────────────────────────────────────────
# secrets
sync-secrets: ## Sync 1Password secrets with git
	@./scripts/sync-1password-with-git.sh

# ─── app ──────────────────────────────────────────────────────────────────────
# (add app targets here)

# ─── infra ────────────────────────────────────────────────────────────────────
# (add infra targets here)
