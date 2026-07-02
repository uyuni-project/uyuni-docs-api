package generate

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// CollectPDFs moves PDFs for the given product from build/{lang}/pdf/ into dest/{lang}/.
func CollectPDFs(product, srcBuildDir, destDir string, langs []string) error {
	prefix := product + "_"

	for _, lang := range langs {
		srcPDFDir := filepath.Join(srcBuildDir, lang, "pdf")

		entries, err := os.ReadDir(srcPDFDir)
		if os.IsNotExist(err) {
			fmt.Printf("collect-pdfs: %s: no PDFs found at %s, skipping\n", lang, srcPDFDir)
			continue
		}
		if err != nil {
			return fmt.Errorf("collect-pdfs: read %s: %w", srcPDFDir, err)
		}

		destLangDir := filepath.Join(destDir, lang)
		if err := os.MkdirAll(destLangDir, 0o755); err != nil {
			return fmt.Errorf("collect-pdfs: mkdir %s: %w", destLangDir, err)
		}

		moved := 0
		for _, entry := range entries {
			name := entry.Name()
			if entry.IsDir() || !strings.HasPrefix(name, prefix) || !strings.HasSuffix(name, ".pdf") {
				continue
			}
			src := filepath.Join(srcPDFDir, name)
			dst := filepath.Join(destLangDir, name)
			if err := os.Rename(src, dst); err != nil {
				return fmt.Errorf("collect-pdfs: move %s → %s: %w", src, dst, err)
			}
			moved++
		}

		fmt.Printf("collect-pdfs: %s: moved %d PDF(s) → %s\n", lang, moved, destLangDir)
		_ = os.Remove(srcPDFDir)
	}

	return nil
}
