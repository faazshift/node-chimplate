# Chimplate

A JavaScript template compiler for Mailchimp and Mandrill templates.

# Install

```bash
$ npm install --save chimplate
```

# Use

```javascript
let chimplate = require('chimplate');

let template = new chimplate();
// OR
let template = new chimplate({
  ignoreVars: ['FNAME'], // Merge vars to not parse
  ignoreFuncs: ['DATE'], // Functional merge vars not to parse
  postStrip: false // Whether or not to strip all remaining merge vars after compiling
});

// ...

template.setTemplate('...');
// OR
template.setTemplateFromFile('./my.tpl.html');

// ...

let compiled = template.compile({MERGEVAR1: 'Some value'});
// OR
template.compile({MERGEVAR1: 'Some value'});
let compiled = template.get();
```
#### FEEDBLOCKs

Althought not fully matured, chimplate has basic ability to process some \*|FEEDBLOCK:\<url\>|\* blocks. To utilize this functionality, instead of calling `template.compile`, you'd call `template.compileRSS`, which returns a Promise. An example:

```javascript
let template = new chimplate({
    postStrip: false
});
template.setTemplateFromFile('/some/template/file.tpl.html');

template.compileRSS().catch((err) => {
    console.error(err);
}).then((output) => {
    if(output) {
        console.log(output);
    }
});
```
