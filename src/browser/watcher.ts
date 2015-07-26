import {addRecentDocument} from 'app';
import * as marked from 'marked';
import * as path from 'path';
import * as fs from 'fs';
import * as chokidar from 'chokidar';
import {highlight} from 'highlight.js';
import {replaceAll as replaceAllEmojis} from './emoji';
import * as config from './config'
import Linter from './linter';

marked.setOptions({
    highlight: function(code: string, lang: string): string {
        if (lang === undefined) {
            return code;
        }

        try {
            return highlight(lang, code).value;
        } catch (e) {
            console.log(e.message);
            return code;
        }
    }
});

class Watcher {
    config: config.Config;
    linter: Linter;
    file_watcher: fs.FSWatcher;

    constructor(public path, public render, public renderLintResult) {
        this.config = config.load();
        this.linter = new Linter(this.config.linter, this.config.lint_options);

        console.log('Watcher starts with ' + this.path);

        this.startWatching();
    }

    startWatching() {
        if (this.file_watcher) {
            this.file_watcher.close();
        }

        if (!fs.existsSync(this.path)) {
            return;
        }

        if (fs.statSync(this.path).isFile()) {
            this._sendUpdate(this.path);
        }

        const ext_pattern = Object.keys(this.config.file_ext)
                                .map((k) => this.config.file_ext[k].join('|'))
                                .join('|');

        console.log(ext_pattern);

        const watched = path.join(this.path, '**', `*.(${ext_pattern})`);
        this.file_watcher = chokidar.watch(
            watched, {
                ignoreInitial: true,
                persistent: true,
                ignored: /[\\\/]\./
            }
        );

        this.file_watcher.on('change', (file: string) => {
            console.log('File changed: ' + file);
            this._sendUpdate(file);
        });
        this.file_watcher.on('add', (file: string) => {
            console.log('File added: ' + file);
            this._sendUpdate(file);
        });
        this.file_watcher.on('error', (error) => {
            console.log(`Error on watching: ${error}`);
        })
    }

    _sendUpdate(file: string) {
        const ext = path.extname(file).substr(1);
        if (ext === '') {
            return;
        }

        console.log(ext);

        const kind = (() => {
            for (const k in this.config.file_ext) {
                if (this.config.file_ext[k].indexOf(ext) !== -1) {
                    return k;
                }
            }
            return '';
        })();

        console.log(kind);

        switch (kind) {
            case 'markdown': {
                // Encoding should be specified by config or detected
                fs.readFile(file, 'utf8', (err: NodeJS.ErrnoException, text: string) => {
                    if (err) {
                        console.log("Can't open: " + file);
                        return;
                    }

                    addRecentDocument(file);

                    // XXX: Why I use basename of file? Why full path is not needed?
                    this.linter.lint(path.basename(file), text, this.renderLintResult);

                    // Note:
                    // Replace emoji notations in HTML document because Markdown can't specify the size of image.
                    let html = marked(text);
                    this.render(kind, replaceAllEmojis(html));
                });
                break;
            }
            case 'html': {
                // XXX: Temporary
                // I should send file name simply and renderer will read the file using <webview>
                this.render(kind, file);
            }
        }
    }

    changeWatchingDir(new_path: string) {
        if (new_path === this.path) {
            return;
        }

        console.log('Change watching path' + this.path + ' -> ' + new_path);

        this.path = new_path;
        this.startWatching();
    }

    getLintRuleURL() {
        return this.linter.lint_url;
    }
}

export = Watcher;