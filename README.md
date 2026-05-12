# Command Line Interface for CloudConvert 

This CLI for the [CloudConvert API v2](https://cloudconvert.com/docs) allows easy and fast conversions of files using the terminal. Node.js 22 or newer is required.


## Installation

As this CLI is based on the [cloudconvert-node](https://github.com/cloudconvert/cloudconvert-node) module, [node.js](https://nodejs.org/) is required.

    npm install -g cloudconvert-cli
    
    
And set your CloudConvert [API v2 Key](https://cloudconvert.com/dashboard/api/v2/keys) as environment variable:

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

You can set conversion specific parameters using dynamic options. For example, if you would like to get the first page of a PDF resized to the width of 250:

```
$ cloudconvert convert -f jpg --pages=1-1 --width=250 input.pdf
```

You can list possible parameters and values using the `parameters` command:

```
$ cloudconvert parameters convert --input-format pdf --output-format jpg
```

Use `--json` to print the raw operation metadata returned by the API.

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

#### Add Watermark

Add a text watermark to a PDF:

```
$ cloudconvert watermark --text="Confidential" input.pdf
```

Add an image watermark to a PDF. Parameters with the CloudConvert type `Input`, such as `image`, are uploaded as secondary input files:

```
$ cloudconvert watermark --image=./watermark.png input.pdf
```

#### PDF Operations

PDF-specific operations from the CloudConvert API are available using their operation names:

```
$ cloudconvert pdf/a input.pdf
$ cloudconvert pdf/x --variant=4 input.pdf
$ cloudconvert pdf/ocr -p.language.0=eng input.pdf
$ cloudconvert pdf/encrypt --set_password=123 --set_owner_password=456 input.pdf
$ cloudconvert pdf/decrypt --password=123 input.pdf
$ cloudconvert pdf/split-pages input.pdf
$ cloudconvert pdf/extract-pages --pages=1,2 input.pdf
$ cloudconvert pdf/rotate-pages --pages=1,2 --rotation=+90 input.pdf
```

Dashed aliases such as `pdf-a` and `pdf-rotate-pages` are also supported. See CloudConvert's [PDF operations documentation](https://cloudconvert.com/docs/raw/operations/pdf-operations.md) for the available operations and task parameters.

#### Execute Command

Execute a custom `ffmpeg`, `imagemagick`, or `graphicsmagick` command. Uploaded files are available in `/input/upload-0/`, `/input/upload-1/`, and so on. Write output files to `/output/` so they can be downloaded:

```
$ cloudconvert command --engine=ffmpeg --command=ffmpeg --arguments="-i /input/upload-0/input.mp4 -vcodec libx264 -acodec copy /output/output.mp4" input.mp4
```

Command output is captured and printed by default. Use `--no-capture-output` to disable this.
    
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
  cloudconvert watermark <files..>    Add watermarks to files
  cloudconvert pdf/a <files..>        Convert PDF files to PDF/A
  cloudconvert pdf/x <files..>        Convert PDF files to PDF/X
  cloudconvert pdf/ocr <files..>      Add an OCR text layer to scanned PDF files
  cloudconvert pdf/encrypt <files..>  Encrypt PDF files
  cloudconvert pdf/decrypt <files..>  Decrypt PDF files
  cloudconvert pdf/split-pages        Split PDF files into one file per page
    <files..>
  cloudconvert pdf/extract-pages      Extract pages from PDF files
    <files..>
  cloudconvert pdf/rotate-pages       Rotate pages in PDF files
    <files..>
  cloudconvert command <files..>      Execute custom ffmpeg, imagemagick, or
                                      graphicsmagick commands
  cloudconvert credits                Print the remaining conversion credits of
                                      your account
  cloudconvert parameters <operation> List available task parameters for an
                                      operation

Options:
  --version        Show version number                                 [boolean]
  --api-key        Set the API key. You can get your API key here:
                   https://cloudconvert.com/dashboard/api/v2/keys
         [string] [required] [default: CLOUDCONVERT_API_KEY environment variable]
  --sandbox        Use the CloudConvert Sandbox API   [boolean] [default: false]
  --output-dir     Set the directory for storing the output files. defaults to
                   the working directory                                [string]
  --overwrite      Allow overwriting existing files    [boolean] [default: false]
  --parameter, -p  Send custom parameters with the task payload. Prefer dynamic
                   options such as --engine=office. The dot notation, for
                   example -p.engine=office, is kept for compatibility.
                   Parameters with the CloudConvert type Input can be set to
                   local file paths, for example: --image=./watermark.png
  --help           Show help                                           [boolean]


```

    
## Resources


* [API Documentation](https://cloudconvert.com/docs)
* [CloudConvert Blog](https://cloudconvert.com/blog)

## Development

```
npm ci
npm run typecheck
npm test
npm run build
```
