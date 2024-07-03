
Small utility for watching an HBS file for updates, rendering it to HTML, and syncing it to the browser.

1. Clone the repo
2. Run `npm link`

## Usage
Just point it to an hbs file or directory with hbs files in it. Optionally provide data.

```
hbs2html -i ./my/template.hbs
hbs2html -i <directory with .hbs file and .json file>
hbs2html -i ./my/template.hbs -d /my/data.json
hbs2html -i ./my/template.hbs -d "{\"message\":\"Hello, World!\"}"
```