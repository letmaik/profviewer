# profviewer

https://letmaik.github.io/profviewer

An experiment for viewing runtime profiles online in a fully static website.

Features:
- Profile files are not uploaded but locally read.
- [gprof2dot](https://github.com/jrfonseca/gprof2dot) integration via [pyodide](https://github.com/iodide-project/pyodide), powered by WebAssembly.
- Graphviz rendering via [d3-graphviz](https://github.com/magjac/d3-graphviz), also powered by WebAssembly.
- Sortable table for pstats (Python) profiles.
- Zipped profiles via [JSZip](https://github.com/Stuk/jszip).
- Profiles from URLs (e.g. from [GitHub issue](https://github.com/letmaik/profviewer/issues/1) attachments).

Future ideas:
- Table display for more profile formats
- Flamegraphs

## Development

Just start a web server, no compilation needed:
```
python -m http.server
```
