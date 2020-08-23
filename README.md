# profviewer

https://letmaik.github.io/profviewer

An experiment for viewing runtime profiles online in a fully static website.

Features:
- Profile files are not uploaded but locally read.
- [gprof2dot](https://github.com/jrfonseca/gprof2dot) integration via [pyodide](https://github.com/iodide-project/pyodide), powered by WebAssembly.
- Graphviz rendering via [d3-graphviz](https://github.com/magjac/d3-graphviz), also powered by WebAssembly.

Future ideas:
- Tables
- Flamegraphs
- Load profile files from URL for sharing (e.g. from GitHub issue attachment)
- Support zipped profile files (mostly for GitHub issue attachments)

## Development

Just start a web server, no compilation needed:
```
python -m http.server
```
