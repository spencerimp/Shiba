import {load as loadYAML} from 'js-yaml';
import {join} from 'path';
import {readFileSync} from 'fs';
import {getPath} from 'app';

export interface Config {
    linter: string;
    file_ext: {
        markdown: string[];
        html: string[];
    };
    width: number;
    height: number;
    shortcuts: Object;
    lint_options?: any;
}

export function load(): Config {
    if (this.user_config) {
        return this.user_config;
    }

    const file = join(getPath('userData'), 'config.yml');
    const default_config = {
        linter: "mdast-lint",
        file_ext: {
            markdown: ["md", "markdown", "mkd"],
            html: ["html"]
            // TODO: Add slim?
        },
        width: 800,
        height: 600,
        shortcuts: {
            'J':         'PageDown',
            'K':         'PageUp',
            'Down':      'PageDown',
            'Up':        'PageUp',
            'PageDown':  'PageDown',
            'PageUp':    'PageUp',
            'H':         'PageLeft',
            'L':         'PageRight',
            'Left':      'PageLeft',
            'Right':     'PageRight',
            'I':         'PageTop',
            'M':         'PageBottom',
            'Home':      'PageTop',
            'End':       'PageBottom',
            'Control+P': 'ChangePath',
            'Control+L': 'Lint'
        }
    };

    function mergeConfig(c1: Config, c2: Config) {
        for (const k in c2) {
            const v2 = c2[k];

            if (k in c1) {
                let v1 = c1[k];
                if (typeof(v1) === "object" && typeof(v2) === "object") {
                    mergeConfig(v1, v2);
                }
                continue;
            }

            c1[k] = c2[k];
        }
    }

    try {
        this.user_config = loadYAML(readFileSync(file, {encoding: 'utf8'}));
        mergeConfig(this.user_config, default_config);
    } catch(e) {
        console.log('No configuration file is found: ' + file);
        this.user_config = default_config;
    }

    return this.user_config;
}