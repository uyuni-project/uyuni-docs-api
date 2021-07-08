# Makefile for SUSE Manager/Uyuni Documentation
# Author: Joseph Cayouette
# Inspired/modified from Owncloud's documentation Makefile written by Matthew Setter
SHELL = bash


# SUMA Productname and file replacement
PRODUCTNAME_SUMA ?= 'SUSE Manager'
FILENAME_SUMA ?= suse_manager
SUMA_CONTENT ?= true

# UYUNI Productname and file replacement
PRODUCTNAME_UYUNI ?= 'Uyuni'
FILENAME_UYUNI ?= uyuni
UYUNI_CONTENT ?= true

# PDF Resource Locations
PDF_FONTS_DIR ?= branding/pdf/fonts
PDF_THEME_DIR ?= branding/pdf/themes


# PDF Publishing Themes, draft uses a draft watermark.
# SUMA PDF Themes
# Available Choices set variable
# suse-draft
# suse

PDF_THEME_SUMA ?= suse-draft


# UYUNI PDF Themes
# Available Choices set variable
# uyuni-draft
# uyuni

PDF_THEME_UYUNI ?= uyuni


REVDATE ?= "$(shell date +'%B %d, %Y')"
CURDIR ?= .


# Build directories for TAR
HTML_BUILD_DIR ?= build
PDF_BUILD_DIR ?= build/pdf


# SUMA OBS Tarball Filenames
HTML_OUTPUT_SUMA ?= susemanager-docs_en
PDF_OUTPUT_SUMA ?= susemanager-docs_en-pdf


# UYUNI OBS Tarball Filenames
HTML_OUTPUT_UYUNI ?= uyuni-docs_en
PDF_OUTPUT_UYUNI ?= uyuni-docs_en-pdf

# Function definition
define validate-product
	NODE_PATH="$(npm -g root)" antora --generator @antora/xref-validator $(1)
endef


## Create tar of PDF files
define pdf-tar-product
	tar -czvf $(1).tar.gz $(PDF_BUILD_DIR)
	mv $(1).tar.gz build/
endef


## Generate OBS tar files
define obs-packages-product
	tar --exclude='$(PDF_BUILD_DIR)' -czvf $(1).tar.gz $(HTML_BUILD_DIR)
	tar -czvf $(2).tar.gz $(PDF_BUILD_DIR)
	mkdir build/packages
	mv $(1).tar.gz $(2).tar.gz build/packages
endef


define pdf-book-create
	asciidoctor-pdf \
		-r ./extensions/xref-converter.rb \
		-a pdf-stylesdir=$(PDF_THEME_DIR)/ \
		-a pdf-style=$(1) \
		-a pdf-fontsdir=$(PDF_FONTS_DIR) \
		-a productname=$(2) \
		-a suma-content=$(3) \
		-a examplesdir=modules/$(5)/examples \
		-a imagesdir=modules/$(5)/assets/images \
		-a revdate=$(REVDATE) \
		--base-dir . \
		--out-file $(PDF_BUILD_DIR)/$(4)_$(5)_guide.pdf \
		modules/$(5)/nav-$(5)-guide.pdf.adoc
endef


define pdf-book-create-index
	sed -E  -e 's/\*\*\*\*\*\ xref\:(.*)\.adoc\[(.*)\]/include\:\:modules\/$(1)\/pages\/\1\.adoc\[leveloffset\=\+4\]/' \
		-e 's/\*\*\*\*\ xref\:(.*)\.adoc\[(.*)\]/include\:\:modules\/$(1)\/pages\/\1\.adoc\[leveloffset\=\+3\]/' \
		-e 's/\*\*\*\ xref\:(.*)\.adoc\[(.*)\]/include\:\:modules\/$(1)\/pages\/\1\.adoc\[leveloffset\=\+2\]/' \
		-e 's/\*\*\ xref\:(.*)\.adoc\[(.*)\]/include\:\:modules\/$(1)\/pages\/\1\.adoc\[leveloffset\=\+1\]/' \
		-e 's/\*\ xref\:(.*)\.adoc\[(.*)\]/include\:\:modules\/$(1)\/pages\/\1\.adoc\[leveloffset\=\+0\]/' \
		-e 's/\*\*\*\*\ (.*)/==== \1/' \
		-e 's/\*\*\*\ (.*)/=== \1/' \
		-e 's/\*\*\ (.*)/== \1/' \
		-e 's/\*\ (.*)/= \1/' \
		modules/$(1)/nav-$(1)-guide.adoc > modules/$(1)/nav-$(1)-guide.pdf.adoc
endef


define pdf-api-product
	$(call pdf-book-create,$(1),$(2),$(3),$(4),api)
endef

