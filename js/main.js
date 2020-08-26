import { graphviz } from 'd3-graphviz';
import JSZip from 'jszip';

const CORSProxyUrl = 'https://cors-anywhere.herokuapp.com/';
const FlameGraphPlUrl = 'https://raw.githubusercontent.com/brendangregg/FlameGraph/master/flamegraph.pl';

function $(selector) {
    return document.querySelector(selector);
}

export function main() {
    registerHandlers();
    $('#loading').style.display = 'none';
    $('#container').style.display = 'block';

    const params = new URLSearchParams(window.location.search);

    const profileUrl = params.get('url');
    if (profileUrl) {
        setProfileUrl(profileUrl);
    }

    const format = params.get('format');
    if (format) {
        setProfileFormat(format);
    }

    showButtonsForCurrentProfileFormat();
}

async function readProfileFromUrl() {
    const url = getProfileUrl();
    if (!url)
        return;
    let response;
    try {
        response = await fetch(url);
    } catch (e) {
        console.log(e);
        console.log('Retrying with CORS proxy')
        response = await fetch(CORSProxyUrl + url);
    }
    if (!response.ok) {
        window.alert(`Could not load profile from ${url}: ${response.status} ${response.statusText}`)
        return;
    }
    let buf = await response.arrayBuffer();
    if (url.endsWith('.zip')) {
        buf = await unzip(buf);
    }
    return buf;
}

async function readProfileFromFile() {
    const file = $('#profile-file').files[0];
    if (!file)
        return;
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    let buf = await new Promise((resolve, reject) => {
        reader.onload = evt => {
            resolve(evt.target.result);
        };
        reader.onerror = () => {
            window.alert('Error while loading profile file: ' + reader.error);
            reject(reader.error);
        };
    });
    if (file.name.endsWith('.zip')) {
        buf = await unzip(file);
    }
    return buf;
}

async function readProfile() {
    let buf = await readProfileFromFile();
    if (buf)
        return buf;
    buf = await readProfileFromUrl();
    if (buf)
        return buf;
    window.alert('File/URL missing');
    throw Error('file/url missing');
}

async function unzip(buf) {
    const zip = await JSZip.loadAsync(buf);
    const paths = Object.keys(zip.files);
    if (paths.length > 1) {
        window.alert('Warning: ZIP archive contains more than one file, trying a random one');
    }
    return await zip.files[paths[0]].async('arraybuffer');
}

function getProfileFormat() {
    return $('#profile-format').value;
}

function setProfileFormat(format) {
    $('#profile-format').value = format;
}

function getProfileUrl() {
    return $('#profile-url').value;
}

function setProfileUrl(url) {
    $('#profile-url').value = url;
}

function showButtonsForCurrentProfileFormat() {
    const isPstats = getProfileFormat() == 'pstats';
    $('#table-btn').style.display = isPstats ? '' : 'none';
    $('#flameprof-btn').style.display = isPstats ? '' : 'none';
    $('#flamegraph-btn').style.display = isPstats ? '' : 'none';
}

function updateLocation() {
    const profileUrl = getProfileUrl();
    const profileFormat = getProfileFormat();
    
    const baseUrl = window.location.origin + window.location.pathname;
    let url = baseUrl;
    if (profileUrl) {
        url = `?url=${profileUrl}&format=${profileFormat}`;
    }
    window.history.replaceState({}, '', url);
}

function setToolBusy(busy) {
    $('#tool-progress').innerHTML = busy ? '⏳' : '';
}

function registerHandlers() {
    $('#profile-url').addEventListener('input', () => {
        updateLocation();
    });

    $('#profile-format').addEventListener('change', () => {
        showButtonsForCurrentProfileFormat();
        updateLocation();
    });

    $('#gprof2dot-btn').addEventListener('click', async () => {
        setToolBusy(true);
        try {
            const buf = await readProfile();
            const format = getProfileFormat();
            const dot = await gprof2dot(buf, format);
            await renderDot(dot);
        } finally {
            setToolBusy(false);
        }
    });

    $('#flameprof-btn').addEventListener('click', async () => {
        if (getProfileFormat() != 'pstats') {
            throw Error('flameprof only supported for pstats');
        }
        setToolBusy(true);
        try {
            const buf = await readProfile();
            const svg = await flameprof(buf, 'svg');
            renderSvg(svg);
        } finally {
            setToolBusy(false);
        }
    });

    $('#flamegraph-btn').addEventListener('click', async () => {
        setToolBusy(true);
        try {
            const buf = await readProfile();
            let log;
            if (getProfileFormat() == 'pstats') {
                log = await flameprof(buf, 'log');
            } else {
                throw Error('FlameGraph only supported for pstats currently');
            }
            const svg = await flamegraph(log);
            // The SVG is not "clean" and only really works on a separate page.
            renderIframe('#graph', svg);
        } finally {
            setToolBusy(false);
        }
    });

    $('#table-btn').addEventListener('click', async () => {
        if (getProfileFormat() != 'pstats') {
            throw Error('table only supported for pstats');
        }
        setToolBusy(true);
        try {
            const buf = await readProfile();
            const pstats = await readPstats(buf);
            renderTable(pstats);
        } finally {
            setToolBusy(false);
        }
    });
}

