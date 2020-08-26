# profviewer

https://letmaik.github.io/profviewer

An experiment for viewing runtime profiles online in a fully static website.

Features:
- Profile files are not uploaded but locally read.
- [gprof2dot](https://github.com/jrfonseca/gprof2dot) and [flameprof](https://github.com/baverman/flameprof) integration via [pyodide](https://github.com/iodide-project/pyodide), powered by WebAssembly.
- Graphviz rendering via [d3-graphviz](https://github.com/magjac/d3-graphviz), also powered by WebAssembly.
- Sortable table for pstats (Python) profiles.
- Flame graphs for pstats (Python) profiles via [flameprof](https://github.com/baverman/flameprof), [FlameGraph](https://github.com/brendangregg/FlameGraph), and [WebPerl](https://github.com/haukex/webperl).
- Load zipped profiles via [JSZip](https://github.com/Stuk/jszip).
- Load profiles from URLs (e.g. from [GitHub issue](https://github.com/letmaik/profviewer/issues/1) attachments).

Future ideas:
- Table display for more profile formats
- Flame graphs for more profile formats

## Limitations

### pstats (Python) profiles

Python does not guarantee file compatibility for cProfile/profile files between Python versions or operating systems. The current pyodide version uses Python 3.7. If the profile can't be read, then "ValueError: bad marshal data (unknown type code)" will be shown.

### flameprof (for pstats profiles)

Running [flameprof](https://github.com/baverman/flameprof) will error with ["maximum recursion depth exceeded"](https://github.com/iodide-project/pyodide/issues/346#issuecomment-680689869) for bigger profiles. This is because it [relies on recursion](https://github.com/baverman/flameprof/blob/df94267b78028b88234a64c21d88d046217ba72e/flameprof.py#L144-L150) which in pyodide relies on JavaScript recursion. Since one Python call translates to multiple JavaScript call frames, the effective browser limit (Firefox ~439, Chrome ~315) is much lower than for regular Python (1000). Ideally, flameprof should be fixed as it seems likely that it may also fail for bigger profiles on regular Python.

### FlameGraph (for pstats profiles)

[FlameGraph](https://github.com/brendangregg/FlameGraph) is a Perl script which is run via [WebPerl](https://github.com/haukex/webperl). Unfortunately, WebPerl currently has the limitation that it can only be run once, there is no way to restart the interpreter. That means, if the FlameGraph button is pressed again, an error is shown explaining that.
The demo pages of WebPerl work around that by using IFrames, but for this experimental project it's not worth the effort.

## Development

Just start a web server, no compilation needed:
```
python -m http.server
```