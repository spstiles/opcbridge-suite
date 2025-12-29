# docs/Makefile

MANUAL_MD = manual.md
MANUAL_PDF = manual.pdf

all: $(MANUAL_PDF)

$(MANUAL_PDF): $(MANUAL_MD)
	pandoc $(MANUAL_MD) \
	  -o $(MANUAL_PDF) \
	  --from markdown \
	  --pdf-engine=pdflatex \
	  --toc \
	  --number-sections

clean:
	rm -f $(MANUAL_PDF)

