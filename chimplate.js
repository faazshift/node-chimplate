let _ = require('lodash');
let fs = require('fs');
let moment = require('moment');
let asyncReplace = require('string-replace-async');
let feedparser = require('feedparser-promised');

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

    _php2moment(tpl = '') {
        let subs = {
            d: 'DD', D: 'ddd', j: 'D', l: 'dddd', N: 'E', S: 'o', w: 'e', z: 'DDD',
            W: 'W', F: 'MMMM', m: 'MM', M: 'MMM', n: 'M', t: '', L: '', o: 'YYYY',
            Y: 'YYYY', y: 'YY', a: 'a', A: 'A', B: '', g: 'h', G: 'H', h: 'hh', H: 'HH',
            i: 'mm', s: 'ss', u: 'SSS', e: 'zz', I: '', O: '', P: '', T: '', Z: '',
            c: '', r: '', U: 'X'
        };
        return tpl.split('').map((k) => { return _.has(subs, k) ? subs[k] : k }).join('');
    }

    // Basic template function handlers
    _FN_DATE(format = '') {
        return moment().format(this._php2moment(format));
    }

    _FN_UPPER(str, vars = null) {
        return _.get(vars, str, '').toUpperCase();
    }

    _FN_LOWER(str, vars = null) {
        return _.get(vars, str, '').toLowerCase();
    }

    _FN_TITLE(str, vars = null) {
        return _.startCase(_.get(vars, str, ''));
    }

    _FN_URL(str, vars = null) {
        return encodeURIComponent(_.get(vars, str, ''));
    }

    _FN_HTML(str, vars = null) {
        return _.get(vars, str, '');
    }

    // Compile template
    compile(vars = null, template = null) {
        if(template) {
            this.template = template;
        }

        let compiled = this.template || '';

        // Manual replacements
        compiled = compiled.replace('*|CURRENT_YEAR|*', moment().format('YYYY'));

        // Substitute vars
        let varKeys = vars ? _.keys(vars) : [];
        _.forEach(varKeys, (key) => {
            let re = RegExp(`\\*\\|${(this._resafe(key))}\\|\\*`, 'g');
            compiled = compiled.replace(re, _.get(vars, key, ''));
        });

        // Substitute function output
        compiled = compiled.replace(/\*\|([A-Z]+)\:([^*|]*)\|\*/g, (m, fn, arg) => {
            let _fn = `_FN_${fn}`;
            if(_.hasIn(this, _fn) && _.isFunction(this[_fn]) && _.indexOf(this.config.ignoreFuncs, fn) == -1) {
                return this[_fn](arg, vars);
            } else {
                return m;
            }
        });

        // TODO: Rudimentary conditional parsing
        //

        // Strip remaining tags
        if(this.config.postStrip) {
            compiled = compiled.replace(/\*\|[^*|]*\|\*/g, '');
        }

        // Set new compiled template
        this.compiled = compiled;

        return this.compiled;
    }

    compileRSS(vars = null, template = null) {
        let postStrip = this.config.postStrip;
        this.config.postStrip = false;
        this.compile(vars, template);
        this.config.postStrip = postStrip;

        // Rudimentary feed block parsing
        return asyncReplace(this.compiled, /\*\|FEEDBLOCK\:([^*|]*)\|\*[\s]*\*\|FEEDITEMS\:?([^*|]*)\|\*((?:.|[\r\n])+?)\*\|END:FEEDITEMS\|\*[\s]+\*\|END:FEEDBLOCK\|\*/g, (m, feedUrl, feedCfg, feedTpl) => {
            let cfgMatches = /\$([a-z]+)=([0-9]+)/g.exec(feedCfg);
            cfgMatches.shift();
            let cfgVars = {};
            while(cfgMatches.length > 0) {
                cfgVars[cfgMatches.shift()] = parseInt(cfgMatches.shift());
            }

            let url = feedUrl.replace('&amp;', '&');
            return feedparser.parse(url).catch((err) => {
                console.error(err);
            }).then((items) => {
                let ret = '';

                _.forEach(items, (item, idx) => {
                    if(_.has(cfgVars, 'count') && cfgVars.count <= idx) {
                        return;
                    }

                    let itemTpl = feedTpl;
                    itemTpl = itemTpl.replace('*|FEEDITEM:TITLE|*', _.get(item, 'title', ''));
                    itemTpl = itemTpl.replace('*|FEEDITEM:URL|*', _.get(item, 'link', ''));
                    itemTpl = itemTpl.replace('*|FEEDITEM:URL|*', _.get(item, 'link', ''));

                    let imgUrl = _.get(item, 'media:content.@.url', null);
                    if(imgUrl) {
                        let img = `<img src="${imgUrl}" />`;
                        itemTpl = itemTpl.replace('*|FEEDITEM:IMAGE|*', img);
                    }

                    ret += itemTpl;
                });

                return Promise.resolve(ret);
            });
        }).catch((err) => {
            console.error(err);
        }).then((replaced) => {
            // Strip remaining tags
            if(this.config.postStrip) {
                replaced = replaced.replace(/\*\|[^*|]*\|\*/g, '');
            }

            this.compiled = replaced;

            return Promise.resolve(this.compiled);
        });
    }

    get(vars = null) {
        if(!this.compiled || vars) {
            this.compile(vars);
        }

        return this.compiled;
    }
}