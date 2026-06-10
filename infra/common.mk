# Shared Makefile fragment for infra/<project> Makefiles.
# Each project's Makefile only needs `include ../common.mk`; project-specific
# targets can be appended below the include. Targets documented with `## ...`
# (and sections with `##@ ...`) are picked up automatically by `make help`.

.DEFAULT_GOAL := help

# Colors
CYAN   := \033[36m
YELLOW := \033[33m
GREEN  := \033[32m
DIM    := \033[2m
BOLD   := \033[1m
RESET  := \033[0m

.PHONY: help tofu-init tofu-lock

help: ## Show this help
	@printf "\n$(BOLD)Usage:$(RESET) make $(CYAN)<target>$(RESET)\n"
	@awk 'BEGIN {FS = ":.*?## "} \
		/^##@/ { printf "\n$(BOLD)$(YELLOW)%s$(RESET)\n", substr($$0, 5); next } \
		/^[a-zA-Z][a-zA-Z0-9_-]*:.*?## / { printf "    $(CYAN)%-20s$(RESET) %s\n", $$1, $$2 }' $(MAKEFILE_LIST)
	@printf "\n"

##@ tofu
tofu-init: ## Get S3 credentials and run tofu init
	@export AWS_ACCESS_KEY_ID=$$(op read "op://MonsieurTis/civo.object-store.tofu.AWS_ACCESS_KEY_ID/password") && \
		export AWS_SECRET_ACCESS_KEY=$$(op read "op://MonsieurTis/civo.object-store.tofu.AWS_SECRET_ACCESS_KEY/password") && \
		tofu init

tofu-lock: ## Lock providers for correct platform targets
	@tofu providers lock -platform=linux_amd64 -platform=darwin_arm64 -platform=darwin_amd64
