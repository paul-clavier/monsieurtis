.DEFAULT_GOAL := help
.PHONY: help tofu-init

# Colors
CYAN   := \033[36m
YELLOW := \033[33m
GREEN  := \033[32m
DIM    := \033[2m
BOLD   := \033[1m
RESET  := \033[0m

help: ## Show this help
	@printf "\n$(BOLD)Usage:$(RESET) make $(CYAN)<target>$(RESET)\n"
	@printf "\n$(BOLD)$(YELLOW)tofu$(RESET)\n"
	@printf "    $(CYAN)%-20s$(RESET) %s\n" "tofu-init" "Get S3 credentials and run tofu init"
	@printf "\n"

# ─── tofu ─────────────────────────────────────────────────────────────────────
tofu-init: ## Get S3 credentials to fetch the tofu state
	@export AWS_ACCESS_KEY_ID=$$(op read "op://MonsieurTis/civo.object-store.tofu.AWS_ACCESS_KEY_ID/password") && \
		export AWS_SECRET_ACCESS_KEY=$$(op read "op://MonsieurTis/civo.object-store.tofu.AWS_SECRET_ACCESS_KEY/password") && \
		tofu init

tofu-lock: ## Lock providers for correct platform targets
	@tofu providers lock -platform=linux_amd64 -platform=darwin_arm64 -platform=darwin_amd64