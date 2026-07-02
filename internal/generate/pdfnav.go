package generate

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

// xrefRe matches lines like: * xref:some/file.adoc[Title]
var xrefRe = regexp.MustCompile(`^(\*+)\s+xref:([^[]+)\.adoc\[.*\]`)

// headingRe matches plain bullet lines that are section headings (no xref).
var headingRe = regexp.MustCompile(`^(\*+)\s+(.+)`)

var headingPrefix = []string{"= ", "== ", "=== ", "==== ", "===== "}

// PDFNav reads nav-{book}-guide.adoc from srcDir and writes
// nav-{book}-guide.pdf.{lang}.adoc to the same directory.
func PDFNav(srcDir, book, lang string) error {
	inPath := filepath.Join(srcDir, fmt.Sprintf("nav-%s-guide.adoc", book))
	outPath := filepath.Join(srcDir, fmt.Sprintf("nav-%s-guide.pdf.%s.adoc", book, lang))

	in, err := os.Open(inPath)
	if err != nil {
		return fmt.Errorf("pdf-nav: open %s: %w", inPath, err)
	}
	defer in.Close()

	out, err := os.Create(outPath)
	if err != nil {
		return fmt.Errorf("pdf-nav: create %s: %w", outPath, err)
	}
	defer out.Close()

	scanner := bufio.NewScanner(in)
	for scanner.Scan() {
		line := scanner.Text()
		transformed := transformNavLine(line, book)
		fmt.Fprintln(out, transformed)
	}
	if err := scanner.Err(); err != nil {
		return fmt.Errorf("pdf-nav: read %s: %w", inPath, err)
	}
	return nil
}

func transformNavLine(line, book string) string {
	trimmed := strings.TrimSpace(line)

	if m := xrefRe.FindStringSubmatch(trimmed); m != nil {
		depth := len(m[1]) - 1
		file := m[2]
		return fmt.Sprintf("include::modules/%s/pages/%s.adoc[leveloffset=+%d]", book, file, depth)
	}

	if m := headingRe.FindStringSubmatch(trimmed); m != nil {
		depth := len(m[1]) - 1
		title := m[2]
		if depth < len(headingPrefix) {
			return headingPrefix[depth] + title
		}
		return strings.Repeat("=", depth+1) + " " + title
	}

	return line
}
