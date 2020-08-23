import { graphviz } from 'd3-graphviz';

export function main() {
    registerHandlers();
    document.getElementById('loading').style.display = 'none';
    document.getElementById('container').style.display = 'block';
}

function registerHandlers() {
    document.getElementById('gprof2dot-btn').addEventListener('click', () => {
        const file = document.getElementById('profile-file').files[0];
        if (!file)
            return;
        const formatEl = document.getElementById('profile-format');
        const format = formatEl.options[formatEl.selectedIndex].value;
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onload = async evt => {
            const dot = await gprof2dot(evt.target.result, format);
            renderDot(dot);
        };
        reader.onerror = () => {
            window.alert('Error while loading profile file: ' + reader.error);
        };
    });
}

function renderDot(dot) {
    graphviz("#graph")
        .options({width: 800, height: 600, zoomScaleExtent: [0.1, 100], fit: true})
        .renderDot(dot);
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