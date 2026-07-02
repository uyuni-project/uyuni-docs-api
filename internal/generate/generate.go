// Package generate produces the config files that Antora and Asciidoctor-PDF require.
package generate

import (
	"bytes"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"text/template"

	"github.com/uyuni-project/uyuni-docs-api/docbuild/internal/config"
)

// templateData is the data passed to all templates.
type templateData struct {
	Product    string
	Output     string
	Lang       config.Language
	P          config.Product
	Out        config.Output
	Cfg        *config.Config
	ContentDir string // e.g. modules (for antora.yml nav paths)
}

// SiteYML generates translations/{lang}/{output}.site.yml.
func SiteYML(cfg *config.Config, productName, outputName, langCode, repoRoot string) error {
	lang, err := cfg.LanguageByCode(langCode)
	if err != nil {
		return err
	}
	product, ok := cfg.Products[productName]
	if !ok {
		return fmt.Errorf("product %q not found", productName)
	}
	out, ok := product.Outputs[outputName]
	if !ok {
		return fmt.Errorf("output %q not found in product %q", outputName, productName)
	}

	// Canonical URL: append /{lang}/ unless URL is bare "/"
	siteURL := out.Site.URL
	if siteURL != "/" && !strings.HasSuffix(siteURL, "/") {
		siteURL += "/"
	}
	if siteURL != "/" {
		siteURL += langCode + "/"
	}

	// Absolute bundle URL
	bundleURL := product.UI.Bundle
	if strings.HasPrefix(bundleURL, "./") {
		bundleURL = filepath.Join(repoRoot, bundleURL[2:])
	}

	// Supplemental files: prefer Output.Site.SupplementalFiles, fallback to Output.SupplementalFiles
	suppRaw := out.Site.SupplementalFiles
	if suppRaw == "" {
		suppRaw = out.SupplementalFiles
	}
	supp := strings.ReplaceAll(suppRaw, "{lang}", langCode)
	if strings.HasPrefix(supp, "./") {
		supp = filepath.Join(repoRoot, supp[2:])
	} else if !filepath.IsAbs(supp) && supp != "" {
		supp = filepath.Join(repoRoot, supp)
	}

	data := struct {
		templateData
		SiteURL           string
		OutputDir         string
		StartPath         string
		BundleURL         string
		SupplementalFiles string
		RepoRoot          string
	}{
		templateData: templateData{
			Product: productName,
			Output:  outputName,
			Lang:    lang,
			P:       product,
			Out:     out,
			Cfg:     cfg,
		},
		SiteURL:           siteURL,
		OutputDir:         filepath.Join(repoRoot, "build", langCode),
		StartPath:         filepath.Join("translations", langCode),
		BundleURL:         bundleURL,
		SupplementalFiles: supp,
		RepoRoot:          repoRoot,
	}

	outPath := filepath.Join(repoRoot, "translations", langCode, outputName+".site.yml")
	return renderTemplate("site.yml.tmpl", siteYMLTemplate, data, outPath)
}

// AntoraYML generates translations/{lang}/antora.yml.
func AntoraYML(cfg *config.Config, productName, langCode, repoRoot, contentDir string) error {
	lang, err := cfg.LanguageByCode(langCode)
	if err != nil {
		return err
	}
	product, ok := cfg.Products[productName]
	if !ok {
		return fmt.Errorf("product %q not found", productName)
	}

	data := templateData{
		Product:    productName,
		Lang:       lang,
		P:          product,
		Cfg:        cfg,
		ContentDir: contentDir,
	}

	outPath := filepath.Join(repoRoot, "translations", langCode, "antora.yml")
	return renderTemplate("antora.yml.tmpl", antoraYMLTemplate, data, outPath)
}

// EntitiesAdoc generates translations/{lang}/branding/pdf/entities.adoc.
func EntitiesAdoc(cfg *config.Config, productName, langCode, repoRoot string) error {
	lang, err := cfg.LanguageByCode(langCode)
	if err != nil {
		return err
	}
	product, ok := cfg.Products[productName]
	if !ok {
		return fmt.Errorf("product %q not found", productName)
	}

	localeAttrs, err := readLocaleAttributes(repoRoot, langCode)
	if err != nil {
		return err
	}

	data := struct {
		templateData
		LocaleAttrs string
	}{
		templateData: templateData{
			Product: productName,
			Lang:    lang,
			P:       product,
			Cfg:     cfg,
		},
		LocaleAttrs: localeAttrs,
	}

	outPath := filepath.Join(repoRoot, "translations", langCode, "branding", "pdf", "entities.adoc")
	if err := os.MkdirAll(filepath.Dir(outPath), 0o755); err != nil {
		return fmt.Errorf("mkdir %s: %w", filepath.Dir(outPath), err)
	}
	return renderTemplate("entities.adoc.tmpl", entitiesTemplate, data, outPath)
}

// readLocaleAttributes reads branding/locale/attributes-{lang}.adoc if it exists.
func readLocaleAttributes(repoRoot, langCode string) (string, error) {
	path := filepath.Join(repoRoot, "branding", "locale", fmt.Sprintf("attributes-%s.adoc", langCode))
	buf, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return "", nil
		}
		return "", fmt.Errorf("reading locale attributes %s: %w", path, err)
	}
	content := string(buf)
	if idx := strings.Index(content, "\n"); idx >= 0 && strings.HasPrefix(content, "//") {
		content = content[idx+1:]
	}
	return strings.TrimRight(content, "\n"), nil
}

// All runs all generators for every product/language combination in cfg.
// It also writes the embedded xref-converter Ruby extension to .bin/.
func All(cfg *config.Config, repoRoot, contentDir string) error {
	xrefDest := filepath.Join(repoRoot, ".bin", "xref-converter.rb")
	if err := WriteXrefExtension(xrefDest); err != nil {
		return err
	}

	for productName, product := range cfg.Products {
		for _, lang := range cfg.Languages {
			dir := filepath.Join(repoRoot, "translations", lang.Code)
			if err := os.MkdirAll(dir, 0o755); err != nil {
				return fmt.Errorf("mkdir %s: %w", dir, err)
			}

			if err := AntoraYML(cfg, productName, lang.Code, repoRoot, contentDir); err != nil {
				return fmt.Errorf("gen antora.yml [%s/%s]: %w", productName, lang.Code, err)
			}

			if err := EntitiesAdoc(cfg, productName, lang.Code, repoRoot); err != nil {
				return fmt.Errorf("gen entities.adoc [%s/%s]: %w", productName, lang.Code, err)
			}

			for outputName := range product.Outputs {
				if err := SiteYML(cfg, productName, outputName, lang.Code, repoRoot); err != nil {
					return fmt.Errorf("gen site.yml [%s/%s/%s]: %w", productName, outputName, lang.Code, err)
				}
			}
		}
	}
	return nil
}

func renderTemplate(name, tmplText string, data any, outPath string) error {
	tmpl, err := template.New(name).Parse(tmplText)
	if err != nil {
		return fmt.Errorf("parsing template %s: %w", name, err)
	}
	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return fmt.Errorf("executing template %s: %w", name, err)
	}
	if err := os.MkdirAll(filepath.Dir(outPath), 0o755); err != nil {
		return err
	}
	return os.WriteFile(outPath, buf.Bytes(), 0o644)
}
