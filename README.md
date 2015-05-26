Command Line Interface for CloudConvert 
=======================
This CLI for [CloudConvert](https://cloudconvert.com) allows easy and fast conversions of files using the terminal. 

Currently this CLI only supports the basic API features of CloudConvert. Feel free to fork and submit pull requests to improve this!

Installation
-------------------
As this CLI is based on the [cloudconvert-node](https://github.com/cloudconvert/cloudconvert-node) module, [node.js](https://nodejs.org/) has to be installed, of course.

    npm install -g cloudconvert-cli
    
    
And set your CloudConvert [API Key](https://cloudconvert.com/user/profile) as enviroment variable:

    export CLOUDCONVERT_API_KEY=your_key
    
Usage
-------------------


To convert input.pdf to jpg:

```
$ cloudconvert -f jpg input.pdf
test.pdf  ->  jpg  [=====================================] 100%  Conversion finished!
1 of 1 conversions completed successfully.
```

Batch converting is supported:

```
$ cloudconvert -f jpg file1.pdf file2.pdf file3.pdf
```
```
$ cloudconvert -f jpg *.pdf
```
```
$ cloudconvert -f jpg folder/*.*
```

You can set conversion specific options using the ``-c`` argument. For example, if you would like to get the first page of a PDF resized to the width of 250:

```
$ cloudconvert -f jpg -c page_range=1-1 -c resize=250x input.pdf
```

The best way to find out the possible options and values is using the [API Console](https://cloudconvert.com/apiconsole).

To quickly find out which output formats are supported for a specific file:

```
$ cloudconvert input.pdf
The file(s) can be converted to the following output formats using the -f argument:
test.pdf      -> dxf, doc, docx, html, odt, pdf, rtf, txt, azw3, epub, lrf, mobi, oeb, pdb, bmp, gif, ico, jpg, odd, png, psd, tiff, webp, emf, eps, ps, svg, wmf

```

    
All Options
-------------------
```
$ cloudconvert --help

  Usage: cloudconvert [options] [files...]

  Options:

    -h, --help                              output usage information
    -f, --format <format>                   set the output format the file(s) should be converted to
    -c, --converteroption <option>=<value>  set a converter option. example: -c page_range=1-2
    -p, --preset <id>                       use a preset of conversion options. Presets can be managed here: https://cloudconvert.com/preset
    -o, --outputdir <directory>             set the directory for storing the output files. defaults to the working directory
    --apikey <value>                        set the API key. alternatively you can use the CLOUDCONVERT_API_KEY enviroment variable
    --concurrent <n>                        limit to n concurrent conversions. defaults to 5
    -V, --version                           output the version number

  Examples:

    $ cloudconvert -f jpg ../test/*.pdf
    $ cloudconvert -f jpg -c page_range=1-1 test.pdf

```
    
Resources
---------

* [API Documentation](https://cloudconvert.com/apidoc)
* [Conversion Types](https://cloudconvert.com/formats)
* [CloudConvert Blog](https://cloudconvert.com/blog)