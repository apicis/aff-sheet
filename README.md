# Affordance Sheet tool

A lightweight static web project for the Affordance Sheet, a reproducibility and documentation framework for multimodal affordance prediction research.

The site includes:
- a project landing page
- an interactive Affordance Sheet submission form
- an exploration/catalogue view for published entries
- a structured data model defined in YAML

## Project overview

This repository hosts the public-facing website for the Affordance Sheet initiative. It is designed to help researchers document methods, datasets, experimental setup, and model artifacts in a consistent structure so affordance prediction papers are easier to compare and reproduce.

## Repository structure

```text
.
├── docs/
│   ├── index.html            # landing page for the project
│   ├── aff_sheet.html        # overview / concept page
│   ├── submit.html           # submission form page
│   ├── explore.html          # database/exploration page
│   ├── assets/               # logos, diagrams, images
│   ├── config/
│   │   └── fields.yaml       # form schema for submissions
│   ├── css/                  # site stylesheets
│   ├── js/                   # client-side JS behavior
│   └── fonts/                # static font assets
├── .gitignore
└── README.md
```

## How the form works

The submission form is driven by the YAML schema in `docs/config/fields.yaml`. The browser loads that file and dynamically renders the form using `docs/js/form.js`.

This makes it easy to adjust the questionnaire without rewriting the page structure.

## Editing the form

To change the questionnaire fields:

1. Edit `docs/config/fields.yaml`
2. Update the related labels, sections, or validation settings
3. Refresh the page to preview the changes

## Deployment

Because this is a static site, it can be deployed to any standard static host, including GitHub Pages or similar services.

## Notes

- The project uses a public API endpoint for submissions, configured in `docs/js/form.js`.
- The site is research-oriented and designed for documentation and transparency in reproducible affordance evaluation.

## License

Check the repository license file if present, or confirm the project’s distribution terms before reusing or publishing the site content.