# Help Menu
PHONY: help
help: ## Prints a basic help menu about available targets
	@IFS=$$'\n' ; \
	help_lines=(`fgrep -h "##" $(MAKEFILE_LIST) | fgrep -v fgrep | sed -e 's/\\$$//' | sed -e 's/##/:/'`); \
	printf "%-30s %s\n" "target" "help" ; \
	printf "%-30s %s\n" "------" "----" ; \
	for help_line in $${help_lines[@]}; do \
		IFS=$$':' ; \
		help_split=($$help_line) ; \
		help_command=`echo $${help_split[0]} | sed -e 's/^ *//' -e 's/ *$$//'` ; \
		help_info=`echo $${help_split[2]} | sed -e 's/^ *//' -e 's/ *$$//'` ; \
		printf '\033[36m'; \
		printf "%-30s %s" $$help_command ; \
		printf '\033[0m'; \
		printf "%s\n" $$help_info; \
	done



# Clean up build artifacts
.PHONY: clean
clean: ## Remove build artifacts from output directory (Antora and PDF)
	-rm -rf build/ \
		.cache/ \
		public/ \
		modules/api/nav-api-guide.pdf.adoc

# SUMA DOCUMENTATION BUILD COMMANDS

.PHONY: validate-suma
validate-suma: ## Validates page references and prints a report (Does not build the site)
	$(call validate-product,suma-api-site.yml)



.PHONY: pdf-tar-suma
pdf-tar-suma: ## Create tar of PDF files
	$(call pdf-tar-product,$(PDF_OUTPUT_SUMA))



# To build for suma-webui or uyuni you need to comment out the correct name/title in the antora.yml file. (TODO remove this manual method.)
.PHONY: antora-suma
antora-suma: clean pdf-all-suma ## Build the SUMA Antora static site (See README for more information)
		sed -i "s/^ # *\(name: *suse-manager\)/\1/;\
	s/^ # *\(title: *SUSE Manager\)/\1/;\
	s/^ *\(title: *Uyuni\)/#\1/;\
	s/^ *\(name: *uyuni\)/#\1/;" antora.yml
	DOCSEARCH_ENABLED=true DOCSEARCH_ENGINE=lunr antora suma-api-site.yml --generator antora-site-generator-lunr



# SUMA
.PHONY: obs-packages-suma
obs-packages-suma: clean antora-suma #pdf-all-suma ## Generate SUMA OBS tar files
	$(call obs-packages-product,$(HTML_OUTPUT_SUMA),$(PDF_OUTPUT_SUMA))


# Generate PDF versions of all SUMA books
#.PHONY: pdf-all-suma
#pdf-all-suma: pdf-api-suma

#.PHONY: modules/api/nav-api-guide.pdf.adoc
#modules/api/nav-api-guide.pdf.adoc:
#	$(call pdf-book-create-index,api)

#.PHONY: pdf-api-suma
## Generate PDF version of the SUMA Quickstart Guide for Public Cloud
#pdf-api-suma: modules/api/nav-api-guide.pdf.adoc
#	$(call pdf-api-product,$(PDF_THEME_SUMA),$(PRODUCTNAME_SUMA),$(SUMA_CONTENT),$(FILENAME_SUMA))


# UYUNI DOCUMENTATION BUILD COMMANDS

.PHONY: validate-uyuni
validate-uyuni: ## Validates page references and prints a report (Does not build the site)
	$(call validate,uyuni-api-site.yml)

.PHONY: pdf-tar-uyuni
pdf-tar-uyuni: ## Create tar of PDF files
	$(call pdf-tar-product,$(PDF_OUTPUT_UYUNI))

.PHONY: antora-uyuni
antora-uyuni: clean pdf-all-uyuni ##pdf-tar-uyuni ## Build the UYUNI Antora static site (See README for more information)
		sed -i "s/^ *\(name: *suse-manager\)/#\1/;\
	s/^ *\(title: *SUSE Manager\)/#\1/;\
	s/^ *# *\(title: *Uyuni\)/\1/;\
	s/^ *# *\(name: *uyuni\)/\1/;" antora.yml
		DOCSEARCH_ENABLED=true DOCSEARCH_ENGINE=lunr antora uyuni-api-site.yml --generator antora-site-generator-lunr



# UYUNI
.PHONY: obs-packages-uyuni
obs-packages-uyuni: clean pdf-all-uyuni antora-uyuni ## Generate UYUNI OBS tar files
	$(call obs-packages-product,$(HTML_OUTPUT_UYUNI),$(PDF_OUTPUT_UYUNI))


.PHONY: pdf-all-uyuni
pdf-all-uyuni: pdf-api-uyuni ## Generate PDF version of the UYUNI API Documentation

.PHONY: modules/api/nav-api-guide.pdf.adoc
modules/api/nav-api-guide.pdf.adoc:
	$(call pdf-book-create-index,api)

.PHONY: pdf-api-uyuni
## Generate PDF version of the UYUNI API
pdf-api-uyuni: modules/api/nav-api-guide.pdf.adoc
	$(call pdf-api-product,$(PDF_THEME_UYUNI),$(PRODUCTNAME_UYUNI),$(UYUNI_CONTENT),$(FILENAME_UYUNI))