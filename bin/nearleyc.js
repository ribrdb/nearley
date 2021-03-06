#!/usr/bin/env node

var fs = require('fs');
var nearley = require('../lib/nearley.js');
var nomnom = require('nomnom');
var Compile = require('../lib/compile.js');
var StreamWrapper = require('../lib/stream.js');

var opts = nomnom
    .script('nearleyc')
    .option('file', {
        position: 0,
        help: "An input .ne file (if not provided then read from stdin)",
    })
    .option('out', {
        abbr: 'o',
        help: "File to output to (defaults to stdout)",
    })
    .option('export', {
        abbr: 'e',
        help: "Variable to set the parser to",
        default: "grammar"
    })
    .option('nojs', {
        flag: true,
        default: false,
        help: "Don't compile postprocessors (for testing)."
    })
    .option('version', {
        abbr: 'v',
        flag: true,
        help: "Print version and exit",
        callback: function() {
            return require('../package.json').version;
        }
    })
    .option('output_wrapper', {
        help: "Customize the parser output. " +
            "Interpolates the tokens %output% and %export% to the generated " +
            " parser and the export variable name, respectively."
    })
    .option('output_wrapper_file', {
        help: "If specified, read the output_wrapper from this file. " +
            "(use this if you need multiple lines in your wrapper)."
    })
    .parse();

var input = opts.file ? fs.createReadStream(opts.file) : process.stdin;
var output = opts.out ? fs.createWriteStream(opts.out) : process.stdout;

if (opts.output_wrapper_file) {
    opts.output_wrapper = fs.readFileSync(opts.output_wrapper_file);
}

var parserGrammar = require('../lib/nearley-language-bootstrapped.js');
var parser = new nearley.Parser(parserGrammar.ParserRules, parserGrammar.ParserStart);
var generate = require('../lib/generate.js');
var lint = require('../lib/lint.js');

input
    .pipe(new StreamWrapper(parser))
    .on('finish', function() {
        var c = Compile(parser.results[0], opts);
        lint(c, {'out': process.stderr});
        output.write(generate(c, opts.export, opts.output_wrapper));
    });
