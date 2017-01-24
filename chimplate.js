let _ = require('lodash');
let fs = require('fs');

module.exports = class Chimplate {
    constructor(config = {}) {
        this.config = _.extend({
            ignoreVars: [], // Variables (eg *|NAME|*) that shouldn't be parsed
            ignoreFuncs: [], // Functions (eg *|DATE:...|*) that shouldn't be parsed
            postStrip: true // Strip unused tags at the end
        }, config);
        this.template = null;
        this.compiled = null;

        this.polyfill();
        this.initParsers();
    }

    polyfill() {
        // fs.existsSync polyfill, due to deprecation
        if(!_.has(fs, 'existsSync')) {
            let existsSync = function(path) {
                try {
                    this.accessSync(path, this.F_OK);
                    return true;
                } catch(e) {
                    return false;
                }
            };
            fs.existsSync = existsSync.bind(fs);
        }
    }

    initParsers() {
        _.forEach(this.config.parsers, (parser) => {

        });
    }

    setTemplate(template = null) {
        if(template) {
            this.template = template;
        }
    }

    setTemplateFromFile(templateFile = null) {
        if(templateFile && fs.existsSync(templateFile)) {
            this.setTemplate(fs.readFileSync(templateFile).toString());
        }
    }

    // Internal utility functions
    _resafe(str) {
        return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    }

    // Basic template function handlers
    _FN_DATE(format) {
        return '';// TODO: php -> moment date template format
    }

    _FN_UPPER(str, vars = null) {
        return _.get(vars, str, '').toUpperCase();
    }

    _FN_LOWER(str, vars = null) {
        return _.get(vars, str, '').toLowerCase();
    }

    // Compile template
    compile(vars = null, template = null) {
        if(template) {
            this.template = template;
        }

        let compiled = this.template || '';

        // Substitute vars
        let varKeys = vars ? _.keys(vars) : [];
        _.forEach(varKeys, (key) => {
            let re = RegExp(`\\*\\|${(this._resafe(key))}\\|\\*`, 'g');
            compiled = compiled.replace(re, _.get(vars, key, ''));
        });

        // Substitute function output
        compiled = compiled.replace(/\*\|([A-Z]+)\:([^*|]*)\|\*/g, (m, fn, arg, pos, orig) => {
            let _fn = `_FN_${fn}`;
            if(_.get(this, _fn, false) && _.isFunction(this[_fn]) && _.indexOf(this.config.ignoreFuncs, fn) == -1) {
                return this[_fn](arg, vars);
            } else {
                return m;
            }
        });

        // TODO: Handle blocks and expressions
        //

        // Strip remaining tags
        if(this.config.postStrip) {
            compiled = compiled.replace(/\*\|[^*|]*\|\*/g, '');
        }

        // Set new compiled template
        this.compiled = compiled;

        return this.compiled;
    }

    get(vars = null) {
        if(!this.compiled || vars) {
            this.compile(vars);
        }

        return this.compiled;
    }
}