function renderSvg(svg) {
    $('#graph').innerHTML = svg;
    $('#graph').style.display = 'block';
}

function renderIframe(where, content) {
    $(where).innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.frameBorder = 0;
    iframe.srcdoc = content;
    $(where).appendChild(iframe);
    $(where).style.display = 'block';
}

async function renderDot(dot) {
    $('#graph').innerHTML = '';
    await new Promise(resolve => {
        graphviz("#graph")
            .options({width: '100%', height: 600, zoomScaleExtent: [0.1, 100], fit: true})
            .renderDot(dot, resolve);
    })
    $('#graph').style.display = 'block';
}

function renderTable(data) {
    let html = '<thead><tr>' + data.columns.map(name => `<th>${name}</th>`).join('') + '</tr></thead>';
    for (const row of data.rows) {
        html += '<tr>' + row.map(val => `<td>${val}</td>`).join('') + '</tr>';
    }
    const tableEl = $('#table');
    tableEl.innerHTML = html;
    tableEl.style.display = 'block';
    sorttable.makeSortable(tableEl);
}

async function gprof2dot(buf, format) {
    try {
        window.prof_buf = buf;
        const dot = await pyodide.runPythonAsync(`
            from tempfile import NamedTemporaryFile
            import gprof2dot
            from js import prof_buf

            with NamedTemporaryFile('w+b') as f_in, NamedTemporaryFile('r+') as f_out:
                f_in.write(prof_buf)
                f_in.flush()

                gprof2dot.main([
                    '-f', '${format}',
                    '-o', f_out.name,
                    f_in.name
                ])

                dot = f_out.read()
            dot
        `);
        return dot;
    } catch (e) {
        window.alert('Error running gprof2dot:\n\n' + e.message)
        throw e;
    } finally {
        delete window.prof_buf;
    }
}

async function flameprof(buf, outFormat) {
    try {
        window.prof_buf = buf;
        const out = await pyodide.runPythonAsync(`
            from tempfile import NamedTemporaryFile
            import io
            import pstats
            import flameprof
            from js import prof_buf

            with NamedTemporaryFile('w+b') as f_in:
                f_in.write(prof_buf)
                f_in.flush()

                s = pstats.Stats(f_in.name)

                result = io.StringIO()
                flameprof.render(
                    s.stats, result, '${outFormat}', flameprof.DEFAULT_THRESHOLD / 100,
                    flameprof.DEFAULT_WIDTH, flameprof.DEFAULT_ROW_HEIGHT,
                    flameprof.DEFAULT_FONT_SIZE, flameprof.DEFAULT_LOG_MULT)

            out = result.getvalue()
            out
        `);
        return out;
    } catch (e) {
        window.alert('Error running flameprof:\n\n' + e.message)
        throw e;
    } finally {
        delete window.prof_buf;
    }
}

let webperlDidRun = false;
async function flamegraph(log) {
    if (webperlDidRun) {
        window.alert('Please reload the page to run FlameGraph again (limitation of WebPerl).');
        throw Error('can only run WebPerl once');
    }
    const response = await fetch(FlameGraphPlUrl);
    if (!response.ok) {
        window.alert(`Error loading ${FlameGraphPlUrl}: ${response.status} ${response.statusText}`);
        return;
    }
    const pl = await response.text();
    try {
        await new Promise(resolve => Perl.init(resolve));
        webperlDidRun = true;
        let svg = '';
        Perl.output = (str, chan) => {
            if (chan == 1) { // stdout
                svg += str;
            } else { // stderr
                console.log(str);
            }
        };
        const logPath = '/tmp/profile.log';
        const plPath = '/tmp/flamegraph.pl';
        FS.writeFile(logPath, log);
        FS.writeFile(plPath, pl);
        Perl.start([plPath, logPath]);
        return svg;
    } catch (e) {
        window.alert('Error running FlameGraph:\n\n' + e.message)
        throw e;
    } finally {
        Perl.end();
    }
}

async function readPstats(buf) {
    // https://qxf2.com/blog/saving-cprofile-stats-to-a-csv-file/
    try {
        window.prof_buf = buf;
        const pstats = await pyodide.runPythonAsync(`
            from tempfile import NamedTemporaryFile
            import io
            import pstats
            from js import prof_buf

            with NamedTemporaryFile('w+b') as f_in:
                f_in.write(prof_buf)
                f_in.flush()

                result = io.StringIO()
                stats = pstats.Stats(f_in.name, stream=result)
                stats.sort_stats(pstats.SortKey.TIME)
                stats.print_stats()

            result = result.getvalue()
            result = result[result.index('ncalls'):]
            result = [line.rstrip().split(None, 5) for line in result.split('\\n')]
            {'columns': result[0], 'rows': result[1:]}
        `);
        return pstats;
    } catch (e) {
        window.alert('Error reading pstats profile:\n\n' + e.message)
        throw e;
    } finally {
        delete window.prof_buf;
    }
}