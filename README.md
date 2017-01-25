# Chimplate

A JavaScript template compiler for Mailchimp and Mandrill templates.

# Use

```JS
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
