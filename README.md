# Command Line Interface for CloudConvert 

This CLI for the [CloudConvert API v2](https://cloudconvert.com/api/v2) allows easy and fast conversions of files using the terminal. 


## Installation

As this CLI is based on the [cloudconvert-node](https://github.com/cloudconvert/cloudconvert-node) module, [node.js](https://nodejs.org/) is required.

    npm install -g cloudconvert-cli
    
    
And set your CloudConvert [API v2 Key](https://cloudconvert.com/dashboard/api/v2/keys) as enviroment variable:

    export CLOUDCONVERT_API_KEY=your_key
    
## Usage



To convert input.pdf to jpg:

```
$ cloudconvert convert -f jpg input.pdf
✔ Done!
```

Batch processing is supported:

```
$ cloudconvert convert -f jpg file1.pdf file2.pdf file3.pdf
```
```
$ cloudconvert convert -f jpg folder/*.*
```

You can set conversion specific parameters using the ``-p`` argument. For example, if you would like to get the first page of a PDF resized to the width of 250:

```
$ cloudconvert convert -f jpg -p.pages=1-1 -p.width=250 input.pdf
```

The best way to find out the possible parameters and values is using the [Job Builder](https://cloudconvert.com/api/v2/jobs/builder).

#### Optimize

```
$ cloudconvert optimize input.pdf
✔ Done!
ℹ Task `process`: File size reduced by 12%
```

#### Merge

```
$ cloudconvert merge file1.pdf file2.pdf
```

#### Capture Website

```
$ cloudconvert capture-website -f pdf https://www.google.com
```

#### Create Thumbnail

```
$ cloudconvert thumbnail -f png file1.pdf 
```
    
## All Options

```
$ cloudconvert --help

cloudconvert <command>

Commands:
  cloudconvert convert <files..>      Convert files to an output format
  cloudconvert optimize <files..>     Optimize and compress files
  cloudconvert merge <files..>        Merge files to a single PDF
  cloudconvert capture-website <url>  Capture a website as PDF, PNG or JPG
  cloudconvert thumbnail <files..>    Create thumbnails

Options:
  --version        Show version number                                 [boolean]
  --apikey         Set the API key. You can get your API key here:
                   https://cloudconvert.com/dashboard/api/v2/keys
         [string] [required] [default: CLOUDCONVERT_API_KEY enviroment variable]
  --sandbox        Use the CloudConvert Sandbox API   [boolean] [default: false]
  --outputdir      Set the directory for storing the output files. defaults to
                   the working directory                                [string]
  --parameter, -p  Send custom parameters with the task payload. Use the dot
                   notation, for example: -p.engine=office
  --help           Show help                                           [boolean]


```

    
## Resources


* [API Documentation](https://cloudconvert.com/api/v2)
* [CloudConvert Blog](https://cloudconvert.com/blog)
